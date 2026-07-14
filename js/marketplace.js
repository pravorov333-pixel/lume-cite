/* ============================================================
   LUME VISUALS — marketplace: browse, buy, sell listings
   ============================================================ */

(() => {
  "use strict";

  const { client } = window.lumeSupabase;

  const escapeHtml = (str) =>
    str.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  const categoryLabel = { particles: "Партиклы", configs: "Конфиги" };

  /* ===== Browse (catalog.html) ===== */
  async function loadCategoryGrid(category) {
    const grid = document.getElementById(`market-grid-${category}`);
    if (!grid) return;

    grid.innerHTML = `<p class="friends-empty">Загружаем…</p>`;

    const { data, error } = await client
      .from("listings")
      .select("id, title, description, price_usdt, preview_path, seller:profiles(username)")
      .eq("category", category)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      grid.innerHTML = `<p class="friends-empty">Пока никто не выставил ${categoryLabel[category].toLowerCase()} на продажу. Будь первым — <a href="sell.html">выставить свой</a>.</p>`;
      return;
    }

    grid.innerHTML = data
      .map((item) => {
        const preview = item.preview_path
          ? client.storage.from("listing-previews").getPublicUrl(item.preview_path).data.publicUrl
          : null;
        return `
        <article class="listing-card glass">
          <div class="listing-card__preview" ${preview ? `style="background-image:url('${preview}')"` : ""}></div>
          <div class="listing-card__body">
            <h3 class="listing-card__title">${escapeHtml(item.title)}</h3>
            <p class="listing-card__seller">от ${escapeHtml(item.seller?.username ?? "неизвестно")}</p>
            <p class="listing-card__desc">${escapeHtml(item.description || "")}</p>
            <div class="listing-card__footer">
              <span class="listing-card__price">${item.price_usdt} USDT</span>
              <button class="btn btn--primary" data-buy="${item.id}">Купить</button>
            </div>
          </div>
        </article>`;
      })
      .join("");

    grid.querySelectorAll("[data-buy]").forEach((btn) =>
      btn.addEventListener("click", () => startPurchase(btn.dataset.buy))
    );
  }

  async function startPurchase(listingId) {
    const session = await window.lumeRequireAuth();
    if (!session) return;

    const { data: listing, error } = await client
      .from("listings")
      .select("id, price_usdt, seller_id")
      .eq("id", listingId)
      .single();

    if (error || !listing) return;

    const wallet = window.LUME_USDT_WALLET;
    const { data: order, error: orderError } = await client
      .from("orders")
      .insert({
        listing_id: listing.id,
        buyer_id: session.user.id,
        seller_id: listing.seller_id,
        amount_usdt: listing.price_usdt,
        payment_wallet: wallet,
      })
      .select()
      .single();

    if (orderError) {
      alert("Не удалось создать заказ: " + orderError.message);
      return;
    }

    openPaymentModal(order);
  }

  function openPaymentModal(order) {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal glass">
        <button class="modal__close" aria-label="Закрыть">&times;</button>
        <h3 class="modal__title">Оплата заказа</h3>
        <p class="modal__text">Отправь <strong>${order.amount_usdt} USDT (TRC20)</strong> на адрес:</p>
        <code class="modal__wallet">${escapeHtml(order.payment_wallet)}</code>
        <p class="modal__text">После оплаты вставь хэш транзакции (TXID) ниже — продавец/админ подтвердит оплату вручную, и файл станет доступен в разделе «Мои покупки».</p>
        <form id="tx-form" class="modal__form">
          <input type="text" id="tx-hash" placeholder="Хэш транзакции (TXID)" required>
          <button type="submit" class="btn btn--primary">Я оплатил</button>
        </form>
        <p id="tx-status" class="auth-status"></p>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector(".modal__close").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.querySelector("#tx-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const hash = document.getElementById("tx-hash").value.trim();
      const status = document.getElementById("tx-status");

      const { error } = await client
        .from("orders")
        .update({ tx_hash: hash, status: "submitted" })
        .eq("id", order.id);

      if (error) {
        status.textContent = "Ошибка: " + error.message;
        return;
      }
      status.className = "auth-status auth-status--ok";
      status.textContent = "Отправлено! Ждём подтверждения оплаты.";
      modal.querySelector("#tx-form button").disabled = true;
    });
  }

  /* ===== Sell form (sell.html) ===== */
  const sellForm = document.getElementById("sell-form");
  if (sellForm) {
    (async () => {
      const session = await window.lumeRequireAuth();
      if (!session) return;

      sellForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const status = document.getElementById("sell-status");
        status.textContent = "";

        const category = document.getElementById("sell-category").value;
        const title = document.getElementById("sell-title").value.trim();
        const description = document.getElementById("sell-description").value.trim();
        const price = parseFloat(document.getElementById("sell-price").value);
        const fileInput = document.getElementById("sell-file");
        const previewInput = document.getElementById("sell-preview");

        if (!fileInput.files[0]) {
          status.textContent = "Прикрепи файл с конфигом/партиклом.";
          return;
        }

        const submitBtn = sellForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = "Загружаем…";

        try {
          const filePath = `${session.user.id}/${Date.now()}-${fileInput.files[0].name}`;
          const { error: uploadError } = await client.storage
            .from("listing-files")
            .upload(filePath, fileInput.files[0]);
          if (uploadError) throw uploadError;

          let previewPath = null;
          if (previewInput.files[0]) {
            previewPath = `${session.user.id}/${Date.now()}-${previewInput.files[0].name}`;
            const { error: previewError } = await client.storage
              .from("listing-previews")
              .upload(previewPath, previewInput.files[0]);
            if (previewError) throw previewError;
          }

          const { error: insertError } = await client.from("listings").insert({
            seller_id: session.user.id,
            category,
            title,
            description,
            price_usdt: price,
            file_path: filePath,
            preview_path: previewPath,
          });
          if (insertError) throw insertError;

          status.className = "auth-status auth-status--ok";
          status.textContent = "Отправлено на модерацию! Появится в каталоге после одобрения.";
          sellForm.reset();
        } catch (err) {
          status.textContent = "Ошибка: " + err.message;
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = "Выставить на продажу";
        }
      });
    })();
  }

  /* ===== "My listings" / "My purchases" (account.html) ===== */
  async function loadMyListings(userId) {
    const box = document.getElementById("my-listings");
    if (!box) return;

    const { data } = await client
      .from("listings")
      .select("id, title, category, price_usdt, status")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });

    const statusLabel = { pending: "На модерации", approved: "Одобрено", rejected: "Отклонено" };

    if (!data || data.length === 0) {
      box.innerHTML = `<p class="friends-empty">Ты пока ничего не выставил. <a href="sell.html">Выставить конфиг/партикл</a>.</p>`;
      return;
    }

    box.innerHTML = data
      .map(
        (l) => `
        <div class="friend-row glass">
          <span class="friend-row__name">${escapeHtml(l.title)} <span class="listing-card__price">(${l.price_usdt} USDT)</span></span>
          <span class="friend-row__tag friend-row__tag--${l.status}">${statusLabel[l.status]}</span>
        </div>`
      )
      .join("");
  }

  async function loadMyPurchases(userId) {
    const box = document.getElementById("my-purchases");
    if (!box) return;

    const { data } = await client
      .from("orders")
      .select("id, amount_usdt, status, listing:listings(title, file_path)")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false });

    const statusLabel = {
      awaiting_payment: "Ждём оплату",
      submitted: "На проверке",
      confirmed: "Оплачено",
      rejected: "Отклонено",
    };

    if (!data || data.length === 0) {
      box.innerHTML = `<p class="friends-empty">Покупок пока нет.</p>`;
      return;
    }

    const rows = await Promise.all(
      data.map(async (o) => {
        const canDownload = o.status === "confirmed" && o.listing;
        let downloadUrl = null;
        if (canDownload) {
          const { data: signed } = await client.storage
            .from("listing-files")
            .createSignedUrl(o.listing.file_path, 300);
          downloadUrl = signed?.signedUrl ?? null;
        }
        return `
        <div class="friend-row glass">
          <span class="friend-row__name">${escapeHtml(o.listing?.title ?? "—")} <span class="listing-card__price">(${o.amount_usdt} USDT)</span></span>
          ${
            downloadUrl
              ? `<a class="btn btn--primary friend-row__btn" href="${downloadUrl}" target="_blank" rel="noopener">Скачать</a>`
              : `<span class="friend-row__tag">${statusLabel[o.status]}</span>`
          }
        </div>`;
      })
    );

    box.innerHTML = rows.join("");
  }

  window.lumeMarketplace = { loadCategoryGrid, loadMyListings, loadMyPurchases };
})();
