/* NAIJA TASK reusable seasonal campaign renderer.
   Campaign dates and enable/disable state are read from Supabase; no local-only state. */
(function () {
  'use strict';
  if (window.__ntSeasonalCampaignLoaded) return;
  window.__ntSeasonalCampaignLoaded = true;

  const SUPABASE_URL = 'https://jwakveeiynpakunwjzkj.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_iT-y7ZOr_7g_SOx6ZPzR2A_ZjjnLZ6D';
  const EXCLUDED = /^(admin(?:-.*)?|login|poster-login|signup|poster-signup|forgot-password|reset-password|auth-callback|wallet|withdrawal|transactions|poster-payment|proof|proofs|task|activation|retry|approved|cancelled)\.html$/i;
  const page = location.pathname.split('/').pop() || 'index.html';
  if (EXCLUDED.test(page)) return;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const validLocalPath = value => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
  const formatCountdown = ms => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return days + 'd ' + String(hours).padStart(2,'0') + 'h ' + String(minutes).padStart(2,'0') + 'm ' + String(seconds).padStart(2,'0') + 's';
  };

  async function loadCampaign() {
    const response = await fetch(SUPABASE_URL + '/rest/v1/seasonal_campaigns?select=campaign_key,name,enabled,starts_at,ends_at,headline,description,artwork_path,tasker_cta_label,tasker_cta_url,poster_cta_label,poster_cta_url&enabled=eq.true&order=starts_at.desc&limit=1', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    });
    if (!response.ok) throw new Error('Seasonal campaign settings are unavailable.');
    const rows = await response.json();
    const campaign = Array.isArray(rows) ? rows[0] : null;
    if (!campaign) return;
    const start = Date.parse(campaign.starts_at);
    const end = Date.parse(campaign.ends_at);
    const now = Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || now < start || now >= end) return;
    render(campaign, end);
  }

  function render(campaign, endAt) {
    if (document.getElementById('nt-seasonal-campaign')) return;
    const isHome = page === 'index.html';
    const style = document.createElement('style');
    style.id = 'nt-seasonal-campaign-style';
    style.textContent = `
      #nt-seasonal-campaign{position:relative;isolation:isolate;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(210px,.95fr);align-items:center;gap:16px;width:100%;min-height:270px;padding:clamp(20px,3.5vw,38px) max(18px,calc((100vw - 1050px)/2));overflow:hidden;background:radial-gradient(ellipse at 82% 45%,rgba(184,230,46,.2),transparent 35%),linear-gradient(112deg,#052d21 0%,#075b35 54%,#0b3d2e 100%);color:#fff;border-block:3px solid #c9a64b}
      #nt-seasonal-campaign:before{content:"";position:absolute;inset:0;z-index:-1;opacity:.19;background-image:radial-gradient(circle at 12% 25%,#fff 0 1px,transparent 1.8px),radial-gradient(circle at 68% 75%,#fff 0 1px,transparent 1.8px),radial-gradient(circle at 91% 22%,#fff 0 1.5px,transparent 2px);background-size:47px 39px,63px 51px,71px 57px}
      #nt-seasonal-campaign .nt-campaign-copy{max-width:590px}#nt-seasonal-campaign .nt-campaign-kicker{display:inline-flex;margin-bottom:10px;padding:7px 11px;border:1px solid #ffe59a66;border-radius:999px;background:#ffffff17;color:#ffe59a;font-size:9px;font-weight:950;letter-spacing:1.2px;text-transform:uppercase}
      #nt-seasonal-campaign .nt-campaign-title{display:block;color:#fff;font-size:clamp(24px,3.8vw,43px);font-weight:950;line-height:1.06;letter-spacing:-1.4px;text-wrap:balance}
      #nt-seasonal-campaign .nt-campaign-copytext{max-width:500px;margin:11px 0 13px;color:#e7f4e9;font-size:clamp(11px,1.4vw,13px);line-height:1.6}
      #nt-seasonal-campaign .nt-campaign-actions{display:flex;flex-wrap:wrap;gap:8px}
      #nt-seasonal-campaign .nt-campaign-btn{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 14px;border:1px solid #d7ef8a;border-radius:10px;background:linear-gradient(120deg,#d6f078,#b8df42);color:#153b20;text-decoration:none;font-size:10px;font-weight:950}
      #nt-seasonal-campaign .nt-campaign-btn.secondary{border-color:#ffffff77;background:#ffffff16;color:#fff}
      #nt-seasonal-campaign .nt-campaign-countdown{display:block;margin-top:11px;color:#f7e9bd;font-size:10px;font-weight:800;letter-spacing:.2px}
      #nt-seasonal-campaign .nt-campaign-art{width:100%;max-width:440px;justify-self:end;filter:drop-shadow(0 14px 22px #0004)}
      #nt-seasonal-campaign .nt-campaign-art img{display:block;width:100%;height:auto}
      #nt-seasonal-campaign.nt-campaign-compact{grid-template-columns:minmax(0,1fr) minmax(110px,170px);min-height:116px;padding:13px max(14px,calc((100vw - 1050px)/2));gap:8px}
      #nt-seasonal-campaign.nt-campaign-compact .nt-campaign-kicker{margin-bottom:4px;padding:4px 8px;font-size:8px}
      #nt-seasonal-campaign.nt-campaign-compact .nt-campaign-title{font-size:clamp(15px,2vw,21px);letter-spacing:-.4px}
      #nt-seasonal-campaign.nt-campaign-compact .nt-campaign-copytext{margin:5px 0 7px;font-size:10px}
      #nt-seasonal-campaign.nt-campaign-compact .nt-campaign-btn{min-height:32px;padding:0 9px;font-size:8px}
      #nt-seasonal-campaign.nt-campaign-compact .nt-campaign-countdown{margin-top:5px;font-size:8px}
      #nt-seasonal-campaign.nt-campaign-compact .nt-campaign-art{max-width:170px}
      @media(max-width:650px){#nt-seasonal-campaign{grid-template-columns:1fr;gap:2px;min-height:0;padding:22px 15px 15px;text-align:center}#nt-seasonal-campaign .nt-campaign-copy{margin:auto}#nt-seasonal-campaign .nt-campaign-title{margin:auto;font-size:clamp(26px,7vw,36px)}#nt-seasonal-campaign .nt-campaign-copytext{margin:8px auto 11px;font-size:11px}#nt-seasonal-campaign .nt-campaign-actions{justify-content:center}#nt-seasonal-campaign .nt-campaign-btn{min-height:39px;font-size:9px}#nt-seasonal-campaign .nt-campaign-art{width:min(100%,340px);justify-self:center;margin-top:-3px}#nt-seasonal-campaign.nt-campaign-compact{grid-template-columns:minmax(0,1fr) 95px;gap:5px;padding:10px 12px;text-align:left}#nt-seasonal-campaign.nt-campaign-compact .nt-campaign-title{font-size:15px}#nt-seasonal-campaign.nt-campaign-compact .nt-campaign-copytext{font-size:9px;margin:4px 0}#nt-seasonal-campaign.nt-campaign-compact .nt-campaign-actions{justify-content:flex-start;gap:5px}#nt-seasonal-campaign.nt-campaign-compact .nt-campaign-btn{min-height:28px;padding:0 7px;font-size:7px}#nt-seasonal-campaign.nt-campaign-compact .nt-campaign-art{width:95px;margin:0}}
    `;
    const section = document.createElement('section');
    section.id = 'nt-seasonal-campaign';
    if (!isHome) section.classList.add('nt-campaign-compact');
    section.setAttribute('aria-label', campaign.name || 'NAIJA TASK seasonal campaign');
    const copy = document.createElement('div');
    copy.className = 'nt-campaign-copy';
    const kicker = document.createElement('span');
    kicker.className = 'nt-campaign-kicker';
    kicker.textContent = '🎄 NAIJA TASK • ' + (campaign.name || 'SEASONAL CAMPAIGN');
    const title = document.createElement('strong');
    title.className = 'nt-campaign-title';
    title.textContent = campaign.headline || 'Seasonal opportunities with NAIJA TASK';
    const desc = document.createElement('p');
    desc.className = 'nt-campaign-copytext';
    desc.textContent = campaign.description || 'Complete tasks, earn Naira and promote your business.';
    const actions = document.createElement('div');
    actions.className = 'nt-campaign-actions';
    const poster = document.createElement('a');
    poster.className = 'nt-campaign-btn';
    poster.href = validLocalPath(campaign.poster_cta_url);
    poster.textContent = '🚀 ' + (campaign.poster_cta_label || 'POST A TASK');
    const tasker = document.createElement('a');
    tasker.className = 'nt-campaign-btn secondary';
    tasker.href = validLocalPath(campaign.tasker_cta_url);
    tasker.textContent = '🎁 ' + (campaign.tasker_cta_label || 'JOIN AS TASKER');
    actions.append(poster, tasker);
    const countdown = document.createElement('span');
    countdown.className = 'nt-campaign-countdown';
    countdown.setAttribute('aria-live','off');
    const art = document.createElement('div');
    art.className = 'nt-campaign-art';
    const img = document.createElement('img');
    img.src = validLocalPath(campaign.artwork_path);
    img.alt = 'Festive seasonal campaign artwork';
    img.loading = isHome ? 'eager' : 'lazy';
    img.decoding = 'async';
    art.append(img);
    copy.append(kicker,title,desc,actions,countdown);
    section.append(copy,art);
    const place = () => {
      const header = document.querySelector('body > header, body > .topbar, body > nav');
      const main = document.querySelector('body > main, body > #app main, body > .main-content');
      if (header) header.insertAdjacentElement('afterend',section);
      else if (main) main.insertAdjacentElement('beforebegin',section);
      else document.body.insertBefore(section,document.body.firstChild);
      document.head.append(style);
    };
    if (document.body) place();
    else document.addEventListener('DOMContentLoaded',place,{once:true});
    const update = () => {
      const remaining = endAt - Date.now();
      if (remaining <= 0) {
        section.remove();
        style.remove();
        return;
      }
      countdown.textContent = '⏳ CAMPAIGN ENDS IN ' + formatCountdown(remaining);
    };
    update();
    window.setInterval(update,1000);
  }

  loadCampaign().catch(error => console.warn('[NAIJA TASK] Seasonal campaign not shown:',error));
})();