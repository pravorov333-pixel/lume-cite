/* ============================================================
   LUME VISUALS — auth: register / login / logout / nav state
   ============================================================ */

(() => {
  "use strict";

  const { isConfigured, client } = window.lumeSupabase;

  const escapeHtml = (str) =>
    str.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  /* ===== Nav auth slot ===== */
  async function renderNavAuth() {
    const slot = document.getElementById("nav-auth");
    if (!slot) return;

    if (!isConfigured) {
      slot.innerHTML = `<a href="login.html" class="btn btn--ghost glass nav-auth__btn">Войти</a>`;
      return;
    }

    const { data: { session } } = await client.auth.getSession();

    if (!session) {
      slot.innerHTML = `<a href="login.html" class="btn btn--ghost glass nav-auth__btn">Войти</a>`;
      return;
    }

    const { data: profile } = await client
      .from("profiles")
      .select("username")
      .eq("id", session.user.id)
      .single();

    const username = profile ? escapeHtml(profile.username) : "Профиль";

    slot.innerHTML = `
      <a href="account.html" class="nav-auth__user glass" title="Профиль">
        <span class="nav-auth__avatar">${username.charAt(0).toUpperCase()}</span>
        <span class="nav-auth__name">${username}</span>
      </a>
      <button id="nav-logout" class="icon-btn glass" title="Выйти" aria-label="Выйти">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
      </button>
    `;

    document.getElementById("nav-logout").addEventListener("click", async () => {
      await client.auth.signOut();
      window.location.href = "index.html";
    });
  }

  renderNavAuth();

  /* ===== Register form ===== */
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("auth-status");
      status.textContent = "";

      if (!isConfigured) {
        status.textContent = "Бэкенд не подключён. Заполни js/supabase-config.js (см. README).";
        return;
      }

      const username = document.getElementById("reg-username").value.trim();
      const email = document.getElementById("reg-email").value.trim();
      const password = document.getElementById("reg-password").value;

      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        status.textContent = "Никнейм: 3–20 символов, латиница/цифры/подчёркивание.";
        return;
      }
      if (password.length < 6) {
        status.textContent = "Пароль должен быть не короче 6 символов.";
        return;
      }

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Создаём аккаунт…";

      const { error } = await client.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });

      submitBtn.disabled = false;
      submitBtn.textContent = "Зарегистрироваться";

      if (error) {
        status.textContent = error.message.includes("already registered")
          ? "Этот email уже зарегистрирован."
          : error.message;
        return;
      }

      status.className = "auth-status auth-status--ok";
      status.textContent = "Готово! Проверь почту и подтверди email, затем войди.";
      registerForm.reset();
    });
  }

  /* ===== Login form ===== */
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = document.getElementById("auth-status");
      status.textContent = "";

      if (!isConfigured) {
        status.textContent = "Бэкенд не подключён. Заполни js/supabase-config.js (см. README).";
        return;
      }

      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Входим…";

      const { error } = await client.auth.signInWithPassword({ email, password });

      submitBtn.disabled = false;
      submitBtn.textContent = "Войти";

      if (error) {
        status.textContent = "Неверный email или пароль.";
        return;
      }

      window.location.href = "account.html";
    });
  }

  /* ===== Pages that require login ===== */
  window.lumeRequireAuth = async () => {
    if (!isConfigured) return null;
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      window.location.href = "login.html";
      return null;
    }
    return session;
  };
})();
