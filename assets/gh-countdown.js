/* ============================================================================
  GH Countdown (Influencer / Test)
  - Central Time aware (US DST)
  - Replaces the “24 Hours” banner with big-digit countdown + CTA
  - Gentle popup appears once the banner is out of view
  - URL params (use any ONE of the first three):
      gh_until=YYYY-MM-DD                  // date only (ends 23:59 CT)
      gh_until=YYYY-MM-DDTHH:MM            // date + time (24h) CT
      gh_until=YYYY-MM-DD HH:MM            // same as above, with space
      gh_until_date=YYYY-MM-DD&gh_until_time=HH:MM  // split params
      gh_code=CODE                         // optional; shows in popup text
      gh_name=Name                         // optional; builds CTA text
============================================================================ */

/* ---------- Page scope ---------- */
// TEST only (current): just /pages/influencer-test
var PATH_OK = /\/pages\/(influencer-test)(?:\/|$)/i.test(location.pathname);

// PROD-ready (uncomment when going live):
// var PATH_OK = /\/pages\/(influencer|influencer-test)(?:\/|$)/i.test(location.pathname);

if (!PATH_OK) return;

/* ---------- debug helper ---------- */
var DEBUG = false;
function dbg(){ if (DEBUG) try{ console.log('[GH-CD]', ...arguments); }catch(e){} }

/* ---------- small utils ---------- */
function ready(fn){ if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',fn,{once:true}); } else { fn(); } }
function qsParam(name){ var q=new URLSearchParams(location.search||''); return (q.get(name)||q.get('amp;'+name)||'').trim(); }
function pad(n){ return ('0'+n).slice(-2); }
function secondSundayInMarch(y){ var d=new Date(Date.UTC(y,2,1)); return 1+((7-d.getUTCDay())%7)+7; }
function firstSundayInNovember(y){ var d=new Date(Date.UTC(y,10,1)); return 1+((7-d.getUTCDay())%7); }
function isDST(y,m,d,h){
  if(m<3||m>11) return false;
  if(m>3&&m<11) return true;
  if(m===3){ var s=secondSundayInMarch(y); if(d<s) return false; if(d>s) return true; return h>=2; }
  if(m===11){ var e=firstSundayInNovember(y); if(d<e) return true; if(d>e) return false; return h<2; }
  return false;
}
function endMsFromCT(Y,M,D,H,Min){
  var off = isDST(Y,M,D,H) ? '-05:00' : '-06:00';
  return Date.parse(Y+'-'+pad(M)+'-'+pad(D)+'T'+pad(H)+':'+pad(Min)+':00'+off);
}

/* ---------- parse deadline from URL ---------- */
function parseDeadline(){
  var U = qsParam('gh_until'), D = qsParam('gh_until_date'), T = qsParam('gh_until_time');
  var Y,M,Da,H=23,Mi=59;
  if (U){
    var m=/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2})(?::?(\d{2}))?)?$/.exec(U);
    if(!m) return null;
    Y=+m[1]; M=+m[2]; Da=+m[3]; if(m[4]!=null){ H=+m[4]; Mi=+(m[5]||0); }
  }else if (D){
    var md=/^(\d{4})-(\d{2})-(\d{2})$/.exec(D); if(!md) return null;
    Y=+md[1]; M=+md[2]; Da=+md[3];
    if (T){ var mt=/^(\d{1,2}):(\d{2})$/.exec(T); if(!mt) return null; H=+mt[1]; Mi=+mt[2]; }
  }else{
    return null;
  }
  var end=endMsFromCT(Y,M,Da,H,Mi);
  dbg('parsed', {Y,M,Da,H,Mi, endISO:new Date(end).toISOString()});
  return isFinite(end)?end:null;
}

