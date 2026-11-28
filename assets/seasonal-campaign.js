/* NAIJA TASK reusable seasonal campaign renderer.
   Campaign dates and enable/disable state are read from Supabase; no local-only state. */
(function () {
  'use strict';
  if (window.__ntSeasonalCampaignLoaded) return;
  window.__ntSeasonalCampaignLoaded = true;

  const SUPABASE_URL = 'https://jwakveeiynpakunwjzkj.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_iT-y7ZOr_7g_SOx6ZPzR2A_ZjjnLZ6D';
  const EXCLUDED = /^(admin(?:-.*)?|forgot-password|reset-password|auth-callback|wallet|withdrawal|transactions|poster-payment|proof|proofs|task|activation|retry|approved|cancelled)\.html$/i;
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

  function swapBrandAssets(seasonal) {
    const assets = [
      ['naija-task-logo.svg', 'naija-task-logo-seasonal.svg'],
      ['naija-task-tasker.svg', 'naija-task-tasker-seasonal.svg']
    ];
    document.querySelectorAll('img[src],link[rel="icon"],link[rel="apple-touch-icon"]').forEach(element => {
      const attribute = element.tagName === 'LINK' ? 'href' : 'src';
      const current = element.getAttribute(attribute);
      if (!current) return;
      const path = current.split('?')[0];
      for (const pair of assets) {
        const base = pair[0], festive = pair[1];
        if (path.endsWith('/' + base) || path === base || path.endsWith('/' + festive)) {
          const filename = seasonal ? festive : base;
          element.setAttribute(attribute, '/assets/' + filename + '?v=20261128-seasonal');
          break;
        }
      }
    });
  }

  function render(campaign, endAt) {
    if (document.getElementById('nt-seasonal-campaign')) return;
    swapBrandAssets(true);
    const isHome = page === 'index.html';
    document.body.classList.add('nt-season-active');
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
      #nt-seasonal-campaign .nt-campaign-sound{font:inherit;cursor:pointer;border-color:#ffe59a;background:#ffffff16;color:#fff}
      #nt-home-seasonal-sound{display:inline-flex;align-items:center;justify-content:center;min-height:40px;margin-top:10px;padding:0 14px;border:1px solid #f2cc70;border-radius:10px;background:#ffffff18;color:#fff;font:800 11px Arial,sans-serif;cursor:pointer;position:relative;z-index:2}#nt-home-seasonal-sound:focus-visible{outline:3px solid #fff;outline-offset:3px}
      #nt-seasonal-snow{position:fixed;inset:0;z-index:9998;overflow:hidden;pointer-events:none;contain:strict}
      #nt-seasonal-snow span{position:absolute;top:-12px;left:var(--x);width:var(--size);height:var(--size);border-radius:50%;background:#fff;opacity:var(--opacity);filter:drop-shadow(0 0 3px #b9dfff);animation:nt-snow-fall var(--duration) linear var(--delay) infinite}
      @keyframes nt-snow-fall{0%{transform:translate3d(0,-12px,0)}50%{transform:translate3d(var(--drift),52vh,0)}100%{transform:translate3d(calc(var(--drift)*-.45),105vh,0)}}
      @media(prefers-reduced-motion:reduce){#nt-seasonal-snow span{animation-duration:30s!important;filter:none!important}}
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
      /* Shared seasonal skin: only applied while the saved campaign is active. */
      body.nt-season-active{background:radial-gradient(circle at 8% 0%,#ffe9e2 0,transparent 28%),radial-gradient(circle at 95% 8%,#f7e6b4 0,transparent 24%),linear-gradient(145deg,#fff9e9 0%,#f2f8ed 52%,#fff1ed 100%)!important}
      body.nt-season-active header,body.nt-season-active .topbar,body.nt-season-active header.top,body.nt-season-active .header-row{background:linear-gradient(105deg,#073b24 0%,#08783c 58%,#9d1830 100%)!important;color:#fff!important;border-bottom:3px solid #d6b45b!important}
      body.nt-season-active header a,body.nt-season-active .topbar a,body.nt-season-active .header-row a{color:#fff!important}
      body.nt-season-active header .top-auth-link,body.nt-season-active .topbar .top-auth-link,body.nt-season-active .header-row .top-auth-link{background:#fff0c8!important;border-color:#d6b45b!important;color:#17452a!important;text-shadow:none!important}
      body.nt-season-active .dashboard-hero,body.nt-season-active .wallet-card,body.nt-season-active .balance-card,body.nt-season-active .nt-balance-card{background:linear-gradient(115deg,#073b24 0%,#08783c 66%,#9d1830 100%)!important;color:#fff!important;border:2px solid #d6b45b!important;box-shadow:0 12px 28px #5b251b22!important}
      body.nt-season-active .dashboard-hero h1,body.nt-season-active .dashboard-hero p,body.nt-season-active .wallet-card *,body.nt-season-active .balance-card *{color:#fff}
      body.nt-season-active .nt-quick-card,body.nt-season-active .stat-card,body.nt-season-active .panel,body.nt-season-active .nt-task-panel,body.nt-season-active .nt-feature-row,body.nt-season-active .task-item,body.nt-season-active .transaction-item,body.nt-season-active .poster-create-card,body.nt-season-active .job,body.nt-season-active main .card{background:linear-gradient(145deg,#fffdf5,#fff6e5)!important;border-color:#d6b45b!important;box-shadow:0 8px 22px #6b431312!important}
      body.nt-season-active .poster-create-card.business-create{background:linear-gradient(135deg,#073b24,#08783c 62%,#9d1830)!important;color:#fff!important}
      body.nt-season-active .bottom-nav{background:linear-gradient(100deg,#073b24,#075b35 65%,#8d1830)!important;border-top:3px solid #d6b45b!important;box-shadow:0 -7px 22px #45201622!important}
      body.nt-season-active .bottom-nav a,body.nt-season-active .bottom-nav .nav-item{color:#fff!important}
      body.nt-season-active .bottom-nav a.active,body.nt-season-active .bottom-nav .nav-item.active{background:#f3d77c!important;color:#173b24!important;border-radius:10px!important}
      body.nt-season-active .card{border:1px solid #d6b45b!important;box-shadow:0 18px 44px #5b32151c!important}
      body.nt-season-active .top .brand,body.nt-season-active .top .top-link{color:#fff!important}
      body.nt-season-active .footer{background:#073b24!important;color:#f9edc8!important;border-top:3px solid #d6b45b}
      /* Seasonal treatment for both Tasker and Poster authentication screens. */
      body.nt-season-active .layout{position:relative}
      body.nt-season-active .intro .eyebrow{display:inline-flex;padding:8px 12px;border:1px solid #d6b45b;border-radius:999px;background:linear-gradient(100deg,#fff1c7,#ffe5df);color:#8b2430!important;letter-spacing:1.2px}
      body.nt-season-active .intro h1{color:#073b24!important;text-shadow:0 2px 0 #fff5d6}
      body.nt-season-active .intro p{color:#465d4b!important}
      body.nt-season-active .benefit{color:#244b31!important}
      body.nt-season-active .benefit .tick{background:linear-gradient(145deg,#f6df91,#d8edaa)!important;color:#7c202c!important;border:1px solid #d6b45b}
      body.nt-season-active .layout>.card{background:linear-gradient(145deg,#fffdf5 0%,#fff5e4 58%,#f8eee5 100%)!important;border:2px solid #d6b45b!important;box-shadow:0 22px 55px #4d271b24!important}
      body.nt-season-active .card-brand{border-bottom-color:#e4cf9a!important}
      body.nt-season-active .card-brand strong,body.nt-season-active .card h2{color:#073b24!important}
      body.nt-season-active .card-brand small{color:#8b2430!important}
      body.nt-season-active .role{background:linear-gradient(110deg,#073b24,#08783c 68%,#8f1d32)!important;border:1px solid #d6b45b!important}
      body.nt-season-active .role strong,body.nt-season-active .role span{color:#fff!important}
      body.nt-season-active .layout input{background:#fffefa!important;border-color:#d9cda9!important;color:#183b28!important}
      body.nt-season-active .layout input:focus{border-color:#0b8f3c!important;box-shadow:0 0 0 3px #0b8f3c20!important}
      body.nt-season-active .layout label{color:#294b34!important}
      body.nt-season-active .primary{background:linear-gradient(105deg,#073b24 0%,#08783c 62%,#941d32 100%)!important;border:1px solid #d6b45b!important;box-shadow:0 9px 20px #5b251b22!important}
      body.nt-season-active .show,body.nt-season-active .forgot,body.nt-season-active .layout .secondary{background:linear-gradient(110deg,#fff0c8,#f9e5df)!important;border:1px solid #d6b45b!important;color:#17452a!important}
      body.nt-season-active .switch{color:#526455!important}
      body.nt-season-active .switch a,body.nt-season-active .nt-other-account a{color:#8b2430!important}
      body.nt-season-active .nt-other-account{border-top-color:#e4cf9a!important}
      body.nt-season-active .nt-google-btn{background:#fffefa!important;border-color:#d6b45b!important}
      body.nt-season-active .nt-turnstile-area{background:#fffaf0!important;border-color:#d6b45b!important}
      body.nt-season-active .footer{color:#f9edc8!important}
      #nt-seasonal-campaign{grid-column:1/-1}

    `;
    /* Keep the seasonal campaign, but make authentication-page actions role-specific.
       A Poster screen must never promote the Tasker signup action, or vice versa. */
    const isPosterAuth = /^(poster-login|poster-signup)\.html$/i.test(page);
    const isTaskerAuth = /^(login|signup)\.html$/i.test(page);
    const isAuth = isPosterAuth || isTaskerAuth;
    const section = document.createElement('section');
    section.id = 'nt-seasonal-campaign';
    if (!isHome) section.classList.add('nt-campaign-compact');
    if (isAuth) section.classList.add('nt-campaign-auth', isPosterAuth ? 'nt-campaign-poster' : 'nt-campaign-tasker');
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
    desc.textContent = isPosterAuth
      ? 'Promote your business, publish tasks and reach real taskers this festive season.'
      : isTaskerAuth
        ? 'Discover available tasks, complete them and earn rewards this festive season.'
        : (campaign.description || 'Complete tasks, earn Naira and promote your business.');
    const actions = document.createElement('div');
    actions.className = 'nt-campaign-actions';
    const soundButton = document.createElement('button');
    soundButton.type = 'button';
    soundButton.className = 'nt-campaign-btn nt-campaign-sound';
    soundButton.textContent = '🔔 Play festive bells';
    soundButton.setAttribute('aria-label','Play a short festive jingle bell sound');
    soundButton.addEventListener('click', async () => {
      if (soundButton.dataset.playing === '1') return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        soundButton.textContent = 'Sound unavailable';
        return;
      }
      soundButton.dataset.playing = '1';
      soundButton.disabled = true;
      soundButton.textContent = '🔔 Playing bells…';
      try {
        const context = window.__ntSeasonalAudioContext || (window.__ntSeasonalAudioContext = new AudioCtx());
        if (context.state === 'suspended') await context.resume();
        const master = context.createGain();
        master.gain.setValueAtTime(0.0001, context.currentTime);
        master.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.035);
        master.connect(context.destination);
        const notes = [659.25,783.99,987.77,1318.51,1174.66,987.77,783.99,659.25];
        notes.forEach((frequency,index) => {
          const start = context.currentTime + index * 0.19;
          [1,2.72].forEach((ratio,partial) => {
            const oscillator = context.createOscillator();
            const envelope = context.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency * ratio,start);
            envelope.gain.setValueAtTime(0.0001,start);
            envelope.gain.exponentialRampToValueAtTime(partial ? 0.13 : 0.42,start + 0.012);
            envelope.gain.exponentialRampToValueAtTime(0.0001,start + (partial ? 0.28 : 0.48));
            oscillator.connect(envelope);
            envelope.connect(master);
            oscillator.start(start);
            oscillator.stop(start + 0.5);
          });
        });
        window.setTimeout(() => {
          master.gain.setTargetAtTime(0.0001,context.currentTime,0.04);
          soundButton.dataset.playing = '0';
          soundButton.disabled = false;
          soundButton.textContent = '🔔 Play again';
        },1900);
      } catch (error) {
        soundButton.dataset.playing = '0';
        soundButton.disabled = false;
        soundButton.textContent = '🔔 Tap to play bells';
      }
    });
    const poster = document.createElement('a');
    poster.className = 'nt-campaign-btn';
    poster.href = validLocalPath(campaign.poster_cta_url);
    poster.textContent = '🚀 ' + (campaign.poster_cta_label || 'POST A TASK');
    const tasker = document.createElement('a');
    tasker.className = 'nt-campaign-btn secondary';
    tasker.href = validLocalPath(campaign.tasker_cta_url);
    tasker.textContent = '🎁 ' + (campaign.tasker_cta_label || 'JOIN AS TASKER');
    if (isPosterAuth) actions.append(poster);
    else if (isTaskerAuth) actions.append(tasker);
    else actions.append(poster, tasker);
    const countdown = document.createElement('span');
    countdown.className = 'nt-campaign-countdown';
    countdown.setAttribute('aria-live','off');
    if (!isHome) actions.append(soundButton);
    const snow = document.createElement('div');
    snow.id = 'nt-seasonal-snow';
    snow.setAttribute('aria-hidden','true');
    const flakeCount = window.matchMedia && window.matchMedia('(max-width: 600px)').matches ? 18 : 30;
    for (let i = 0; i < flakeCount; i++) {
      const flake = document.createElement('span');
      flake.style.setProperty('--x', (Math.random() * 100) + 'vw');
      flake.style.setProperty('--size', (2 + Math.random() * 4) + 'px');
      flake.style.setProperty('--opacity', (0.35 + Math.random() * 0.55).toFixed(2));
      flake.style.setProperty('--duration', (9 + Math.random() * 12) + 's');
      flake.style.setProperty('--delay', (-Math.random() * 18) + 's');
      flake.style.setProperty('--drift', ((Math.random() * 70) - 35) + 'px');
      snow.append(flake);
    }
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
    document.body.append(snow);
    if (isHome) {
      const homeHero = document.querySelector('.nt-legacy-hero');
      if (homeHero) {
        soundButton.id = 'nt-home-seasonal-sound';
        const heroActions = homeHero.querySelector('.nt-legacy-actions');
        if (heroActions) heroActions.insertAdjacentElement('afterend', soundButton);
        else homeHero.append(soundButton);
      }
    }
    const place = () => {
      const main = document.querySelector('body > main, body > #app main, body > .main-content, main');
      const header = document.querySelector('body > header, body > .topbar, body > nav');
      /* Put the campaign INSIDE the page's main content as its first block.
         This guarantees it appears at the very top of the homepage content,
         ahead of the existing hero and every other homepage section. */
      if (main) main.insertBefore(section, main.firstChild);
      else if (header) header.insertAdjacentElement('afterend', section);
      else document.body.insertBefore(section, document.body.firstChild);
      document.head.append(style);
    };
    if (document.body) place();
    else document.addEventListener('DOMContentLoaded',place,{once:true});
    const update = () => {
      const remaining = endAt - Date.now();
      if (remaining <= 0) {
        section.remove();
        style.remove();
        document.body.classList.remove('nt-season-active');
        swapBrandAssets(false);
        return;
      }
      countdown.textContent = '⏳ CAMPAIGN ENDS IN ' + formatCountdown(remaining);
    };
    update();
    window.setInterval(update,1000);
  }

  loadCampaign().catch(error => console.warn('[NAIJA TASK] Seasonal campaign not shown:',error));
})();