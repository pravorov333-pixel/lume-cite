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

  channel1: process.env.CHANNEL_1 || "@LumeVisuals",
  channel2: process.env.CHANNEL_2 || "@OneCrypto",

  telegramChannelUrl: process.env.TELEGRAM_CHANNEL_URL || "https://telegram.me/+iTX6597n68UyYTJi",
  tiktokUrl: process.env.TIKTOK_URL || "https://tiktok.com/@lume_client",
  supportUsername: process.env.SUPPORT_USERNAME || "@cevtu",

  tonWallet: process.env.TON_WALLET || "UQA694x1Qb0K5oJwG-xEKcEdh4utQIR9945o3T0TUZBAAuHR",
  usdtErc20Wallet: process.env.USDT_ERC20_WALLET || "0x45266e7d59969a8df9c54cd1f85078c6b2469e41",
  usdcErc20Wallet: process.env.USDC_ERC20_WALLET || "0x45266e7d59969a8df9c54cd1f85078c6b2469e41",

  freeTaskDays: {
    comments: Number(process.env.FREE_TASK_COMMENTS_DAYS || 14),
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
