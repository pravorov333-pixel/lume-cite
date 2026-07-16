import "dotenv/config";

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name} (see .env.example)`);
  }
  return value;
}

export const config = {
  botToken: required("BOT_TOKEN"),
  adminChatId: Number(required("ADMIN_CHAT_ID")),

  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),

  // Both required channels are private (invite-link only, no @username),
  // so getChatMember() needs the numeric chat id, not the link. The link
  // is only used for the "join" button. See .env.example for how to get
  // the numeric id (CHANNEL_1_ID / CHANNEL_2_ID).
  channel1: {
    id: process.env.CHANNEL_1_ID || null,
    url: process.env.CHANNEL_1_URL || "https://t.me/+iTX6597n68UyYTJi",
    name: process.env.CHANNEL_1_NAME || "LumeVisuals",
  },
  channel2: {
    id: process.env.CHANNEL_2_ID || null,
    url: process.env.CHANNEL_2_URL || "https://t.me/+oH_SdoyHrWk1NDli",
    name: process.env.CHANNEL_2_NAME || "OneCrypto",
  },

  telegramChannelUrl: process.env.TELEGRAM_CHANNEL_URL || "https://telegram.me/+iTX6597n68UyYTJi",
  tiktokUrl: process.env.TIKTOK_URL || "https://tiktok.com/@lume_client",
  supportUsername: process.env.SUPPORT_USERNAME || "@cevtu",

  tonWallet: process.env.TON_WALLET || "UQA694x1Qb0K5oJwG-xEKcEdh4utQIR9945o3T0TUZBAAuHR",
  usdtErc20Wallet: process.env.USDT_ERC20_WALLET || "0x45266e7d59969a8df9c54cd1f85078c6b2469e41",
  usdcErc20Wallet: process.env.USDC_ERC20_WALLET || "0x45266e7d59969a8df9c54cd1f85078c6b2469e41",

  freeTaskDays: {
    quickVideo: Number(process.env.FREE_TASK_QUICK_VIDEO_DAYS || 14),
    reviewVideo: Number(process.env.FREE_TASK_REVIEW_VIDEO_DAYS || 90),
  },

  starsPerUsd: Number(process.env.STARS_PER_USD || 75),

  keyPrices: {
    "30d": 2.49,
    "90d": 3.99,
    lifetime: 9.99,
  },

  keyLabels: {
    "30d": "30 дней",
    "90d": "90 дней",
    lifetime: "Навсегда",
  },
};

if (!config.channel1.id || !config.channel2.id) {
  console.warn(
    "⚠️  CHANNEL_1_ID / CHANNEL_2_ID не заданы — проверка подписки на приватные каналы всегда будет " +
      "возвращать «не подписан». См. .env.example, раздел про CHANNEL_*_ID."
  );
}
