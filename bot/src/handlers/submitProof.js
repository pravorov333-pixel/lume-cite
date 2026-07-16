import { Scenes, Markup } from "telegraf";
import { config } from "../config.js";
import { proofCategoryKeyboard, mainMenu, adminReviewKeyboard } from "../keyboards.js";
import { render } from "../utils/render.js";
import { supabase } from "../supabase.js";

const CATEGORY_LABEL = {
  review: "⭐ Обзор (90 дней)",
  video: "🎬 Видео (14 дней)",
};

const CATEGORY_DAYS = {
  review: config.freeTaskDays.reviewVideo,
  video: config.freeTaskDays.quickVideo,
};

export const collectProofScene = new Scenes.BaseScene("collect_proof");

collectProofScene.enter(async (ctx) => {
  ctx.scene.state.photos = [];
  await ctx.reply(
    `Пришли скриншоты-доказательства для «${CATEGORY_LABEL[ctx.scene.state.category]}» (можно несколько сообщений). Когда закончишь — нажми «Готово».`,
    Markup.inlineKeyboard([
      [Markup.button.callback("✅ Готово, отправить", "proof_done")],
      [Markup.button.callback("✖️ Отмена", "proof_cancel")],
    ])
  );
});

collectProofScene.on("photo", async (ctx) => {
  const photos = ctx.message.photo;
  const fileId = photos[photos.length - 1].file_id;
  ctx.scene.state.photos.push(fileId);
  await ctx.reply(`Скрин добавлен (${ctx.scene.state.photos.length}). Пришли ещё или нажми «Готово».`);
});

collectProofScene.action("proof_cancel", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.leave();
  await ctx.reply("Отменено.", mainMenu);
});

collectProofScene.action("proof_done", async (ctx) => {
  await ctx.answerCbQuery();
  const { category, photos } = ctx.scene.state;

  if (!photos || photos.length === 0) {
    await ctx.reply("Пришли хотя бы один скриншот перед отправкой.");
    return;
  }

  const { data: submission, error } = await supabase
    .from("free_task_submissions")
    .insert({ telegram_id: ctx.from.id, category, photo_file_ids: photos })
    .select()
    .single();

  if (error) {
    await ctx.reply("Не получилось отправить, попробуй ещё раз чуть позже.");
    return;
  }

  const caption =
    `📥 Новая заявка на бесплатную подписку\n\n` +
    `Категория: ${CATEGORY_LABEL[category]}\n` +
    `От: @${ctx.from.username || "—"} (id ${ctx.from.id})\n` +
    `Заявка: ${submission.id}`;

  await ctx.telegram.sendMediaGroup(
    config.adminChatId,
    photos.map((fileId, i) => ({
      type: "photo",
      media: fileId,
      caption: i === 0 ? caption : undefined,
    }))
  );
  await ctx.telegram.sendMessage(
    config.adminChatId,
    "Решение по заявке выше:",
    adminReviewKeyboard("free", submission.id)
  );

  await ctx.scene.leave();
  await ctx.reply("Отправлено на проверку! Как только админ подтвердит — подписка включится автоматически. ✅", mainMenu);
});

export function registerSubmitProof(bot) {
  bot.action("submit_proof", async (ctx) => {
    await ctx.answerCbQuery();
    await render(ctx, "За что отправляешь доказательства?", proofCategoryKeyboard);
  });

  bot.action("proof_review", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter("collect_proof", { category: "review" });
  });
  bot.action("proof_video", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter("collect_proof", { category: "video" });
  });
}

export { CATEGORY_DAYS, CATEGORY_LABEL };
