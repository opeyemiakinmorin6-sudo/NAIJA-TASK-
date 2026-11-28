/* NAIJA TASK seasonal campaign — isolated homepage promotion, temporary by date. */
(function () {
  'use strict';
  const now = new Date();
  const start = new Date('2026-11-28T00:00:00');
  const end = new Date('2027-01-03T00:00:00');
  if (now < start || now >= end || document.getElementById('nt-seasonal-campaign')) return;

  const newYear = now >= new Date('2026-12-26T00:00:00');
  const style = document.createElement('style');
  style.id = 'nt-seasonal-campaign-style';
  style.textContent = `
    #nt-seasonal-campaign{position:relative;isolation:isolate;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(230px,.95fr);align-items:center;gap:16px;width:100%;min-height:290px;padding:clamp(22px,4vw,42px) max( max(18px,calc((100vw - 1050px)/2)), 18px );overflow:hidden;background:radial-gradient(ellipse at 82% 45%,rgba(184,230,46,.2),transparent 35%),linear-gradient(112deg,#052d21 0%,#075b35 54%,#0b3d2e 100%);color:#fff;border-top:3px solid #c9a64b;border-bottom:3px solid #c9a64b}
    #nt-seasonal-campaign:before{content:"";position:absolute;inset:0;z-index:-1;opacity:.19;background-image:radial-gradient(circle at 12% 25%,#fff 0 1px,transparent 1.8px),radial-gradient(circle at 68% 75%,#fff 0 1px,transparent 1.8px),radial-gradient(circle at 91% 22%,#fff 0 1.5px,transparent 2px);background-size:47px 39px,63px 51px,71px 57px}
    #nt-seasonal-campaign .nt-campaign-copy{max-width:590px}
    #nt-seasonal-campaign .nt-campaign-kicker{display:inline-flex;align-items:center;gap:7px;margin-bottom:12px;padding:7px 11px;border:1px solid rgba(255,232,160,.38);border-radius:999px;background:rgba(255,255,255,.09);color:#ffe59a;font-size:10px;font-weight:950;letter-spacing:1.35px;text-transform:uppercase}
    #nt-seasonal-campaign .nt-campaign-title{display:block;max-width:590px;color:#fff;font-size:clamp(27px,4.2vw,48px);font-weight:950;line-height:1.04;letter-spacing:-1.8px;text-wrap:balance;text-shadow:0 3px 18px rgba(0,0,0,.2)}
    #nt-seasonal-campaign .nt-campaign-title em{color:#d5f078;font-style:normal}
    #nt-seasonal-campaign .nt-campaign-copytext{max-width:490px;margin:13px 0 18px;color:#e7f4e9;font-size:clamp(12px,1.5vw,14px);line-height:1.65}
    #nt-seasonal-campaign .nt-campaign-actions{display:flex;flex-wrap:wrap;gap:10px}
    #nt-seasonal-campaign .nt-campaign-btn{display:inline-flex;align-items:center;justify-content:center;min-height:45px;padding:0 16px;border:1px solid #d7ef8a;border-radius:11px;background:linear-gradient(120deg,#d6f078,#b8df42);color:#153b20;text-decoration:none;font-size:11px;font-weight:950;box-shadow:0 7px 18px rgba(0,0,0,.15);transition:transform .18s,filter .18s}
    #nt-seasonal-campaign .nt-campaign-btn:hover{transform:translateY(-2px);filter:brightness(1.06)}
    #nt-seasonal-campaign .nt-campaign-btn.secondary{border-color:rgba(255,255,255,.55);background:rgba(255,255,255,.1);color:#fff;box-shadow:none}
    #nt-seasonal-campaign .nt-campaign-art{width:100%;max-width:480px;justify-self:end;filter:drop-shadow(0 17px 24px rgba(0,0,0,.22));animation:ntCampaignFloat 5s ease-in-out infinite}
    #nt-seasonal-campaign .nt-campaign-art img{display:block;width:100%;height:auto}
    @keyframes ntCampaignFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
    @media(max-width:650px){#nt-seasonal-campaign{grid-template-columns:1fr;gap:4px;min-height:0;padding:25px 18px 18px;text-align:center}#nt-seasonal-campaign .nt-campaign-copy{margin:auto}#nt-seasonal-campaign .nt-campaign-kicker{font-size:9px}#nt-seasonal-campaign .nt-campaign-title{margin:auto;font-size:clamp(29px,8vw,39px);letter-spacing:-1.2px}#nt-seasonal-campaign .nt-campaign-copytext{margin:10px auto 14px;font-size:12px}#nt-seasonal-campaign .nt-campaign-actions{justify-content:center}#nt-seasonal-campaign .nt-campaign-btn{min-height:43px;padding:0 13px;font-size:10px}#nt-seasonal-campaign .nt-campaign-art{width:min(100%,390px);justify-self:center;margin-top:-5px}}
    @media(prefers-reduced-motion:reduce){#nt-seasonal-campaign .nt-campaign-art{animation:none}#nt-seasonal-campaign .nt-campaign-btn{transition:none}}
  `;

  const section = document.createElement('section');
  section.id = 'nt-seasonal-campaign';
  section.setAttribute('aria-label', 'NAIJA TASK Christmas and New Year campaign');
  const copy = document.createElement('div');
  copy.className = 'nt-campaign-copy';
  const kicker = document.createElement('span');
  kicker.className = 'nt-campaign-kicker';
  kicker.textContent = newYear ? '✨ NEW YEAR • NEW OPPORTUNITIES' : '🎄 NAIJA TASK FESTIVE CAMPAIGN • 2026';
  const title = document.createElement('strong');
  title.className = 'nt-campaign-title';
  title.innerHTML = newYear ? 'START 2027 WITH <em>NEW OPPORTUNITIES!</em>' : 'THIS CHRISTMAS, LET <em>OPPORTUNITY FIND YOU!</em>';
  const description = document.createElement('p');
  description.className = 'nt-campaign-copytext';
  description.textContent = newYear
    ? 'Complete tasks and earn Naira, or promote your business to more people. Make this new year count with NAIJA TASK.'
    : 'Complete tasks. Earn Naira. Promote your business. Join the NAIJA TASK community and make this festive season count.';
  const actions = document.createElement('div');
  actions.className = 'nt-campaign-actions';
  const post = document.createElement('a');
  post.className = 'nt-campaign-btn';
  post.href = '/poster-signup.html';
  post.textContent = '🚀 POST A TASK';
  const earn = document.createElement('a');
  earn.className = 'nt-campaign-btn secondary';
  earn.href = '/signup.html';
  earn.textContent = '🎁 JOIN AS TASKER';
  copy.append(kicker, title, description, actions);
  actions.append(post, earn);

  const art = document.createElement('div');
  art.className = 'nt-campaign-art';
  const image = document.createElement('img');
  image.src = '/assets/naija-task-christmas-2026.svg';
  image.alt = newYear ? 'Festive New Year illustration with Santa, reindeer and gifts' : 'Santa Claus, reindeer and Christmas gifts in a festive sleigh illustration';
  image.loading = 'eager';
  image.decoding = 'async';
  art.appendChild(image);
  section.append(copy, art);

  document.head.appendChild(style);
  const header = document.querySelector('body > header');
  const main = document.querySelector('body > main');
  if (header && main) header.insertAdjacentElement('afterend', section);
  else if (main) main.insertAdjacentElement('afterbegin', section);
  else document.body.insertBefore(section, document.body.firstChild);
})();