/* ---------- CSS (once) ---------- */
(function injectCSS(){
  if (document.getElementById('gh-countdown-css')) return;
  var css=document.createElement('style'); css.id='gh-countdown-css';
  css.textContent = `
    /* Banner */
    #gh-countdown-wrap{display:grid;gap:1.6rem;align-items:center;justify-items:center}
    #gh-countdown-grid{display:flex;gap:1.6rem;justify-content:center;align-items:flex-end;flex-wrap:wrap}
    #gh-countdown-grid .cell{display:grid;justify-items:center}
    #gh-countdown-grid .num{color:#fff;font-weight:800;line-height:1;font-size:clamp(28px,6vw,64px);letter-spacing:.02em}
    #gh-countdown-grid .lab{color:rgba(255,255,255,.9);font-weight:700;font-size:10px;letter-spacing:.18em;text-transform:uppercase;margin-top:.25rem}
    .gh-countdown-cta{margin-top:.25rem}
    .gh-countdown-cta .gh-btn{
      background:var(--gh-color-gold,#caa329);
      color:#fff;border:0;border-radius:0;font-weight:800;padding:.85rem 1.4rem;cursor:pointer
    }
    .gh-countdown-cta .gh-btn:hover{filter:brightness(.97)}

    /* Popup */
    #gh-popdown{
      position:fixed;left:0;right:0;bottom:16px;
      display:flex;justify-content:center;z-index:2147483600;
      pointer-events:none;visibility:hidden;opacity:0;transform:translateY(12px);
      transition:opacity .32s ease, transform .32s ease;
    }
    #gh-popdown.gh-show{visibility:visible;opacity:1;transform:translateY(0)}
    #gh-popdown .card{
      pointer-events:auto;position:relative;background:#1f4a35;color:#fff;
      box-shadow:0 18px 48px rgba(0,0,0,.28);border-radius:18px;
      max-width:1100px;width:calc(100% - 24px);padding:14px 18px;display:grid;gap:16px;
      grid-template-columns:auto 1fr auto;align-items:center;
    }
    #gh-popdown .pre{font-weight:700;font-size:13px;letter-spacing:.18em;text-transform:uppercase;opacity:.95;white-space:nowrap}
    #gh-popdown .cd{display:flex;gap:1.6rem;align-items:flex-end;justify-content:center}
    #gh-popdown .cd .cell{display:grid;justify-items:center}
    #gh-popdown .cd .num{font-weight:800;line-height:1;letter-spacing:.02em;font-size:clamp(20px,4.2vw,40px)}
    #gh-popdown .cd .lab{font-weight:700;opacity:.95;font-size:10px;letter-spacing:.18em;text-transform:uppercase;margin-top:.2rem}
    #gh-popdown .btn{background:var(--gh-color-gold,#caa329);color:#fff;border:0;border-radius:0;font-weight:800;padding:.75rem 1.25rem;cursor:pointer;white-space:nowrap}
    #gh-popdown .btn:hover{filter:brightness(.97)}
    #gh-popdown .close{position:static;margin-left:8px;background:transparent;border:0;color:#fff;font-size:20px;line-height:1;cursor:pointer;opacity:.9}
    @media (max-width:768px){
      #gh-popdown .card{grid-template-columns:1fr;row-gap:10px;padding:14px 14px 16px}
      #gh-popdown .pre{text-align:center;order:1}
      #gh-popdown .cd{order:2}
      #gh-popdown .btn{order:3;justify-self:center}
      #gh-popdown .close{position:absolute;top:10px;right:12px;margin:0}
    }
  `;
  document.head.appendChild(css);
})();

/* ---------- banner (bar) ---------- */
function findOrCreateBar(){
  var el = document.getElementById('gh-offer-bar') || document.querySelector('.gh--bar h5');
  if (el) return el;
  var header = document.querySelector('.gh--header') || document.querySelector('main') || document.body;
  var sec = document.createElement('section');
  sec.className = 'gh--bar bg-green py2';
  sec.innerHTML = '<div class="page-width center"><h5 class="mb0 color-white" id="gh-offer-bar"></h5></div>';
  header.parentNode.insertBefore(sec, header.nextSibling);
  return sec.querySelector('#gh-offer-bar');
}

