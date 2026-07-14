/* ============================================================
   LUME VISUALS — theme, particles, animations
   ============================================================ */

(() => {
  "use strict";

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ===== Theme toggle ===== */
  const savedTheme = localStorage.getItem("lume-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    root.dataset.theme = savedTheme;
  }

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      localStorage.setItem("lume-theme", next);
    });
  }

  /* ===== Typed tagline (hero) ===== */
  const typedEl = document.getElementById("typed-text");
  if (typedEl) {
    const phrases = [
      "Твой стиль. Твоя игра.",
      "Побеждай красиво.",
      "Плавность. Скорость. Кастом.",
      "Клиент, который светится.",
    ];
    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;

    const tick = () => {
      const phrase = phrases[phraseIdx];

      if (!deleting) {
        charIdx++;
        typedEl.textContent = phrase.slice(0, charIdx);
        if (charIdx === phrase.length) {
          deleting = true;
          setTimeout(tick, 2200);
          return;
        }
        setTimeout(tick, 55 + Math.random() * 45);
      } else {
        charIdx--;
        typedEl.textContent = phrase.slice(0, charIdx);
        if (charIdx === 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          setTimeout(tick, 400);
          return;
        }
        setTimeout(tick, 28);
      }
    };

    if (reducedMotion) {
      typedEl.textContent = phrases[0];
    } else {
      setTimeout(tick, 600);
    }
  }

  /* ===== Reveal on scroll ===== */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reducedMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal--visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("reveal--visible"));
  }

  /* ===== Card cursor glow ===== */
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      card.style.setProperty("--my", `${e.clientY - rect.top}px`);
    });
  });

  /* ===== Catalog tabs ===== */
  const tabs = document.querySelectorAll(".catalog__tab");
  if (tabs.length) {
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => {
          t.classList.remove("catalog__tab--active");
          t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("catalog__tab--active");
        tab.setAttribute("aria-selected", "true");

        document.querySelectorAll(".catalog__panel").forEach((panel) => {
          panel.hidden = true;
          panel.classList.remove("catalog__panel--active");
        });
        const panel = document.getElementById(`panel-${tab.dataset.tab}`);
        if (panel) {
          panel.hidden = false;
          // restart the fade-in animation
          void panel.offsetWidth;
          panel.classList.add("catalog__panel--active");
        }
      });
    });
  }

  /* ===== Cursor particles ===== */
  const canvas = document.getElementById("particles");
  if (!canvas || reducedMotion) return;

  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  const mouse = { x: -9999, y: -9999, active: false };
  const AMBIENT_COUNT = 42;
  const ambient = [];
  const sparks = [];

  const themeColors = () => {
    const styles = getComputedStyle(root);
    return [
      styles.getPropertyValue("--particle").replace(/"/g, "").trim(),
      styles.getPropertyValue("--particle-2").replace(/"/g, "").trim(),
    ];
  };
  let colors = themeColors();

  new MutationObserver(() => {
    colors = themeColors();
  }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const rand = (min, max) => min + Math.random() * (max - min);

  for (let i = 0; i < AMBIENT_COUNT; i++) {
    ambient.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: rand(-0.15, 0.15),
      vy: rand(-0.12, 0.12),
      r: rand(0.8, 2.2),
      alpha: rand(0.15, 0.5),
      colorIdx: Math.random() < 0.7 ? 0 : 1,
      phase: Math.random() * Math.PI * 2,
    });
  }

  window.addEventListener("pointermove", (e) => {
    const prevX = mouse.x;
    const prevY = mouse.y;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;

    // Спавним небольшие искры вдоль движения курсора — сдержанно,
    // чтобы выглядело аккуратно, а не как фейерверк.
    if (prevX > -999 && sparks.length < 90) {
      const dist = Math.hypot(mouse.x - prevX, mouse.y - prevY);
      const count = Math.min(3, Math.floor(dist / 14) + (Math.random() < 0.35 ? 1 : 0));
      for (let i = 0; i < count; i++) {
        sparks.push({
          x: mouse.x + rand(-6, 6),
          y: mouse.y + rand(-6, 6),
          vx: rand(-0.5, 0.5),
          vy: rand(-0.6, 0.2),
          r: rand(0.7, 1.9),
          life: 1,
          decay: rand(0.012, 0.025),
          colorIdx: Math.random() < 0.6 ? 0 : 1,
        });
      }
    }
  });

  window.addEventListener("pointerleave", () => {
    mouse.active = false;
    mouse.x = -9999;
    mouse.y = -9999;
  });

  let t = 0;
  const frame = () => {
    t += 0.01;
    ctx.clearRect(0, 0, width, height);

    // Ambient particles: мягкий дрейф + лёгкое притяжение к курсору
    for (const p of ambient) {
      if (mouse.active) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 180 && dist > 1) {
          const force = ((180 - dist) / 180) * 0.02;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }

      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx + Math.sin(t + p.phase) * 0.08;
      p.y += p.vy + Math.cos(t * 0.8 + p.phase) * 0.06;

      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;

      const twinkle = 0.75 + 0.25 * Math.sin(t * 2 + p.phase);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${colors[p.colorIdx]}, ${p.alpha * twinkle})`;
      ctx.fill();
    }

    // Cursor sparks: затухающие искры за курсором
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.004;
      s.life -= s.decay;

      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${colors[s.colorIdx]}, ${0.65 * s.life})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(${colors[s.colorIdx]}, ${0.5 * s.life})`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
