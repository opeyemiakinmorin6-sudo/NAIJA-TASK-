/* NAIJA TASK shared back navigation */
(() => {
  const run = () => {
    const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const adminFiles = ["admin.html", "admin-payments.html"];
    const posterFiles = ["poster-dashboard.html", "poster-job.html", "poster-payment.html", "post-job.html", "post-business.html"];
    const fallback = adminFiles.includes(file) ? "admin.html" : (posterFiles.includes(file) ? "poster-dashboard.html" : "dashboard.html");

    // Keep a page's existing back control when one is already provided.
    const existing = document.querySelector('a.back, button.back, a.back-button, button.back-button, [data-back]');
    if (existing) {
      existing.setAttribute("aria-label", existing.getAttribute("aria-label") || "Go back");
      existing.setAttribute("title", existing.getAttribute("title") || "Go back");
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "nt-global-back";
    button.setAttribute("aria-label", "Go back");
    button.setAttribute("title", "Go back");
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';
    button.addEventListener("click", () => {
      const referrer = document.referrer;
      let safeReferrer = false;
      try {
        const url = new URL(referrer);
        safeReferrer = url.origin === location.origin &&
          url.href !== location.href &&
          !/(^|\/)(login|poster-login|admin-login|signup|poster-signup)(\.html)?([?#]|$)/i.test(url.pathname);
      } catch (_) {}
      if (safeReferrer && history.length > 1) history.back();
      else location.href = fallback;
    });

    const style = document.createElement("style");
    style.textContent = `
      .nt-global-back{width:42px;height:42px;min-width:42px;display:inline-flex;align-items:center;justify-content:center;
        border:1px solid rgba(255,255,255,.34);border-radius:14px;background:rgba(255,255,255,.15);color:#fff;
        box-shadow:0 3px 12px rgba(0,0,0,.13);cursor:pointer;flex:0 0 42px;padding:0;margin:0 10px 0 0;
        -webkit-tap-highlight-color:transparent;transition:transform .15s ease,background .15s ease}
      .nt-global-back:active{transform:scale(.94);background:rgba(255,255,255,.25)}
      .nt-global-back svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2.3;stroke-linecap:round;stroke-linejoin:round}
      .nt-global-back:focus-visible{outline:3px solid #b7ef43;outline-offset:3px}
      @media(prefers-reduced-motion:reduce){.nt-global-back{transition:none}}
    `;
    document.head.appendChild(style);

    const header = document.querySelector("header, .topbar, .header, .hero, .app > .topbar");
    if (header) {
      const row = header.querySelector(".header-row, .header-inner, .toprow, .brand-row, .top-actions, nav") || header;
      if (getComputedStyle(row).display === "flex" || getComputedStyle(row).display === "inline-flex") {
        row.insertBefore(button, row.firstChild);
      } else {
        button.style.margin = "0 0 12px 0";
        row.insertBefore(button, row.firstChild);
      }
    } else {
      button.style.cssText += ";position:fixed;top:max(12px,env(safe-area-inset-top));left:12px;z-index:10000;background:#087f36";
      document.body.appendChild(button);
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
})();