function mountBanner(endMs){
  var bar = findOrCreateBar(); if(!bar || bar.dataset.ghBound==='1') return;
  bar.dataset.ghBound='1';
  var name = qsParam('gh_name') || 'Influencer';
  bar.innerHTML = `
    <div id="gh-countdown-wrap" aria-live="polite" aria-atomic="true">
      <div id="gh-countdown-grid">
        <div class="cell"><div class="num" id="gh-cd-d">0</div><div class="lab" id="gh-cd-dlab">DAYS</div></div>
        <div class="cell"><div class="num" id="gh-cd-h">00</div><div class="lab">HOURS</div></div>
        <div class="cell"><div class="num" id="gh-cd-m">00</div><div class="lab">MINUTES</div></div>
        <div class="cell"><div class="num" id="gh-cd-s">00</div><div class="lab">SECONDS</div></div>
      </div>
      <div class="gh-countdown-cta"><button type="button" class="gh-btn" id="gh-countdown-cta">Shop ${name}'s Picks</button></div>
    </div>`;
  var cta = document.getElementById('gh-countdown-cta');
  if(cta){ cta.addEventListener('click', function(){
    var t=document.querySelector('.product-slider')||document.getElementById('gh-products');
    if(t&&t.scrollIntoView) t.scrollIntoView({behavior:'smooth',block:'start'}); else location.hash='#gh-products';
  }); }

  var dE=document.getElementById('gh-cd-d'), hE=document.getElementById('gh-cd-h'),
      mE=document.getElementById('gh-cd-m'), sE=document.getElementById('gh-cd-s'),
      dLab=document.getElementById('gh-cd-dlab');

  function tick(){
    var left=endMs - Date.now();
    if(left<=0){ dE.textContent='0'; hE.textContent='00'; mE.textContent='00'; sE.textContent='00'; dLab.textContent='DAYS'; clearInterval(iv); return; }
    var s=Math.floor(left/1000), d=Math.floor(s/86400),
        h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60), ss=s%60;
    dE.textContent=d; hE.textContent=pad(h); mE.textContent=pad(m); sE.textContent=pad(ss);
    dLab.textContent = (d===1 ? 'DAY' : 'DAYS');
  }
  tick(); var iv=setInterval(tick,1000);
}

/* ---------- popup (gentle reveal) ---------- */
function mountPopup(endMs){
  var host=document.createElement('div'); host.id='gh-popdown';
  var code=qsParam('gh_code'), name=qsParam('gh_name')||'Influencer';
  host.innerHTML =
    '<div class="card" aria-label="Limited-time offer">'+
      '<div class="pre">Offer ends in</div>'+
      '<div class="cd">'+
        '<div class="cell"><div class="num" id="gh-pd">0</div><div class="lab" id="gh-plab">DAYS</div></div>'+
        '<div class="cell"><div class="num" id="gh-ph">00</div><div class="lab">HOURS</div></div>'+
        '<div class="cell"><div class="num" id="gh-pm">00</div><div class="lab">MINUTES</div></div>'+
        '<div class="cell"><div class="num" id="gh-ps">00</div><div class="lab">SECONDS</div></div>'+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:8px">'+
        '<button class="btn" id="gh-popdown-cta" type="button">Shop '+name+'\'s Picks</button>'+
        (code ? '<span style="font-weight:700;opacity:.95;white-space:nowrap">Use code <b>'+code+'</b></span>' : '')+
        '<button class="close" id="gh-popdown-close" type="button" aria-label="Close">×</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(host);

  document.getElementById('gh-popdown-cta').addEventListener('click', function(){
    var t=document.querySelector('.product-slider')||document.getElementById('gh-products');
    if(t&&t.scrollIntoView) t.scrollIntoView({behavior:'smooth',block:'start'}); else location.hash='#gh-products';
  });
  document.getElementById('gh-popdown-close').addEventListener('click', function(){ host.remove(); });

  var dE=document.getElementById('gh-pd'), hE=document.getElementById('gh-ph'),
      mE=document.getElementById('gh-pm'), sE=document.getElementById('gh-ps'),
      dLab=document.getElementById('gh-plab');

  function tick(){
    var left=endMs - Date.now();
    if(left<=0){ dE.textContent='0'; hE.textContent='00'; mE.textContent='00'; sE.textContent='00'; dLab.textContent='DAYS'; clearInterval(iv); return; }
    var s=Math.floor(left/1000), d=Math.floor(s/86400),
        h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60), ss=s%60;
    dE.textContent=d; hE.textContent=pad(h); mE.textContent=pad(m); sE.textContent=pad(ss);
    dLab.textContent = (d===1 ? 'DAY' : 'DAYS');
  }
  tick(); var iv=setInterval(tick,1000);

  function reveal(){ host.classList.add('gh-show'); }
  function hide(){ host.classList.remove('gh-show'); }

  var bannerEl = document.getElementById('gh-countdown-wrap');
  if ('IntersectionObserver' in window && bannerEl){
    var io = new IntersectionObserver(function(entries){
      var e = entries[0]; if(!e) return;
      if (e.isIntersecting) hide(); else reveal();
    }, {threshold:0.05});
    io.observe(bannerEl);
  }else{
    function onScroll(){ if(window.scrollY>window.innerHeight*0.33) reveal(); else hide(); }
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
  }
}

/* ---------- boot ---------- */
var END = parseDeadline();
dbg('path ok?', PATH_OK, 'end ms', END);
if (!END) { dbg('No valid gh_until/gh_until_date+time'); return; }

ready(function(){
  dbg('init');
  mountBanner(END);
  mountPopup(END);
});
