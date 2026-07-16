import { Scenes, Markup } from "telegraf";
import { config } from "../config.js";
import { durationKeyboard, paymentMethodKeyboard, mainMenu, adminReviewKeyboard, backToMenu } from "../keyboards.js";
import { render } from "../utils/render.js";
import { usdToTon, usdToStars } from "../utils/rates.js";
import { supabase, grantAccess } from "../supabase.js";

export const collectTxHashScene = new Scenes.BaseScene("collect_tx_hash");

collectTxHashScene.enter(async (ctx) => {
  const { instructions } = ctx.scene.state;
  await ctx.reply(instructions, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([[Markup.button.callback("✖️ Отмена", "tx_cancel")]]),
  });
});

collectTxHashScene.action("tx_cancel", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.leave();
  await ctx.reply("Отменено.", mainMenu);
});

collectTxHashScene.on("text", async (ctx) => {
  const { orderId } = ctx.scene.state;
  const txHash = ctx.message.text.trim();

  const { data: order } = await supabase
    .from("bot_orders")
    .update({ tx_hash: txHash, status: "submitted" })
    .eq("id", orderId)
    .select("*, bot_users(username)")
    .single();

  await ctx.telegram.sendMessage(
    config.adminChatId,
    `💳 Новый платёж на проверку\n\n` +
      `От: @${ctx.from.username || "—"} (id ${ctx.from.id})\n` +
      `Тариф: ${config.keyLabels[order.duration]} — $${order.price_usd}\n` +
      `Способ: ${order.payment_method}\n` +
      `Сумма: ${order.amount_crypto ?? "-"} ${order.amount_unit ?? ""}\n` +
      `TXID: \`${txHash}\`\n` +
      `Заказ: ${order.id}`,
    { parse_mode: "Markdown", ...adminReviewKeyboard("order", order.id) }
  );

  await ctx.scene.leave();
  await ctx.reply("Спасибо! Как только подтвердим оплату в блокчейне — пришлём ключ. ✅", mainMenu);
});

async function createOrder(telegramId, duration, method, amountCrypto, amountUnit) {
  const { data } = await supabase
    .from("bot_orders")
    .insert({
      telegram_id: telegramId,
      duration,
      price_usd: config.keyPrices[duration],
      payment_method: method,
      amount_crypto: amountCrypto,
      amount_unit: amountUnit,
    })
    .select()
    .single();
  return data;
}

export function registerBuyKey(bot) {
  bot.action("buy_key", async (ctx) => {
    await ctx.answerCbQuery();
    await render(ctx, "🔑 Выбери срок ключа:", durationKeyboard);
  });

  bot.action(/^dur_(30d|90d|lifetime)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const duration = ctx.match[1];
    await render(
      ctx,
      `Тариф: *${config.keyLabels[duration]}* — $${config.keyPrices[duration]}\n\nВыбери способ оплаты:`,
      paymentMethodKeyboard(duration)
    );
  });

  bot.action(/^pay_ton_(30d|90d|lifetime)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const duration = ctx.match[1];
    const usd = config.keyPrices[duration];
    const tonAmount = await usdToTon(usd);
    const order = await createOrder(ctx.from.id, duration, "ton", tonAmount, "TON");

    await ctx.scene.enter("collect_tx_hash", {
      orderId: order.id,
      instructions:
        `💎 *Оплата TON*\n\n` +
        `Отправь примерно *${tonAmount} TON* (по текущему курсу за $${usd}) на адрес:\n` +
        `\`${config.tonWallet}\`\n\n` +
        `После оплаты пришли сюда хэш транзакции (TXID).`,
    });
  });

  bot.action(/^pay_usdt_erc20_(30d|90d|lifetime)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const duration = ctx.match[1];
    const usd = config.keyPrices[duration];
    const order = await createOrder(ctx.from.id, duration, "usdt_erc20", usd, "USDT");

    await ctx.scene.enter("collect_tx_hash", {
      orderId: order.id,
      instructions:
        `💵 *Оплата USDT (ERC20)*\n\n` +
        `Отправь *${usd} USDT* (сеть Ethereum/ERC20) на адрес:\n` +
        `\`${config.usdtErc20Wallet}\`\n\n` +
        `После оплаты пришли сюда хэш транзакции (TXID).`,
    });
  });

  bot.action(/^pay_usdc_erc20_(30d|90d|lifetime)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const duration = ctx.match[1];
    const usd = config.keyPrices[duration];
    const order = await createOrder(ctx.from.id, duration, "usdc_erc20", usd, "USDC");

    await ctx.scene.enter("collect_tx_hash", {
      orderId: order.id,
      instructions:
        `💵 *Оплата USDC (ERC20)*\n\n` +
        `Отправь *${usd} USDC* (сеть Ethereum/ERC20) на адрес:\n` +
        `\`${config.usdcErc20Wallet}\`\n\n` +
        `После оплаты пришли сюда хэш транзакции (TXID).`,
    });
  });

  bot.action(/^pay_stars_(30d|90d|lifetime)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const duration = ctx.match[1];
    const usd = config.keyPrices[duration];
    const stars = usdToStars(usd);
    const order = await createOrder(ctx.from.id, duration, "stars", stars, "XTR");

    await ctx.replyWithInvoice({
      title: `LumeVisuals — ключ ${config.keyLabels[duration]}`,
      description: `Подписка LumeVisuals: ${config.keyLabels[duration]}`,
      payload: `order_${order.id}`,
      provider_token: "", // not used for Telegram Stars
      currency: "XTR",
      prices: [{ label: config.keyLabels[duration], amount: stars }],
    });
  });

  bot.action(/^pay_(nft|manual)_(30d|90d|lifetime)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const duration = ctx.match[2];
    await createOrder(ctx.from.id, duration, "manual", null, null);
    await render(
      ctx,
      `Для оплаты этим способом свяжись с нашим менеджером: ${config.supportUsername}\n\n` +
        `Напиши ему свой Telegram (${ctx.from.username ? "@" + ctx.from.username : "id " + ctx.from.id}) и тариф «${config.keyLabels[duration]}» — он поможет оформить оплату.`,
      backToMenu
    );
  });

  // Telegram Stars: approve every pre-checkout, then grant access on success.
  bot.on("pre_checkout_query", (ctx) => ctx.answerPreCheckoutQuery(true));

  bot.on("successful_payment", async (ctx) => {
    const payment = ctx.message.successful_payment;
    const orderId = payment.invoice_payload.replace("order_", "");

    const { data: order } = await supabase
      .from("bot_orders")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString(), telegram_charge_id: payment.telegram_payment_charge_id })
      .eq("id", orderId)
      .select()
      .single();

    if (!order) return;

    const patch = await grantAccess(ctx.from.id, {
      kind: "paid",
      lifetime: order.duration === "lifetime",
      days: order.duration === "30d" ? 30 : order.duration === "90d" ? 90 : undefined,
    });

    await ctx.reply(
      `Оплата через Stars прошла успешно! ✅\n\nТвой ключ: \`${patch.license_key}\`\n` +
        (order.duration === "lifetime" ? "Действует навсегда." : `Действует ${config.keyLabels[order.duration]}.`),
      { parse_mode: "Markdown", ...mainMenu }
    );

    await ctx.telegram.sendMessage(
      config.adminChatId,
      `⭐ Оплата Stars подтверждена автоматически\nОт: @${ctx.from.username || "—"} (id ${ctx.from.id})\nТариф: ${config.keyLabels[order.duration]}\nЗаказ: ${order.id}`
    );
  });
}
