/* ============================================================
   LUME VISUALS — admin: moderate listings & confirm orders
   ============================================================ */

(() => {
  "use strict";

  const root = document.getElementById("admin-section");
  if (!root) return;

  const { client, isConfigured } = window.lumeSupabase;

  const escapeHtml = (str) =>
    str.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  async function init() {
    if (!isConfigured) {
      root.hidden = false;
      root.innerHTML = `<div class="empty-state glass"><p class="empty-state__text">Бэкенд не подключён — заполни js/supabase-config.js (см. README).</p></div>`;
      return;
    }

    const session = await window.lumeRequireAuth();
    if (!session) return;

    const { data: profile } = await client
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single();

    if (!profile?.is_admin) {
      root.innerHTML = `<div class="empty-state glass"><p class="empty-state__text">Доступ только для админов.</p></div>`;
      return;
    }

    root.hidden = false;
    await Promise.all([loadPendingListings(), loadSubmittedOrders()]);
  }

  async function loadPendingListings() {
    const box = document.getElementById("admin-listings");
    const { data } = await client
      .from("listings")
      .select("id, title, category, price_usdt, description, seller:profiles(username)")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (!data || data.length === 0) {
      box.innerHTML = `<p class="friends-empty">Нет объявлений на модерации.</p>`;
      return;
    }

    box.innerHTML = data
      .map(
        (l) => `
        <div class="friend-row glass">
          <span class="friend-row__name">
            ${escapeHtml(l.title)} — ${l.category === "particles" ? "Партиклы" : "Конфиги"},
            ${l.price_usdt} USDT, от ${escapeHtml(l.seller?.username ?? "?")}
          </span>
          <div class="friend-row__actions">
            <button class="btn btn--primary friend-row__btn" data-approve="${l.id}">Одобрить</button>
            <button class="btn btn--ghost glass friend-row__btn" data-reject="${l.id}">Отклонить</button>
          </div>
        </div>`
      )
      .join("");

    box.querySelectorAll("[data-approve]").forEach((btn) =>
      btn.addEventListener("click", () => moderateListing(btn.dataset.approve, "approved"))
    );
    box.querySelectorAll("[data-reject]").forEach((btn) =>
      btn.addEventListener("click", () => moderateListing(btn.dataset.reject, "rejected"))
    );
  }

  async function moderateListing(id, status) {
    await client.from("listings").update({ status }).eq("id", id);
    await loadPendingListings();
  }

  async function loadSubmittedOrders() {
    const box = document.getElementById("admin-orders");
    const { data } = await client
      .from("orders")
      .select("id, amount_usdt, tx_hash, listing:listings(title), buyer:profiles!orders_buyer_id_fkey(username)")
      .eq("status", "submitted")
      .order("created_at", { ascending: true });

    if (!data || data.length === 0) {
      box.innerHTML = `<p class="friends-empty">Нет заказов, ожидающих подтверждения.</p>`;
      return;
    }

    box.innerHTML = data
      .map(
        (o) => `
        <div class="friend-row glass">
          <span class="friend-row__name">
            ${escapeHtml(o.listing?.title ?? "—")} — ${o.amount_usdt} USDT от ${escapeHtml(o.buyer?.username ?? "?")}
            <br><code class="modal__wallet modal__wallet--inline">${escapeHtml(o.tx_hash ?? "")}</code>
          </span>
          <div class="friend-row__actions">
            <button class="btn btn--primary friend-row__btn" data-confirm="${o.id}">Подтвердить</button>
            <button class="btn btn--ghost glass friend-row__btn" data-reject-order="${o.id}">Отклонить</button>
          </div>
        </div>`
      )
      .join("");

    box.querySelectorAll("[data-confirm]").forEach((btn) =>
      btn.addEventListener("click", () => moderateOrder(btn.dataset.confirm, "confirmed"))
    );
    box.querySelectorAll("[data-reject-order]").forEach((btn) =>
      btn.addEventListener("click", () => moderateOrder(btn.dataset.rejectOrder, "rejected"))
    );
  }

  async function moderateOrder(id, status) {
    const payload = { status };
    if (status === "confirmed") payload.confirmed_at = new Date().toISOString();
    await client.from("orders").update(payload).eq("id", id);
    await loadSubmittedOrders();
  }

  init();
})();
