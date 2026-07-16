import { mainMenu } from "../keyboards.js";
import { upsertBotUser, getBotUser, hasActiveAccess } from "../supabase.js";
import { render } from "../utils/render.js";

export const WELCOME = `Добро пожаловать в *LumeVisuals*! ✨

Плавные визуалы, честные метки и клиент, который реально ощущается быстрее — без банов и лишних настроек. Забери бесплатную подписку за пару простых заданий или сразу возьми ключ и играй уже сегодня.`;

export function registerStart(bot) {
  bot.start(async (ctx) => {
    await upsertBotUser(ctx);
    await ctx.replyWithMarkdown(WELCOME, mainMenu);
  });

  bot.action("main_menu", async (ctx) => {
    await ctx.answerCbQuery();
    await render(ctx, WELCOME, mainMenu);
  });

  bot.command("status", async (ctx) => {
    const user = await getBotUser(ctx.from.id);

    if (!user || !hasActiveAccess(user)) {
      await ctx.reply("У тебя пока нет активной подписки. Загляни в «Бесплатная подписка» или «Купить ключ».", mainMenu);
      return;
    }

    const lines = [`🔑 Твой ключ: \`${user.license_key}\``];
    if (user.paid_sub_lifetime) {
      lines.push("Платная подписка: навсегда ✅");
    } else if (user.paid_sub_expires_at && new Date(user.paid_sub_expires_at) > new Date()) {
      lines.push(`Платная подписка активна до: ${new Date(user.paid_sub_expires_at).toLocaleDateString("ru-RU")}`);
    }
    if (user.free_sub_expires_at && new Date(user.free_sub_expires_at) > new Date()) {
      lines.push(`Бесплатная подписка активна до: ${new Date(user.free_sub_expires_at).toLocaleDateString("ru-RU")}`);
    }

    await ctx.replyWithMarkdown(lines.join("\n"), mainMenu);
  });
}
