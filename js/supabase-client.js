/* ============================================================
   LUME VISUALS — Supabase client bootstrap
   ============================================================ */

window.lumeSupabase = (() => {
  const url = window.LUME_SUPABASE_URL;
  const key = window.LUME_SUPABASE_ANON_KEY;
  const isConfigured = url && key && !url.includes("YOUR-PROJECT") && !key.includes("YOUR-ANON");

  if (!isConfigured) {
    return { isConfigured: false, client: null };
  }

  const client = window.supabase.createClient(url, key);
  return { isConfigured: true, client };
})();

/* Shows a dismissible banner on pages that need a working backend
   until js/supabase-config.js has been filled in. */
function lumeRequireBackendNotice() {
  if (window.lumeSupabase.isConfigured) return;

  const banner = document.createElement("div");
  banner.className = "backend-notice glass";
  banner.innerHTML = `
    <strong>Бэкенд не подключён.</strong>
    Заполни <code>js/supabase-config.js</code> данными своего проекта Supabase
    (см. <code>README.md</code> → «Аккаунты, друзья и маркетплейс»), чтобы регистрация,
    друзья и маркетплейс заработали.
  `;
  document.body.prepend(banner);
}
