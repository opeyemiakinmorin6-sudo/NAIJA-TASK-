/* NAIJA TASK seasonal banner — temporary decorative artwork only.
   Normal page-flow banner; no popup, overlay, sticky panel, or application logic changes. */
(function () {
  'use strict';
  const now = new Date();
  const start = new Date('2026-11-28T00:00:00');
  const end = new Date('2027-01-03T00:00:00');
  if (now < start || now >= end || document.getElementById('nt-seasonal-banner')) return;

  const isNewYear = now >= new Date('2026-12-26T00:00:00');
  const style = document.createElement('style');
  style.id = 'nt-seasonal-banner-style';
  style.textContent = `
    #nt-seasonal-banner{position:relative;isolation:isolate;display:flex;align-items:center;justify-content:space-between;gap:18px;width:100%;box-sizing:border-box;min-height:132px;margin:0;padding:20px clamp(16px,4vw,42px);overflow:hidden;border-bottom:3px solid #d7b75b;background:radial-gradient(ellipse at 82% 10%,rgba(173,218,116,.23),transparent 36%),linear-gradient(112deg,#073b29 0%,#0b6339 52%,#123e2b 100%);color:#fff;font-family:inherit}
    #nt-seasonal-banner:before{content:"";position:absolute;inset:0;z-index:-1;opacity:.23;background-image:radial-gradient(circle at 12% 25%,#fff 0 1px,transparent 1.8px),radial-gradient(circle at 68% 75%,#fff 0 1px,transparent 1.8px),radial-gradient(circle at 91% 22%,#fff 0 1.5px,transparent 2px);background-size:47px 39px,63px 51px,71px 57px}
    #nt-seasonal-banner .nt-seasonal-message{min-width:0;max-width:610px}
    #nt-seasonal-banner .nt-seasonal-kicker{display:block;margin-bottom:5px;color:#f6d77c;font-size:10px;font-weight:900;letter-spacing:1.7px;text-transform:uppercase}
    #nt-seasonal-banner .nt-seasonal-title{display:block;color:#fff;font-size:clamp(19px,3vw,29px);font-weight:950;line-height:1.15;text-shadow:0 2px 12px #001c12}
    #nt-seasonal-banner .nt-seasonal-copy{display:block;margin-top:7px;color:#e7f4e9;font-size:clamp(11px,1.5vw,13px);line-height:1.5}
    #nt-seasonal-banner .nt-seasonal-art{display:flex;align-items:center;justify-content:center;gap:clamp(7px,1.8vw,20px);flex:0 0 auto;padding:8px 16px;border:1px solid rgba(255,255,255,.22);border-radius:18px;background:linear-gradient(145deg,rgba(255,255,255,.14),rgba(255,255,255,.04));box-shadow:inset 0 1px rgba(255,255,255,.14),0 10px 24px rgba(0,0,0,.12)}
    #nt-seasonal-banner .nt-seasonal-art span{display:inline-block;font-size:clamp(27px,5vw,48px);line-height:1;filter:drop-shadow(0 4px 3px rgba(0,0,0,.2))}
    #nt-seasonal-banner .nt-seasonal-art .nt-seasonal-star{color:#f6d77c;font-size:15px;filter:none}
    @media(max-width:560px){#nt-seasonal-banner{min-height:116px;gap:8px;padding:15px 13px}#nt-seasonal-banner .nt-seasonal-art{gap:5px;padding:9px 8px;border-radius:14px}#nt-seasonal-banner .nt-seasonal-art span{font-size:clamp(23px,7vw,34px)}#nt-seasonal-banner .nt-seasonal-art .nt-seasonal-star{font-size:10px}#nt-seasonal-banner .nt-seasonal-copy{max-width:260px}}
    @media(prefers-reduced-motion:no-preference){#nt-seasonal-banner .nt-seasonal-art{animation:ntSeasonalGlow 5s ease-in-out infinite alternate}@keyframes ntSeasonalGlow{from{box-shadow:inset 0 1px rgba(255,255,255,.12),0 8px 18px rgba(0,0,0,.1)}to{box-shadow:inset 0 1px rgba(255,255,255,.2),0 10px 26px rgba(214,183,91,.2)}}}
  `;

  const banner = document.createElement('section');
  banner.id = 'nt-seasonal-banner';
  banner.setAttribute('aria-label', 'NAIJA TASK seasonal banner');
  const message = document.createElement('div');
  message.className = 'nt-seasonal-message';
  const kicker = document.createElement('span');
  kicker.className = 'nt-seasonal-kicker';
  kicker.textContent = isNewYear ? 'A fresh chapter begins' : 'Season’s greetings from NAIJA TASK';
  const title = document.createElement('strong');
  title.className = 'nt-seasonal-title';
  title.textContent = isNewYear ? 'Happy New Year 2027!' : 'Merry Christmas!';
  const copy = document.createElement('span');
  copy.className = 'nt-seasonal-copy';
  copy.textContent = isNewYear
    ? 'Wishing our taskers and posters fresh opportunities, progress and success.'
    : 'Wishing our taskers and posters joy, peace and a wonderful festive season.';
  message.append(kicker, title, copy);

  const art = document.createElement('div');
  art.className = 'nt-seasonal-art';
  art.setAttribute('aria-hidden', 'true');
  art.innerHTML = isNewYear
    ? '<span>🎆</span><span class="nt-seasonal-star">✦</span><span>✨</span><span class="nt-seasonal-star">✦</span><span>🎉</span>'
    : '<span>🎅🏻</span><span class="nt-seasonal-star">✦</span><span>🦌</span><span class="nt-seasonal-star">✦</span><span>🎁</span>';
  banner.append(message, art);
  document.head.appendChild(style);
  document.body.insertBefore(banner, document.body.firstChild);
})();
