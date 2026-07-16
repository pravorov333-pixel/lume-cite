import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

export async function upsertBotUser(ctx) {
  const from = ctx.from;
  await supabase
    .from("bot_users")
    .upsert(
      { telegram_id: from.id, username: from.username || null, first_name: from.first_name || null },
      { onConflict: "telegram_id", ignoreDuplicates: false }
    );
}

export async function getBotUser(telegramId) {
  const { data } = await supabase.from("bot_users").select("*").eq("telegram_id", telegramId).single();
  return data;
}

function generateLicenseKey() {
  const chunk = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LUME-${chunk()}-${chunk()}-${chunk()}`;
}

/**
 * Extends a user's access. `kind` is 'free' or 'paid'.
 * For 'paid' with lifetime=true, expiry is cleared and paid_sub_lifetime is set.
 * Otherwise extends from `now` or the current expiry, whichever is later.
 */
export async function grantAccess(telegramId, { kind, days, lifetime = false }) {
  const user = await getBotUser(telegramId);
  const now = new Date();
  const expiresColumn = kind === "free" ? "free_sub_expires_at" : "paid_sub_expires_at";

  const patch = { license_key: user?.license_key || generateLicenseKey() };

  if (kind === "paid" && lifetime) {
    patch.paid_sub_lifetime = true;
    patch.paid_sub_expires_at = null;
  } else {
    const current = user?.[expiresColumn] ? new Date(user[expiresColumn]) : now;
    const base = current > now ? current : now;
    patch[expiresColumn] = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  await supabase.from("bot_users").update(patch).eq("telegram_id", telegramId);
  return patch;
}

export function hasActiveAccess(user) {
  if (!user) return false;
  if (user.paid_sub_lifetime) return true;
  const now = Date.now();
  const paidActive = user.paid_sub_expires_at && new Date(user.paid_sub_expires_at).getTime() > now;
  const freeActive = user.free_sub_expires_at && new Date(user.free_sub_expires_at).getTime() > now;
  return Boolean(paidActive || freeActive);
}
