# Lume Visuals (site + bot) — Session Handoff

> Paste-this-to-continue. In a new session say **"продолжаем Lume Visuals, читай HANDOFF.md"**.
> Last updated: 2026-07-17.

## What this is

Marketing/sales layer for **LumeClient** (the actual Minecraft client — separate repo
`pravorov333-pixel/lume-client-`). Two pieces, both in **this** repo
(`pravorov333-pixel/lume-cite`, branch `claude/lume-visuals-website-mkjw52`):

1. **Website** (`index.html`, `catalog.html`, `account.html`, etc.) — static HTML/CSS/JS,
   glass UI, dark/light theme, cursor particles, pricing, accounts/friends, a
   peer-to-peer marketplace for configs/particles.
2. **Telegram bot** (`bot/`) — Node.js + Telegraf. Free subscription (channel-gate +
   video task), paid keys (crypto/Stars), admin approval flow.

**User profile:** not a developer, gets frustrated fast with CLI/terminal steps —
explain every command literally, assume nothing. Communicate in Russian.

## Deployment status (important)

- **Website**: not deployed anywhere yet, no domain. Only ever run locally
  (`python3 -m http.server` / opening `index.html`).
- **Bot**: runs **locally only**, on the user's own Windows PC, via
  `cd bot && npm start` in a PowerShell window. **Not on a server** — it only
  responds while that window is open and the PC is on. Deploying it to a VPS /
  Railway / Render so it runs 24/7 is a known next step, not done yet.

## Where the secrets live (NOT in git, on purpose)

`bot/.env` is git-ignored. It only exists on the user's PC and was pasted into
this chat at various points. **A fresh session will NOT know these values** —
ask the user to re-paste them, or re-derive from their Supabase/BotFather
dashboards. Known values as of this handoff (ask the user to confirm/refresh):
- Telegram bot token — from @BotFather (was pasted in chat once; user was told
  to consider revoking/reissuing it since it was exposed in the transcript).
- `ADMIN_CHAT_ID` = the user's own numeric Telegram id (**1610594306**) — where
  proof screenshots / payment confirmations get sent for manual review.
- Supabase project `kgqzhpxiohduojbgcxzc` — URL
  `https://kgqzhpxiohduojbgcxzc.supabase.co`, using the **new-format** API keys
  (`sb_publishable_...` for the site/browser, `sb_secret_...` for the bot backend).
- `CHANNEL_1_ID` (LumeVisuals) = **-1004380648060**, `CHANNEL_2_ID` (OneCrypto)
  = **-1003795810908** — both private invite-link channels; the bot must be
  added as **admin** to each for `getChatMember` subscription checks to work.

## Environment constraint (applies to whoever is running the agent session)

This sandbox's outbound network proxy **blocks api.telegram.org and
*.supabase.co** (policy denial, confirmed via `$HTTPS_PROXY/__agentproxy/status`).
That means from *inside a Claude Code Remote session*:
- You cannot live-test the bot (no long-polling to Telegram possible).
- You cannot run SQL against Supabase directly (no DB connection either).
- Verification is limited to `node --check` (syntax) and reading code carefully.
- The user has to actually run/test everything on their own PC, and paste back
  console errors verbatim for diagnosis.
- Delivering files to the user: `bot/` has been zipped and sent via
  `SendUserFile` more than once (whole-folder re-sends after edits) before git
  was set up properly on their machine — prefer `git pull` now (see below),
  only fall back to a zip if git is somehow broken for them again.

## How the user updates their local bot now

They have a real local clone (set up this session): `git clone` of this repo
into `C:\Users\popko\Desktop\lume-cite`, checked out to
`claude/lume-visuals-website-mkjw52`. Update flow going forward:
```
git pull
cd bot
npm start
```
(Ctrl+C first if the bot is already running.) `bot/.env` survives `git pull`
untouched since it's git-ignored — no need to recreate it on every update,
only if its content needs to change.

## Website ↔ bot relationship

- Same Supabase project, but **separate, non-overlapping tables**: site uses
  `profiles`/`listings`/`orders`/`friend_requests` (`supabase/schema.sql`,
  accessed from the browser with the publishable key, RLS-protected); bot uses
  `bot_users`/`free_task_submissions`/`bot_orders` (`bot/src/db/schema.sql`,
  accessed only by the bot backend with the secret/service key, RLS enabled
  with zero policies so the public key can never touch it).
- Site's own marketplace payment (USDT) is **explicitly paused** — user said
  "забей покачто про оплату на сайте потом сделаем" (2026-07-17). Only
  `supabase/schema.sql`'s tables exist for it; not wired to any live wallet
  flow decision yet. Don't touch this area unless the user brings it back up.
- The bot's license-key system (`bot_users.license_key`, generated on grant)
  is **not yet connected to the actual LumeClient desktop app** — the client
  has no online key-check API yet (see `lume-client-`'s
  `LUME-HANDOFF.md` → "License/keys": still Stage 1 local-only check). Wiring
  the client to verify against Supabase is unbuilt, cross-repo work.

## Free subscription task rules (current, as tuned by the user)

Only a **video** path exists (the "15 TikTok comments" task was removed
entirely per user request). After the 2-channel subscription check:
- **Videos must be Minecraft content** — the channel/account must have a
  Minecraft audience. This note is shown above the format choice and inside
  the quick-video task text (`bot/src/handlers/freeSub.js`).
- **Any video** (PVP/engaging, about LumeVisuals) — **30 days**, needs
  **5000+ views**. (Was 14 days / 1000 views; user changed it 2026-07-17.)
- **Full review** — **90 days**. TikTok: 1000+ followers OR 10k+ views (if
  1000+ followers, then 5000+ views minimum too); can be split into parts but
  ≥2 minutes combined; link in bio + "ссылка в профиле" in the caption.
  YouTube: 100+ subs, 5+ minute review; link in comments + profile.
- Reward day counts are read from `config.freeTaskDays` (env-driven), not
  hardcoded in multiple places — keep it that way if tuning further, it was
  refactored specifically to avoid drift between the keyboard label / task
  text / actual granted days.
- Proof submission only offers 2 categories now: ⭐ Обзор / 🎬 Видео (no
  "Комментарии" option — removed along with the comments task).

## Paid key tiers (bot, matches the site's pricing)

30 days $2.49 / 90 days $3.99 / lifetime $9.99. Payment methods: TON, USDT
(ERC20), USDC (ERC20), Telegram Stars (native, auto-confirmed), NFT / "pay
another way" (both just hand off to @cevtu manually). Crypto (TON/USDT/USDC)
is confirmed **manually** by the admin (tx hash review) — deliberate choice
to avoid needing blockchain-explorer API keys for an MVP.

## Known TODOs / open threads

- Site's own crypto marketplace payment wiring — paused, revisit when asked.
- Deploying the bot to always-on hosting (VPS/Railway/Render) — not started.
- Connecting the bot's `license_key` to an actual client-side verification
  API in `lume-client-` — not started, cross-repo.
- User hasn't yet confirmed the bot survived a real end-to-end test (channel
  check + a real free-task approval + a real key purchase) — last confirmed
  working state was just "бот работает" after fixing the `.env` BOM/extension
  issue (Notepad saving `.env.txt` with a UTF-8 BOM broke `BOT_TOKEN` parsing;
  fixed via a PowerShell `Out-File -Encoding ascii` heredoc instead).
