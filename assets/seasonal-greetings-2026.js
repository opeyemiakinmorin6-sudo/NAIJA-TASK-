/* NAIJA TASK seasonal greetings — isolated, temporary presentation only.
   Does not alter platform branding, colours, layout, data, or application logic. */
(function () {
  'use strict';
  const now = new Date();
  const start = new Date('2026-11-28T00:00:00');
  const end = new Date('2027-01-03T00:00:00');
  if (now < start || now >= end || document.getElementById('nt-seasonal-greeting')) return;

  const isNewYear = now >= new Date('2026-12-26T00:00:00');
  const style = document.createElement('style');
  style.id = 'nt-seasonal-greeting-style';
  style.textContent = `
    #nt-seasonal-greeting{position:fixed;z-index:65;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min( calc(100% - 24px),440px);padding:13px 44px 14px 15px;border:1px solid #dcebdc;border-radius:18px;background:linear-gradient(145deg,#fff 0%,#f5fbf2 100%);box-shadow:0 12px 34px rgba(7,59,43,.17);color:#173b29;font-family:inherit;animation:ntSeasonalIn .35s ease both;overflow:hidden}
    #nt-seasonal-greeting:before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,#0b8f3c 0 38%,#fff 38% 62%,#d52b36 62% 100%)}
    #nt-seasonal-greeting .nt-seasonal-art{display:flex;align-items:center;justify-content:center;gap:17px;margin:2px 0 9px;padding:7px 10px;border:1px solid #e5efe1;border-radius:13px;background:linear-gradient(100deg,#f0f8eb,#fff 50%,#f7f1e8);font-size:27px;line-height:1.1}
    #nt-seasonal-greeting .nt-seasonal-art span{display:inline-block;filter:drop-shadow(0 3px 2px #173b2920)}
    #nt-seasonal-greeting .nt-seasonal-art .nt-seasonal-star{font-size:13px;color:#c69b2d}
    #nt-seasonal-greeting .nt-seasonal-kicker{display:block;margin-bottom:3px;color:#16823c;font-size:9px;font-weight:900;letter-spacing:1.4px;text-transform:uppercase}
    #nt-seasonal-greeting .nt-seasonal-title{display:block;font-size:14px;font-weight:900;line-height:1.35}
    #nt-seasonal-greeting .nt-seasonal-copy{display:block;margin-top:3px;color:#58685d;font-size:11px;line-height:1.5}
    #nt-seasonal-greeting .nt-seasonal-close{position:absolute;top:9px;right:9px;width:29px;height:29px;border:0;border-radius:50%;background:#f0f5ef;color:#244b32;font-size:19px;line-height:1;cursor:pointer}
    @keyframes ntSeasonalIn{from{opacity:0;translate:0 12px}to{opacity:1;translate:0 0}}
    @media(prefers-reduced-motion:reduce){#nt-seasonal-greeting{animation:none}}
  `;
  const panel = document.createElement('aside');
  panel.id = 'nt-seasonal-greeting';
  panel.setAttribute('role', 'status');
  panel.setAttribute('aria-label', 'NAIJA TASK seasonal greeting');
  const art = document.createElement('div');
  art.className = 'nt-seasonal-art';
  art.setAttribute('aria-hidden', 'true');
  art.innerHTML = isNewYear
    ? '<span>🎆</span><span class="nt-seasonal-star">✦</span><span>✨</span><span class="nt-seasonal-star">✦</span><span>🎉</span>'
    : '<span>🎅🏻</span><span class="nt-seasonal-star">✦</span><span>🦌</span><span class="nt-seasonal-star">✦</span><span>🎁</span>';
  const kicker = document.createElement('span');
  kicker.className = 'nt-seasonal-kicker';
  kicker.textContent = isNewYear ? '✨ A new year, new possibilities' : '🎄 Season’s greetings from NAIJA TASK';
  const title = document.createElement('strong');
  title.className = 'nt-seasonal-title';
  title.textContent = isNewYear ? 'Happy New Year 2027! 🥳' : 'Merry Christmas! 🎁';
  const copy = document.createElement('span');
  copy.className = 'nt-seasonal-copy';
  copy.textContent = isNewYear
    ? 'Wishing you progress, fresh opportunities and greater success. Thank you for growing with us.'
    : 'Wishing our taskers, posters and the whole NAIJA TASK community joy, peace and a wonderful festive season.';
  const close = document.createElement('button');
  close.className = 'nt-seasonal-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Dismiss seasonal greeting');
  close.textContent = '×';
  close.addEventListener('click', function () {
    panel.remove();
    style.remove();
  });
  panel.append(art, kicker, title, copy, close);
  document.head.appendChild(style);
  document.body.appendChild(panel);
})();