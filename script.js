/* ============================================================
   Olaia Irigoyen — temporary portfolio
   Minimal vanilla JS: visitor location + local clock, scroll reveal, subtle hero tilt.
   All effects respect prefers-reduced-motion and touch devices.
   ============================================================ */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const isTouch =
    window.matchMedia("(hover: none)").matches || "ontouchstart" in window;

  /* ---------- Visitor location + local clock (top bar) ----------
     Location: free IP geolocation (falls back to timezone city).
     Time: the visitor's real local clock via the browser timezone. */
  const placeEl = document.querySelector("[data-loc-place]");
  const clockEl = document.querySelector("[data-clock]");

  function startClock() {
    if (!clockEl) return;
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const tick = () => {
      clockEl.textContent = fmt.format(new Date());
    };
    tick();
    setInterval(tick, 15000);
  }

  function placeFromTimezone(tz) {
    if (!tz) return "Local";
    const city = tz.split("/").pop().replace(/_/g, " ");
    return city;
  }

  async function detectLocation() {
    if (!placeEl) return;
    const tz =
      (Intl.DateTimeFormat().resolvedOptions() &&
        Intl.DateTimeFormat().resolvedOptions().timeZone) ||
      "";

    // Soft fallback while fetching
    placeEl.textContent = placeFromTimezone(tz);

    try {
      const res = await fetch("https://ipapi.co/json/", {
        signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
      });
      if (!res.ok) throw new Error("geo failed");
      const data = await res.json();
      const city = (data.city || "").trim();
      const country = (data.country_name || data.country || "").trim();
      if (city && country) {
        placeEl.textContent = city + " / " + country;
      } else if (city) {
        placeEl.textContent = city;
      } else if (country) {
        placeEl.textContent = country;
      }
    } catch (err) {
      // Keep timezone fallback — no console noise needed
      placeEl.textContent = placeFromTimezone(tz);
    }
  }

  startClock();
  detectLocation();

  /* ---------- Scroll reveal (fade + rise, staggered) ---------- */
  const revealEls = Array.from(document.querySelectorAll("[data-reveal]"));

  if (prefersReduced || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;

          // Stagger siblings that don't already declare a manual --d.
          if (!el.style.getPropertyValue("--d") && el.parentElement) {
            const sibs = Array.from(
              el.parentElement.querySelectorAll(":scope > [data-reveal]")
            );
            const i = sibs.indexOf(el);
            if (i > 0) el.style.transitionDelay = i * 70 + "ms";
          }

          el.classList.add("is-in");
          obs.unobserve(el);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px 0px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Subtle hero tilt (desktop, pointer only) ---------- */
  const tiltEl = document.querySelector("[data-tilt]");

  if (tiltEl && !prefersReduced && !isTouch) {
    const MAX = 5; // px of travel — intentionally restrained
    let raf = null;
    let tx = 0,
      ty = 0;

    function apply() {
      tiltEl.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(
        2
      )}px, 0)`;
      raf = null;
    }

    window.addEventListener(
      "mousemove",
      (e) => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        tx = ((e.clientX - cx) / cx) * MAX;
        ty = ((e.clientY - cy) / cy) * MAX;
        if (!raf) raf = requestAnimationFrame(apply);
      },
      { passive: true }
    );

    window.addEventListener("mouseleave", () => {
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    });
  }

  /* ---------- Soon asterisk note (hover + tap) ---------- */
  const soonNote = document.querySelector(".soon-note");
  if (soonNote) {
    soonNote.addEventListener("click", (e) => {
      if (!isTouch && window.matchMedia("(hover: hover)").matches) return;
      e.preventDefault();
      const open = soonNote.classList.toggle("is-open");
      soonNote.setAttribute("aria-expanded", open ? "true" : "false");
    });

    document.addEventListener("click", (e) => {
      if (!soonNote.classList.contains("is-open")) return;
      if (soonNote.contains(e.target)) return;
      soonNote.classList.remove("is-open");
      soonNote.setAttribute("aria-expanded", "false");
    });

    soonNote.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      soonNote.classList.remove("is-open");
      soonNote.setAttribute("aria-expanded", "false");
      soonNote.blur();
    });
  }

  /* ---------- Copy email (no mailto) ----------
     Hover tip: "Copy mail" → click → "Copied" */
  const copyBtns = Array.from(document.querySelectorAll(".copy-mail"));
  let copyResetTimer = null;

  async function copyEmail(btn) {
    const email = btn.getAttribute("data-email") || "";
    if (!email) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(email);
      } else {
        const ta = document.createElement("textarea");
        ta.value = email;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
    } catch (err) {
      return;
    }

    const tip = btn.querySelector("[data-copy-tip]");
    copyBtns.forEach((b) => {
      b.classList.remove("is-copied");
      const t = b.querySelector("[data-copy-tip]");
      if (t) t.textContent = "Copy mail";
    });

    btn.classList.add("is-copied");
    if (tip) tip.textContent = "Copied";
    btn.setAttribute("aria-label", "Email copied: " + email);

    if (copyResetTimer) clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => {
      btn.classList.remove("is-copied");
      if (tip) tip.textContent = "Copy mail";
      btn.setAttribute("aria-label", "Copy email address");
    }, 1800);
  }

  copyBtns.forEach((btn) => {
    btn.addEventListener("click", () => copyEmail(btn));
  });

  /* ---------- Work marquee: preload all frames before animating ---------- */
  const marqueeTrack = document.querySelector("#work .marquee__track");
  if (marqueeTrack && !prefersReduced) {
    const marqueeImgs = Array.from(
      marqueeTrack.querySelectorAll(".marquee__item img")
    );
    const uniqueSrcs = [
      ...new Set(marqueeImgs.map((img) => img.currentSrc || img.src)),
    ];

    marqueeImgs.forEach((img) => {
      const item = img.closest(".marquee__item");
      const w = Number(img.getAttribute("width"));
      const h = Number(img.getAttribute("height"));
      if (item && w > 0 && h > 0) {
        item.style.aspectRatio = w + " / " + h;
      }
    });

    const startMarquee = () => marqueeTrack.classList.add("is-ready");

    const preloadOne = (src) =>
      new Promise((resolve) => {
        const loader = new Image();
        loader.decoding = "async";
        loader.onload = loader.onerror = resolve;
        loader.src = src;
      });

    const preloadAll = Promise.all(uniqueSrcs.map(preloadOne));
    const timeout = new Promise((resolve) => setTimeout(resolve, 4000));

    Promise.race([preloadAll, timeout]).then(startMarquee);
  } else if (marqueeTrack) {
    marqueeTrack.classList.add("is-ready");
  }
})();
