import { Markup } from "telegraf";
import { config } from "./config.js";

export const mainMenu = Markup.inlineKeyboard([
  [Markup.button.callback("🎁 Бесплатная подписка", "free_sub")],
  [Markup.button.callback("🔑 Купить ключ", "buy_key")],
  [Markup.button.callback("✅ Я выполнил задания", "submit_proof")],
  [
    Markup.button.callback("🛟 Поддержка", "support"),
    Markup.button.callback("🌐 Наши соцсети", "social"),
  ],
]);

export const backToMenu = Markup.inlineKeyboard([
  [Markup.button.callback("⬅️ Главное меню", "main_menu")],
]);

export function channelsKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.url(`📢 ${config.channel1.name}`, config.channel1.url)],
    [Markup.button.url(`📢 ${config.channel2.name}`, config.channel2.url)],
    [Markup.button.callback("✅ Я подписался, проверить", "check_subs")],
    [Markup.button.callback("⬅️ Главное меню", "main_menu")],
  ]);
}

export const videoChoiceKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("⚡ Любое видео — 14 дней", "task_video_quick")],
  [Markup.button.callback("⭐ Полный обзор — 90 дней", "task_video_review")],
  [Markup.button.callback("⬅️ Главное меню", "main_menu")],
]);

export const proofCategoryKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("⭐ Обзор", "proof_review")],
  [Markup.button.callback("🎬 Видео", "proof_video")],
  [Markup.button.callback("⬅️ Главное меню", "main_menu")],
]);

export const durationKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback(`30 дней — $${config.keyPrices["30d"]}`, "dur_30d")],
  [Markup.button.callback(`90 дней — $${config.keyPrices["90d"]}`, "dur_90d")],
  [Markup.button.callback(`Навсегда — $${config.keyPrices.lifetime}`, "dur_lifetime")],
  [Markup.button.callback("⬅️ Главное меню", "main_menu")],
]);

export function paymentMethodKeyboard(duration) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("💎 TON", `pay_ton_${duration}`)],
    [Markup.button.callback("💵 USDT (ERC20)", `pay_usdt_erc20_${duration}`)],
    [Markup.button.callback("💵 USDC (ERC20)", `pay_usdc_erc20_${duration}`)],
    [Markup.button.callback("⭐ Telegram Stars", `pay_stars_${duration}`)],
    [Markup.button.callback("🖼 NFT", `pay_nft_${duration}`)],
    [Markup.button.callback("🔁 Оплатить другим способом", `pay_manual_${duration}`)],
    [Markup.button.callback("⬅️ Назад", "buy_key")],
  ]);
}

export function adminReviewKeyboard(kind, id) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("✅ Одобрить", `admin_approve_${kind}_${id}`),
      Markup.button.callback("❌ Отклонить", `admin_reject_${kind}_${id}`),
    ],
  ]);
}
