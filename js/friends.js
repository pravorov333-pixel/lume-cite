/* ============================================================
   LUME VISUALS — friends: search, requests, friends list
   ============================================================ */

(() => {
  "use strict";

  const root = document.getElementById("friends-section");
  if (!root) return;

  const { client, isConfigured } = window.lumeSupabase;

  const escapeHtml = (str) =>
    str.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  let me = null;

  async function init() {
    if (!isConfigured) {
      const notice = `<p class="friends-empty">Бэкенд не подключён — заполни js/supabase-config.js (см. README).</p>`;
      ["incoming-requests", "outgoing-requests", "friends-list"].forEach((id) => {
        document.getElementById(id).innerHTML = notice;
      });
      return;
    }

    const session = await window.lumeRequireAuth();
    if (!session) return;
    me = session.user.id;

    document.getElementById("friend-search-form").addEventListener("submit", onSearch);
    await loadFriendData();
  }

  async function onSearch(e) {
    e.preventDefault();
    const input = document.getElementById("friend-search-input");
    const resultBox = document.getElementById("friend-search-result");
    const q = input.value.trim();
    resultBox.innerHTML = "";
    if (!q) return;

    const { data, error } = await client
      .from("profiles")
      .select("id, username")
      .ilike("username", `%${q}%`)
      .neq("id", me)
      .limit(5);

    if (error || !data || data.length === 0) {
      resultBox.innerHTML = `<p class="friends-empty">Никого не нашли по «${escapeHtml(q)}».</p>`;
      return;
    }

    resultBox.innerHTML = data
      .map(
        (u) => `
        <div class="friend-row glass" data-user-id="${u.id}">
          <span class="friend-row__name">${escapeHtml(u.username)}</span>
          <button class="btn btn--primary friend-row__btn" data-add="${u.id}">Добавить</button>
        </div>`
      )
      .join("");

    resultBox.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", () => sendRequest(btn.dataset.add, btn));
    });
  }

  async function sendRequest(receiverId, btn) {
    btn.disabled = true;
    btn.textContent = "Отправляем…";
    const { error } = await client
      .from("friend_requests")
      .insert({ sender_id: me, receiver_id: receiverId });

    if (error) {
      btn.textContent = error.code === "23505" ? "Уже отправлено" : "Ошибка";
      return;
    }
    btn.textContent = "Заявка отправлена";
    await loadFriendData();
  }

  async function loadFriendData() {
    const [{ data: incoming }, { data: outgoing }, { data: accepted }] = await Promise.all([
      client
        .from("friend_requests")
        .select("id, sender:profiles!friend_requests_sender_id_fkey(id, username)")
        .eq("receiver_id", me)
        .eq("status", "pending"),
      client
        .from("friend_requests")
        .select("id, receiver:profiles!friend_requests_receiver_id_fkey(id, username)")
        .eq("sender_id", me)
        .eq("status", "pending"),
      client
        .from("friend_requests")
        .select(
          "id, sender:profiles!friend_requests_sender_id_fkey(id, username), receiver:profiles!friend_requests_receiver_id_fkey(id, username)"
        )
        .eq("status", "accepted")
        .or(`sender_id.eq.${me},receiver_id.eq.${me}`),
    ]);

    renderIncoming(incoming || []);
    renderOutgoing(outgoing || []);
    renderFriends(accepted || []);
  }

  function renderIncoming(rows) {
    const box = document.getElementById("incoming-requests");
    if (rows.length === 0) {
      box.innerHTML = `<p class="friends-empty">Новых заявок нет.</p>`;
      return;
    }
    box.innerHTML = rows
      .map(
        (r) => `
        <div class="friend-row glass">
          <span class="friend-row__name">${escapeHtml(r.sender.username)}</span>
          <div class="friend-row__actions">
            <button class="btn btn--primary friend-row__btn" data-accept="${r.id}">Принять</button>
            <button class="btn btn--ghost glass friend-row__btn" data-decline="${r.id}">Отклонить</button>
          </div>
        </div>`
      )
      .join("");

    box.querySelectorAll("[data-accept]").forEach((btn) =>
      btn.addEventListener("click", () => respond(btn.dataset.accept, "accepted"))
    );
    box.querySelectorAll("[data-decline]").forEach((btn) =>
      btn.addEventListener("click", () => respond(btn.dataset.decline, "declined"))
    );
  }

  function renderOutgoing(rows) {
    const box = document.getElementById("outgoing-requests");
    if (rows.length === 0) {
      box.innerHTML = `<p class="friends-empty">Исходящих заявок нет.</p>`;
      return;
    }
    box.innerHTML = rows
      .map(
        (r) => `
        <div class="friend-row glass">
          <span class="friend-row__name">${escapeHtml(r.receiver.username)}</span>
          <button class="btn btn--ghost glass friend-row__btn" data-cancel="${r.id}">Отменить</button>
        </div>`
      )
      .join("");

    box.querySelectorAll("[data-cancel]").forEach((btn) =>
      btn.addEventListener("click", () => cancelRequest(btn.dataset.cancel))
    );
  }

  function renderFriends(rows) {
    const box = document.getElementById("friends-list");
    if (rows.length === 0) {
      box.innerHTML = `<p class="friends-empty">Пока нет друзей — найди кого-нибудь через поиск выше.</p>`;
      return;
    }
    box.innerHTML = rows
      .map((r) => {
        const friend = r.sender.id === me ? r.receiver : r.sender;
        return `
        <div class="friend-row glass">
          <span class="friend-row__name">${escapeHtml(friend.username)}</span>
          <span class="friend-row__tag">В друзьях</span>
        </div>`;
      })
      .join("");
  }

  async function respond(requestId, status) {
    await client.from("friend_requests").update({ status }).eq("id", requestId);
    await loadFriendData();
  }

  async function cancelRequest(requestId) {
    await client.from("friend_requests").delete().eq("id", requestId);
    await loadFriendData();
  }

  init();
})();
