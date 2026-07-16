import { config } from "../config.js";

const FALLBACK_TON_USD = 5.5; // used only if the live lookup fails
let cachedTonRate = null;
let cachedAt = 0;

/** Approximate TON amount for a USD price, using a live rate (cached 5 min) with a fallback. */
export async function usdToTon(usdAmount) {
  const rate = await getTonUsdRate();
  return Math.ceil((usdAmount / rate) * 100) / 100;
}

async function getTonUsdRate() {
  if (cachedTonRate && Date.now() - cachedAt < 5 * 60 * 1000) return cachedTonRate;

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd"
    );
    const json = await res.json();
    const rate = json?.["the-open-network"]?.usd;
    if (rate) {
      cachedTonRate = rate;
      cachedAt = Date.now();
      return rate;
    }
  } catch {
    // network unavailable — fall through to the fallback rate below
  }
  return FALLBACK_TON_USD;
}

export function usdToStars(usdAmount) {
  return Math.ceil(usdAmount * config.starsPerUsd);
}
