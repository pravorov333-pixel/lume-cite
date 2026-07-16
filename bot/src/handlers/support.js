import { Markup } from "telegraf";
import { config } from "../config.js";
import { backToMenu } from "../keyboards.js";
import { render } from "../utils/render.js";

export function registerSupport(bot) {
  bot.action("support", async (ctx) => {
    await ctx.answerCbQuery();
    await render(
      ctx,
      `🛟 *Поддержка*\n\nПо всем вопросам пиши напрямую: ${config.supportUsername}`,
      Markup.inlineKeyboard([
        [Markup.button.url("Написать в поддержку", `https://t.me/${config.supportUsername.replace("@", "")}`)],
        ...backToMenu.reply_markup.inline_keyboard,
      ])
    );
  });

  bot.action("social", async (ctx) => {
    await ctx.answerCbQuery();
    await render(
      ctx,
      "🌐 *Наши соцсети*\n\nПодписывайся, чтобы не пропустить новости и обновления клиента.",
      Markup.inlineKeyboard([
        [Markup.button.url("Telegram", config.telegramChannelUrl)],
        [Markup.button.url("TikTok", config.tiktokUrl)],
        ...backToMenu.reply_markup.inline_keyboard,
      ])
    );
  });
}
