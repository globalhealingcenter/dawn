/* gh-countdown.js — influencer page countdown + smart popup (CT)

Accepted URL date formats (Central Time input):
  ?gh_until=2025-08-27                 // 11:59pm default
  ?gh_until=2025-08-27T17:30           // 5:30pm
  ?gh_until_date=2025-08-27&gh_until_time=17:30
  // (Also accepts "YYYY-MM-DD 17:30" for gh_until)

Notes:
- Timezone is converted to CT (DST-aware) and then to an exact UTC timestamp.
- The popdown appears only when the hero/banner countdown is not meaningfully visible.
- To enable on multiple pages, use the “both pages” PATH_OK below.
*/
(function(){
  // ---------- Page scope ----------
  // --- both pages (uncomment when going live on both) ---
  // var PATH_OK = /\/pages\/(influencer|influencer-test)(?:\/|$)/i.test(location.pathname);
  // if (!PATH_OK) return;

  // --- test page only (current) ---
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

      /* Popdown shell (gentle reveal via opacity/translate) */
      #gh-popdown{position:fixed;left:0;right:0;bottom:16px;displa
