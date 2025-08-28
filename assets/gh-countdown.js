/* GH Popup Countdown — Central Time (DST-aware), activates only when gh_until params exist */
(function(){
  // --- helpers (ES5-safe) ---
  function ready(fn){ if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn,{once:true});} else { fn(); } }
  function getParam(qs, name){ return (qs.get(name) || qs.get('amp;'+name) || '').trim(); }
  function pad(n){ return ('0'+n).slice(-2); }

  // --- read URL params ---
  var qs = new URLSearchParams(location.search || '');
  var P = {
    u: getParam(qs,'gh_until'),          // "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM" (Central Time)
    d: getParam(qs,'gh_until_date'),     // "YYYY-MM-DD"
    t: getParam(qs,'gh_until_time'),     // "HH:MM"
    code: getParam(qs,'gh_code')         // optional
  };
  if(!P.u && !P.d && !P.t){ return; }    // no deadline => do nothing

  // --- parse CT input into components ---
  function parseCT(){
    var Y,M,D,H=23,Min=59;
    if(P.u){
      var m=/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2})(?::?(\d{2}))?)?$/.exec(P.u);
      if(!m) return null;
      Y=+m[1]; M=+m[2]; D=+m[3];
      if(m[4]!=null){ H=+m[4]; Min=+(m[5]||0); }
      return {Y:Y,M:M,D:D,H:H,Min:Min};
    }else if(P.d){
      var md=/^(\d{4})-(\d{2})-(\d{2})$/.exec(P.d);
      if(!md) return null;
      Y=+md[1]; M=+md[2]; D=+md[3];
      if(P.t){
        var mt=/^(\d{1,2}):(\d{2})$/.exec(P.t); if(!mt) return null;
        H=+mt[1]; Min=+mt[2];
      }
      return {Y:Y,M:M,D:D,H:H,Min:Min};
    }
    return null;
  }

  // --- US Central Time DST helpers ---
  function secondSundayInMarch(y){ var d=new Date(Date.UTC(y,2,1)); return 1+((7-d.getUTCDay())%7)+7; }
  function firstSundayInNovember(y){ var d=new Date(Date.UTC(y,10,1)); return 1+((7-d.getUTCDay())%7); }
  function isDST(y,m,d,h){
    // m is 1-12
    if (m<3||m>11) return false;
    if (m>3&&m<11) return true;
    if (m===3){ var s=secondSundayInMarch(y); if (d<s) return false; if (d>s) return true; return h>=2; }
    if (m===11){ var e=firstSundayInNovember(y); if (d<e) return true; if (d>e) return false; return h<2; }
    return false;
  }

  // --- CT -> UTC milliseconds using DST offset ---
  function endMsFromCT(parts){
    var off = isDST(parts.Y, parts.M, parts.D, parts.H) ? '-05:00' : '-06:00';
    return Date.parse(parts.Y+'-'+pad(parts.M)+'-'+pad(parts.D)+'T'+pad(parts.H)+':'+pad(parts.Min)+':00'+off);
  }

  // --- format remaining time ---
  function fmtLeft(ms){
    var s=Math.floor(ms/1000), d=Math.floor(s/86400),
        h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60), ss=s%60;
    return d>0 ? (d+'d '+pad(h)+'h '+pad(m)+'m '+pad(ss)+'s')
               : (pad(h)+':'+pad(m)+':'+pad(ss));
  }

  var ct = parseCT();
  if(!ct) return;
  var END_MS = endMsFromCT(ct);
  if(!(isFinite(END_MS) && END_MS>0)) return;

  ready(function(){
    // styles once
    if(!document.getElementById('gh-popdown-css')){
      var css = document.createElement('style');
      css.id='gh-popdown-css';
      css.appendChild(document.createTextNode(
        '#gh-popdown{position:fixed;left:0;right:0;bottom:16px;display:flex;justify-content:center;z-index:2147483600;pointer-events:none}'+
        '#gh-popdown .card{pointer-events:auto;display:flex;gap:12px;align-items:center;background:#1f4a35;color:#fff;padding:12px 14px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:840px;width:calc(100% - 24px);}'+
        '#gh-popdown .msg{flex:1;line-height:1.25;font-weight:600;font-size:14px}'+
        '#gh-popdown .msg b{font-weight:800}'+
        '#gh-popdown .btn{background:#d7dad3;color:#1f4a35;border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}'+
        '#gh-popdown .close{margin-left:4px;background:transparent;border:0;color:#fff;font-size:20px;line-height:1;cursor:pointer;opacity:.9}'+
        '@media (max-width:480px){#gh-popdown .msg{font-size:13px}#gh-popdown .btn{padding:9px 12px}}'
      ));
      document.head.appendChild(css);
    }

    // popup DOM
    var host = document.createElement('div');
    host.id='gh-popdown';
    host.setAttribute('role','dialog');
    host.setAttribute('aria-live','polite');
    host.innerHTML =
      '<div class="card" aria-label="Limited-time offer">'+
        '<div class="msg">Ends in <b id="gh-popdown-timer">--:--:--</b> CT'+(P.code ? ' • Use code <b>'+P.code+'</b>' : '')+'</div>'+
        '<button class="btn" id="gh-popdown-cta" type="button">Shop Picks</button>'+
        '<button class="close" id="gh-popdown-close" type="button" aria-label="Close">×</button>'+
      '</div>';
    document.body.appendChild(host);

    // CTA → scroll to products
    var cta = document.getElementById('gh-popdown-cta');
    cta.addEventListener('click', function(){
      var target = document.querySelector('.product-slider') || document.getElementById('gh-products');
      if(target && target.scrollIntoView) target.scrollIntoView({behavior:'smooth', block:'start'});
      else window.location.hash = '#gh-products';
    });

    // Dismiss
    document.getElementById('gh-popdown-close').addEventListener('click', function(){
      if(host && host.parentNode) host.parentNode.removeChild(host);
    });

    // ticking
    var timerEl = document.getElementById('gh-popdown-timer');
    function tick(){
      var left = END_MS - Date.now();
      if(left <= 0){
        timerEl.textContent = '00:00:00';
        host.querySelector('.msg').innerHTML = 'Offer <b>expired</b>.';
        clearInterval(iv);
        return;
      }
      timerEl.textContent = fmtLeft(left);
    }
    tick();
    var iv = setInterval(tick, 1000);
  });
})();
