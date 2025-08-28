/* gh-countdown.js — influencer page countdown + smart popup (CT) */
(function(){
  // ---------- Page scope ----------
  // (Uncomment when going live on both pages)
  // var PATH_OK = /\/pages\/(influencer|influencer-test)(?:\/|$)/i.test(location.pathname);
  // if (!PATH_OK) return;

  // Test page only (current):
  var PATH_OK = /\/pages\/(influencer-test)(?:\/|$)/i.test(location.pathname);
  if (!PATH_OK) return;

  // ---------- small helpers ----------
  function ready(fn){ if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn,{once:true});} else { fn(); } }
  function qsParam(name){ var q=new URLSearchParams(location.search||''); return (q.get(name)||q.get('amp;'+name)||'').trim(); }
  function pad(n){ return ('0'+n).slice(-2); }
  function secondSundayInMarch(y){ var d=new Date(Date.UTC(y,2,1)); return 1+((7-d.getUTCDay())%7)+7; }
  function firstSundayInNovember(y){ var d=new Date(Date.UTC(y,10,1)); return 1+((7-d.getUTCDay())%7); }
  function isDST(y,m,d,h){
    if(m<3||m>11) return false; if(m>3&&m<11) return true;
    if(m===3){ var s=secondSundayInMarch(y); if(d<s) return false; if(d>s) return true; return h>=2; }
    if(m===11){ var e=firstSundayInNovember(y); if(d<e) return true; if(d>e) return false; return h<2; }
    return false;
  }
  function endMsFromCT(Y,M,D,H,Min){
    var off = isDST(Y,M,D,H) ? '-05:00' : '-06:00';
    return Date.parse(Y+'-'+pad(M)+'-'+pad(D)+'T'+pad(H)+':'+pad(Min)+':00'+off);
  }
  function parseDeadline(){
    var U=qsParam('gh_until'), D=qsParam('gh_until_date'), T=qsParam('gh_until_time');
    var Y,M,Da,H=23,Mi=59;
    if(U){
      var m=/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2})(?::?(\d{2}))?)?$/.exec(U);
      if(!m) return null; Y=+m[1];M=+m[2];Da=+m[3]; if(m[4]!=null){H=+m[4];Mi=+(m[5]||0);}
    }else if(D){
      var d=/^(\d{4})-(\d{2})-(\d{2})$/.exec(D); if(!d) return null; Y=+d[1];M=+d[2];Da=+d[3];
      if(T){ var t=/^(\d{1,2}):(\d{2})$/.exec(T); if(!t) return null; H=+t[1];Mi=+t[2]; }
    }else return null;
    var end=endMsFromCT(Y,M,Da,H,Mi);
    return isFinite(end)?end:null;
  }

  // ---------- brand styles (once) ----------
  function injectCSS(){
    if(document.getElementById('gh-countdown-css')) return;
    var css=document.createElement('style'); css.id='gh-countdown-css';
    css.textContent = `
      /* Banner countdown */
      #gh-countdown-wrap{display:grid;gap:1.6rem;align-items:center;justify-items:center}
      #gh-countdown-grid{display:flex;gap:1.6rem;justify-content:center;align-items:flex-end;flex-wrap:wrap}
      #gh-countdown-grid .cell{display:grid;justify-items:center}
      #gh-countdown-grid .num{color:#fff;font-weight:800;line-height:1;font-size:clamp(28px,6vw,64px);letter-spacing:.02em}
      #gh-countdown-grid .lab{color:rgba(255,255,255,.9);font-weight:700;font-size:10px;letter-spacing:.18em;text-transform:uppercase;margin-top:.25rem}
      .gh-countdown-cta{margin-top:.25rem}
      .gh-countdown-cta .gh-btn{
        background: var(--gh-color-gold,#c6a23a);
        color:#fff;
        border: none;
        border-radius: 0;
        padding: var(--buttons-padding-block,12px) var(--buttons-padding-inline,18px);
        font-weight: 800;
        cursor: pointer;
      }
      .gh-countdown-cta .gh-btn:hover{filter:brightness(.95)}

      /* Popup */
      #gh-popdown{position:fixed;left:0;right:0;bottom:16px;display:none;justify-content:center;z-index:2147483600;pointer-events:none}
      #gh-popdown .card{
        pointer-events:auto; background:#1f4a35; color:#fff; border-radius:16px;
        box-shadow:0 20px 50px rgba(0,0,0,.22), 0 6px 18px rgba(0,0,0,.18);
        padding:16px 18px; max-width:1180px; width:calc(100% - 32px);
        display:grid; grid-template-columns:auto 1fr auto; align-items:center; column-gap:1.6rem; row-gap:.75rem;
        position:relative;
      }
      #gh-popdown .label{font-weight:800; letter-spacing:.18em; text-transform:uppercase; font-size:12px; opacity:.95}
      #gh-popdown #gh-pop-grid{display:flex; gap:1.6rem; align-items:flex-end; flex-wrap:wrap; justify-content:center}
      #gh-popdown .cell{display:grid; justify-items:center}
      #gh-popdown .num{color:#fff; font-weight:800; line-height:1; font-size:clamp(22px,6vw,44px)}
      #gh-popdown .lab{color:rgba(255,255,255,.9);font-weight:700;font-size:10px;letter-spacing:.18em;text-transform:uppercase;margin-top:.25rem}
      #gh-popdown .cta .btn{
        background: var(--gh-color-gold,#c6a23a); color:#fff; border:0; border-radius:0;
        padding: var(--buttons-padding-block,12px) var(--buttons-padding-inline,18px);
        font-weight:800; cursor:pointer;
      }
      #gh-popdown .close{
        background:transparent; border:0; color:#fff; font-size:20px; line-height:1; cursor:pointer; opacity:.9; margin-left:.75rem;
      }

      /* Mobile layout: label centered on top, X in top-right */
      @media (max-width: 720px){
        #gh-popdown .card{grid-template-columns: 1fr; padding: 18px 18px 16px}
        #gh-popdown .label{justify-self:center; font-size:11px}
        #gh-popdown #gh-pop-grid{justify-content:center}
        #gh-popdown .cta{justify-self:center}
        #gh-popdown .close{position:absolute; top:10px; right:12px; margin:0}
      }
    `;
    document.head.appendChild(css);
  }

  // ---------- 1) Replace the “24 Hours” bar with big-digit countdown + CTA ----------
  function mountBarCountdown(endMs){
    var bar = document.getElementById('gh-offer-bar') || document.querySelector('.gh--bar h5');
    if(!bar) return null;
    if (bar.dataset.ghBound === '1') return document.getElementById('gh-countdown-wrap');
    bar.dataset.ghBound = '1';

    var name = qsParam('gh_name') || 'Influencer';
    bar.innerHTML = `
      <div id="gh-countdown-wrap" aria-live="polite" aria-atomic="true">
        <div id="gh-countdown-grid">
          <div class="cell"><div class="num" id="gh-cd-d">0</div><div class="lab" id="gh-lab-d">DAYS</div></div>
          <div class="cell"><div class="num" id="gh-cd-h">00</div><div class="lab" id="gh-lab-h">HOURS</div></div>
          <div class="cell"><div class="num" id="gh-cd-m">00</div><div class="lab" id="gh-lab-m">MINUTES</div></div>
          <div class="cell"><div class="num" id="gh-cd-s">00</div><div class="lab" id="gh-lab-s">SECONDS</div></div>
        </div>
        <div class="gh-countdown-cta">
          <button type="button" class="gh-btn" id="gh-countdown-cta">Shop ${name}'s Picks</button>
        </div>
      </div>`;

    // CTA → scroll to products
    var cta = document.getElementById('gh-countdown-cta');
    if(cta){
      cta.addEventListener('click', function(){
        var target = document.querySelector('.product-slider') || document.getElementById('gh-products');
        if(target && target.scrollIntoView) target.scrollIntoView({behavior:'smooth',block:'start'});
        else location.hash = '#gh-products';
      });
    }

    // ticking + labels
    var dE=bar.querySelector('#gh-cd-d'), hE=bar.querySelector('#gh-cd-h'),
        mE=bar.querySelector('#gh-cd-m'), sE=bar.querySelector('#gh-cd-s');
    var ld=bar.querySelector('#gh-lab-d'), lh=bar.querySelector('#gh-lab-h'),
        lm=bar.querySelector('#gh-lab-m'), ls=bar.querySelector('#gh-lab-s');

    function setUnit(lbl, n, singular, plural){ lbl.textContent = (n===1?singular:plural).toUpperCase(); }
    function tick(){
      var left=endMs - Date.now();
      if(left<=0){ dE.textContent='0'; hE.textContent='00'; mE.textContent='00'; sE.textContent='00';
        setUnit(ld,0,'day','days'); setUnit(lh,0,'hour','hours'); setUnit(lm,0,'minute','minutes'); setUnit(ls,0,'second','seconds');
        clearInterval(iv); return;
      }
      var s=Math.floor(left/1000), d=Math.floor(s/86400),
          h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60), ss=s%60;
      dE.textContent=d; hE.textContent=pad(h); mE.textContent=pad(m); sE.textContent=pad(ss);
      setUnit(ld,d,'day','days'); setUnit(lh,h,'hour','hours'); setUnit(lm,m,'minute','minutes'); setUnit(ls,ss,'second','seconds');
    }
    tick(); var iv=setInterval(tick,1000);

    return document.getElementById('gh-countdown-wrap');
  }

  // ---------- 2) Scroll-only popup (reveals when banner is not visible) ----------
  function mountScrollPopup(endMs, heroAnchor){
    var host=document.createElement('div');
    host.id='gh-popdown';
    host.innerHTML =
      '<div class="card" aria-label="Limited-time offer">'+
        '<div class="label">Offer ends in</div>'+
        '<div id="gh-pop-grid">'+
          '<div class="cell"><div class="num" id="p-d">0</div><div class="lab" id="pl-d">DAYS</div></div>'+
          '<div class="cell"><div class="num" id="p-h">00</div><div class="lab" id="pl-h">HOURS</div></div>'+
          '<div class="cell"><div class="num" id="p-m">00</div><div class="lab" id="pl-m">MINUTES</div></div>'+
          '<div class="cell"><div class="num" id="p-s">00</div><div class="lab" id="pl-s">SECONDS</div></div>'+
        '</div>'+
        '<div class="cta"><button class="btn" id="pop-cta" type="button">Shop Picks</button><button class="close" id="pop-x" type="button" aria-label="Close">×</button></div>'+
      '</div>';
    document.body.appendChild(host);

    // CTA + close
    document.getElementById('pop-cta').addEventListener('click', function(){
      var target=document.querySelector('.product-slider')||document.getElementById('gh-products');
      if(target && target.scrollIntoView) target.scrollIntoView({behavior:'smooth',block:'start'});
      else location.hash='#gh-products';
    });
    document.getElementById('pop-x').addEventListener('click', function(){ host.remove(); });

    // ticking + labels
    var dE=host.querySelector('#p-d'), hE=host.querySelector('#p-h'),
        mE=host.querySelector('#p-m'), sE=host.querySelector('#p-s');
    var ld=host.querySelector('#pl-d'), lh=host.querySelector('#pl-h'),
        lm=host.querySelector('#pl-m'), ls=host.querySelector('#pl-s');
    function setUnit(lbl, n, singular, plural){ lbl.textContent = (n===1?singular:plural).toUpperCase(); }
    function fmtTick(){
      var left=endMs - Date.now();
      if(left<=0){ dE.textContent='0'; hE.textContent='00'; mE.textContent='00'; sE.textContent='00';
        setUnit(ld,0,'day','days'); setUnit(lh,0,'hour','hours'); setUnit(lm,0,'minute','minutes'); setUnit(ls,0,'second','seconds');
        clearInterval(iv); return;
      }
      var s=Math.floor(left/1000), d=Math.floor(s/86400),
          h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60), ss=s%60;
      dE.textContent=d; hE.textContent=pad(h); mE.textContent=pad(m); sE.textContent=pad(ss);
      setUnit(ld,d,'day','days'); setUnit(lh,h,'hour','hours'); setUnit(lm,m,'minute','minutes'); setUnit(ls,ss,'second','seconds');
    }
    fmtTick(); var iv=setInterval(fmtTick,1000);

    // reveal only when banner is NOT visible
    function attachObserver(anchor){
      if(!anchor){ host.style.display='none'; return; }
      var io=new IntersectionObserver(function(entries){
        var e=entries[0];
        // show when the banner countdown is less than ~5% visible
        if(e && e.isIntersecting && e.intersectionRatio>0.05){ host.style.display='none'; }
        else { host.style.display='flex'; }
      },{threshold:[0,0.05,0.1,1]});
      io.observe(anchor);
    }
    attachObserver(heroAnchor || document.getElementById('gh-countdown-wrap') || document.querySelector('.gh--header'));
  }

  // ---------- Boot ----------
  var end = parseDeadline(); if(!end) return;
  injectCSS();

  ready(function(){
    // Build banner timer (and grab its node so popup can watch it)
    var heroNode = mountBarCountdown(end);

    // Build popup & tie its visibility to the banner
    mountScrollPopup(end, heroNode);
  });
})();
