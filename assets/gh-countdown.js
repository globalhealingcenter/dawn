/* =========================================================
   GH Countdown (banner + smart pop-bar)
   - Central Time (DST aware)
   - Pop bar shows only when banner leaves the viewport
   - CTA: var(--gh-color-gold) background, white text, no radius
   - Singular labels (1 DAY, 1 HOUR, …)
   - Includes debug + safe fallback deadline for testing
   ========================================================= */

(function(){
  // Expose a tiny “am I loaded?” flag
  window.__GH_COUNTDOWN__ = 'v1.3.0-test';

  try {
    /* ---------- Page scope ---------- */
    // PROD (enable when launching):
    // var PATH_OK = /\/pages\/(influencer|influencer-test)(?:\/|$)/i.test(location.pathname);
    // if (!PATH_OK) return;

    // TEST ONLY (active now):
    var PATH_OK = /\/pages\/influencer-test(?:\/|$)/i.test(location.pathname);
    if (!PATH_OK) return;

    /* ---------- config ---------- */
    // During testing, show a 24h countdown if URL has no deadline params.
    var USE_DEFAULT_WHEN_MISSING = true;

    /* ---------- helpers ---------- */
    function ready(fn){ if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn,{once:true});} else { fn(); } }
    function qsParam(name){ var q=new URLSearchParams(location.search||''); return (q.get(name)||q.get('amp;'+name)||'').trim(); }
    function pad(n){ return ('0'+n).slice(-2); }

    // Central Time DST helpers
    function secondSundayInMarch(y){ var d=new Date(Date.UTC(y,2,1)); return 1+((7-d.getUTCDay())%7)+7; }
    function firstSundayInNovember(y){ var d=new Date(Date.UTC(y,10,1)); return 1+((7-d.getUTCDay())%7); }
    function isDST(y,m,d,h){
      if(m<3||m>11) return false;
      if(m>3&&m<11) return true;
      if(m===3){ var s=secondSundayInMarch(y); if(d<s) return false; if(d>s) return true; return h>=2; }
      if(m===11){ var e=firstSundayInNovember(y); if(d<e) return true; if(d>e) return false; return h<2; }
      return false;
    }
    function endMsFromCT(Y,M,D,H,Min){ var off=isDST(Y,M,D,H)?'-05:00':'-06:00'; return Date.parse(Y+'-'+pad(M)+'-'+pad(D)+'T'+pad(H)+':'+pad(Min)+':00'+off); }

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
      var end=endMsFromCT(Y,M,Da,H,Mi); return isFinite(end)?end:null;
    }

    function parseDeadlineOrDefault(){
      var end = parseDeadline();
      if(!end && USE_DEFAULT_WHEN_MISSING){
        end = Date.now() + 24*60*60*1000; // 24 hours from now (for testing only)
        console.warn('[GH] No gh_until params found — using 24h fallback for testing');
      }
      return end;
    }

    /* ---------- styles ---------- */
    function injectCSS(){
      if(document.getElementById('gh-countdown-css')) return;
      var css=document.createElement('style'); css.id='gh-countdown-css';
      css.textContent = `
        /* Banner */
        #gh-countdown-wrap{display:grid;gap:.6rem;align-items:center;justify-items:center}
        #gh-countdown-grid{display:flex;gap:2.25rem;justify-content:center;align-items:flex-end;flex-wrap:wrap}
        #gh-countdown-grid .cell{display:grid;justify-items:center}
        #gh-countdown-grid .num{color:#fff;font-weight:800;line-height:1;font-size:clamp(28px,6vw,64px);letter-spacing:.02em}
        #gh-countdown-grid .lab{color:rgba(255,255,255,.9);font-weight:700;font-size:10px;letter-spacing:.18em;text-transform:uppercase;margin-top:.25rem}
        .gh-countdown-cta{margin-top:.25rem}
        .gh-countdown-cta .gh-btn{
          background: var(--gh-color-gold, #b88a2b);
          color: #fff;
          border: var(--buttons-border-width, 0px) solid transparent;
          border-radius: 0;
          padding: calc(12px - var(--buttons-border-width, 0px)) calc(18px - var(--buttons-border-width, 0px));
          font-weight:800; cursor:pointer
        }
        .gh-countdown-cta .gh-btn:hover{filter:brightness(.97)}
        @media (max-width:480px){ #gh-countdown-grid{gap:1.25rem} }

        /* Pop bar */
        #gh-popbar{position:fixed;left:0;right:0;bottom:16px;display:none;justify-content:center;z-index:2147483600;pointer-events:none}
        #gh-popbar.is-open{display:flex}
        #gh-popbar .card{pointer-events:auto;display:flex;align-items:center;gap:18px;background:#1f4a35;color:#fff;
          padding:12px 16px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:980px;width:calc(100% - 24px)}
        #gh-popbar .digits{display:flex;gap:1.4rem;align-items:flex-end;flex-wrap:nowrap}
        #gh-popbar .cell{display:grid;justify-items:center}
        #gh-popbar .num{font-weight:800;line-height:1;font-size:clamp(22px,4.2vw,40px)}
        #gh-popbar .lab{opacity:.9;font-weight:700;font-size:9px;letter-spacing:.18em;text-transform:uppercase;margin-top:.25rem}
        #gh-popbar .spacer{flex:1}
        #gh-popbar .btn{
          background: var(--gh-color-gold, #b88a2b);
          color: #fff;
          border: var(--buttons-border-width, 0px) solid transparent;
          border-radius: 0;
          padding: calc(10px - var(--buttons-border-width, 0px)) calc(14px - var(--buttons-border-width, 0px));
          font-weight:800; cursor:pointer; white-space:nowrap
        }
        #gh-popbar .close{margin-left:6px;background:transparent;border:0;color:#fff;font-size:20px;line-height:1;cursor:pointer;opacity:.9}
        @media (max-width:640px){
          #gh-popbar .card{flex-direction:column;gap:10px}
          #gh-popbar .spacer{display:none}
          #gh-popbar .digits{gap:1.1rem}
        }
      `;
      document.head.appendChild(css);
    }

    /* ---------- banner ---------- */
    function mountBanner(endMs){
      var bar = document.getElementById('gh-offer-bar') || document.querySelector('.gh--bar h5');
      if(!bar){
        var header = document.querySelector('.gh--header') || document.querySelector('main') || document.body;
        var sec = document.createElement('section');
        sec.className = 'gh--bar bg-green py2';
        sec.innerHTML = '<div class="page-width center"><h5 class="mb0 color-white" id="gh-offer-bar"></h5></div>';
        header.parentNode.insertBefore(sec, header.nextSibling);
        bar = sec.querySelector('#gh-offer-bar');
      }
      if (bar.dataset.ghBound === '1') return;
      bar.dataset.ghBound = '1';

      var name = qsParam('gh_name') || 'Influencer';
      bar.innerHTML = `
        <div id="gh-countdown-wrap" aria-live="polite" aria-atomic="true">
          <div id="gh-countdown-grid">
            <div class="cell"><div class="num" id="gh-b-d">0</div><div class="lab" id="gh-b-ld">DAYS</div></div>
            <div class="cell"><div class="num" id="gh-b-h">00</div><div class="lab" id="gh-b-lh">HOURS</div></div>
            <div class="cell"><div class="num" id="gh-b-m">00</div><div class="lab" id="gh-b-lm">MINUTES</div></div>
            <div class="cell"><div class="num" id="gh-b-s">00</div><div class="lab" id="gh-b-ls">SECONDS</div></div>
          </div>
          <div class="gh-countdown-cta">
            <button type="button" class="gh-btn" id="gh-banner-cta">Shop ${name}'s Picks</button>
          </div>
        </div>`;
      var cta = document.getElementById('gh-banner-cta');
      if(cta){
        cta.addEventListener('click', function(){
          var t=document.querySelector('.product-slider')||document.getElementById('gh-products');
          if(t&&t.scrollIntoView) t.scrollIntoView({behavior:'smooth',block:'start'}); else location.hash='#gh-products';
        });
      }
    }

    /* ---------- pop bar ---------- */
    function buildPopBar(){
      var host=document.createElement('div');
      host.id='gh-popbar';
      var name = qsParam('gh_name') || 'Influencer';
      host.innerHTML =
        '<div class="card" aria-label="Limited-time offer">'+
          '<div class="digits" aria-hidden="false">'+
            '<div class="cell"><div class="num" id="gh-p-d">0</div><div class="lab" id="gh-p-ld">DAYS</div></div>'+
            '<div class="cell"><div class="num" id="gh-p-h">00</div><div class="lab" id="gh-p-lh">HOURS</div></div>'+
            '<div class="cell"><div class="num" id="gh-p-m">00</div><div class="lab" id="gh-p-lm">MINUTES</div></div>'+
            '<div class="cell"><div class="num" id="gh-p-s">00</div><div class="lab" id="gh-p-ls">SECONDS</div></div>'+
          '</div>'+
          '<div class="spacer"></div>'+
          '<div class="actions">'+
            '<button class="btn" id="gh-pop-cta" type="button">Shop '+name+'\'s Picks</button>'+
            '<button class="close" id="gh-pop-close" type="button" aria-label="Close">×</button>'+
          '</div>'+
        '</div>';
      document.body.appendChild(host);

      document.getElementById('gh-pop-cta').addEventListener('click', function(){
        var t=document.querySelector('.product-slider')||document.getElementById('gh-products');
        if(t&&t.scrollIntoView) t.scrollIntoView({behavior:'smooth',block:'start'}); else location.hash='#gh-products';
      });
      document.getElementById('gh-pop-close').addEventListener('click', function(){ host.remove(); });

      return host;
    }

    function wireVisibility(popEl){
      var banner = document.getElementById('gh-countdown-wrap');
      if(!banner){
        function onScroll(){ if(window.scrollY > window.innerHeight*0.25){ popEl.classList.add('is-open'); window.removeEventListener('scroll', onScroll, {passive:true}); } }
        window.addEventListener('scroll', onScroll, {passive:true});
        return;
      }
      var io = new IntersectionObserver(function(entries){
        var e=entries[0]; if(!e) return;
        if(e.isIntersecting && e.intersectionRatio > 0.05){ popEl.classList.remove('is-open'); }
        else{ popEl.classList.add('is-open'); }
      }, {root:null, threshold:[0,0.05,0.1,0.2]});
      io.observe(banner);
    }

    /* ---------- ticker + singular labels ---------- */
    function startTicking(endMs){
      function setDigits(prefix, d,h,m,s){
        var dE=document.getElementById(prefix+'-d'),
            hE=document.getElementById(prefix+'-h'),
            mE=document.getElementById(prefix+'-m'),
            sE=document.getElementById(prefix+'-s');
        if(dE) dE.textContent=d;
        if(hE) hE.textContent=pad(h);
        if(mE) mE.textContent=pad(m);
        if(sE) sE.textContent=pad(s);

        var ld=document.getElementById(prefix+'-ld'),
            lh=document.getElementById(prefix+'-lh'),
            lm=document.getElementById(prefix+'-lm'),
            ls=document.getElementById(prefix+'-ls');
        if(ld) ld.textContent = (d===1 ? 'DAY'    : 'DAYS');
        if(lh) lh.textContent = (h===1 ? 'HOUR'   : 'HOURS');
        if(lm) lm.textContent = (m===1 ? 'MINUTE' : 'MINUTES');
        if(ls) ls.textContent = (s===1 ? 'SECOND' : 'SECONDS');
      }
      function tick(){
        var left=endMs - Date.now();
        if(left<=0){ setDigits('gh-b',0,0,0,0); setDigits('gh-p',0,0,0,0); clearInterval(iv); return; }
        var s=Math.floor(left/1000), d=Math.floor(s/86400),
            h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60), ss=s%60;
        setDigits('gh-b',d,h,m,ss);
        setDigits('gh-p',d,h,m,ss);
      }
      tick();
      var iv=setInterval(tick,1000);
    }

    /* ---------- boot ---------- */
    var END = parseDeadlineOrDefault();
    if(!END){ console.warn('[GH] Countdown: no deadline present and fallback disabled'); return; }

    injectCSS();
    ready(function(){
      mountBanner(END);
      var pop = buildPopBar();
      wireVisibility(pop);
      startTicking(END);
    });

  } catch (err) {
    console.error('[GH] Countdown crashed:', err);
    window.__ghLastError = err;
  }
})();
