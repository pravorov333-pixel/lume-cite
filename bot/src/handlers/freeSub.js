import { config } from "../config.js";
import {
  channelsKeyboard,
  taskChoiceKeyboard,
  videoChoiceKeyboard,
} from "../keyboards.js";
import { render } from "../utils/render.js";

const SUBSCRIBED_STATUSES = new Set(["creator", "administrator", "member"]);

async function isSubscribed(ctx, channel) {
  if (!channel.id) return false; // CHANNEL_*_ID not configured yet — see .env.example

  try {
    const member = await ctx.telegram.getChatMember(channel.id, ctx.from.id);
    return SUBSCRIBED_STATUSES.has(member.status);
  } catch {
    // bot not a member/admin of the channel, wrong id, user never interacted, etc.
    return false;
  }
}

const CHANNELS_TEXT = `🎁 *Бесплатная подписка*

Чтобы продолжить, подпишись на два канала:
📢 ${config.channel1.name}
📢 ${config.channel2.name}

Потом нажми «Я подписался, проверить».`;

const TASK_CHOICE_TEXT = `Отлично, подписка на каналы подтверждена ✅

Выбери, как получить бесплатную подписку:

💬 *Комментарии в TikTok* — быстро, подписка на ${config.freeTaskDays.comments} дней.
🎬 *Снять видео* — подписка до 90 дней в зависимости от формата.`;

const COMMENTS_TEXT = `💬 *Задание «Комментарии»*

1. Найди в TikTok 15 видео с визуалами других клиентов.
2. Под каждым оставь комментарий в духе «LumeVisuals лучше» — так, чтобы он набрал *минимум 1 лайк*.
3. Поставь нашу ссылку в шапку профиля Telegram — она должна оставаться там всё время действия подписки.

⚠️ Если уберёшь ссылку раньше срока — подписка может быть аннулирована.

Награда: *${config.freeTaskDays.comments} дней* подписки.

Когда всё сделаешь — вернись в главное меню и нажми «✅ Я выполнил задания», выбери «Комментарии» и пришли скриншоты.`;

const VIDEO_QUICK_TEXT = `⚡ *Любое видео — 14 дней*

Сними и опубликуй в TikTok или YouTube любое видео с PVP или цепляющим контентом, связанным с LumeVisuals. Видео должно набрать *минимум 1000 просмотров*.

Награда: *14 дней* подписки.

Когда наберёшь просмотры — вернись в главное меню, нажми «✅ Я выполнил задания», выбери «Видео» и пришли скриншоты (просмотры + само видео).`;

const VIDEO_REVIEW_TEXT = `⭐ *Полный обзор — 90 дней*

*TikTok:* аккаунт от 1000 подписчиков *или* видео набрало от 10 000 просмотров.
Если подписчиков от 1000 — минимум 5000 просмотров на видео. Ссылку на наш Telegram нужно уместить в шапке профиля, а в описании под видео написать «ссылка в профиле».

*YouTube:* канал от 100 подписчиков, обзор клиента минимум на 5 минут (в TikTok можно разбить на части, но суммарно не короче 2 минут). Ссылку укажи в комментариях и в профиле.

Награда: *90 дней* подписки.

Когда всё сделаешь — вернись в главное меню, нажми «✅ Я выполнил задания», выбери «Обзор» и пришли скриншоты (профиль, просмотры/подписчики, ссылка).`;

export function registerFreeSub(bot) {
  bot.action("free_sub", async (ctx) => {
    await ctx.answerCbQuery();
    await render(ctx, CHANNELS_TEXT, channelsKeyboard());
  });

  bot.action("check_subs", async (ctx) => {
    await ctx.answerCbQuery("Проверяю…");
    const [sub1, sub2] = await Promise.all([
      isSubscribed(ctx, config.channel1),
      isSubscribed(ctx, config.channel2),
    ]);

    if (sub1 && sub2) {
      await render(ctx, TASK_CHOICE_TEXT, taskChoiceKeyboard);
    } else {
      await render(
        ctx,
        `${CHANNELS_TEXT}\n\n❌ Пока вижу подписку не на все каналы. Проверь и попробуй снова.`,
        channelsKeyboard()
      );
    }
  });

  bot.action("task_comments", async (ctx) => {
    await ctx.answerCbQuery();
    await render(ctx, COMMENTS_TEXT, taskBackKeyboard());
  });

  bot.action("task_video", async (ctx) => {
    await ctx.answerCbQuery();
    await render(ctx, "🎬 Выбери формат видео:", videoChoiceKeyboard);
  });

  bot.action("task_video_back", async (ctx) => {
    await ctx.answerCbQuery();
    await render(ctx, TASK_CHOICE_TEXT, taskChoiceKeyboard);
  });

  bot.action("task_video_quick", async (ctx) => {
    await ctx.answerCbQuery();
    await render(ctx, VIDEO_QUICK_TEXT, taskBackKeyboard());
  });

  bot.action("task_video_review", async (ctx) => {
    await ctx.answerCbQuery();
    await render(ctx, VIDEO_REVIEW_TEXT, taskBackKeyboard());
  });
}

function taskBackKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "⬅️ К выбору задания", callback_data: "check_subs" }],
        [{ text: "⬅️ Главное меню", callback_data: "main_menu" }],
      ],
    },
  };
}
