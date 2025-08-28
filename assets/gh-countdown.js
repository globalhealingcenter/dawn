/* GH Countdown — bar replacement + scroll popup (Central Time)
Pages: /pages/influencer, /pages/influencer-test
Params:
gh_until=YYYY-MM-DD[THH:MM]  OR  gh_until_date=YYYY-MM-DD & gh_until_time=HH:MM
gh_name=Name    (for CTA “Shop Name’s Picks”)
gh_code=CODE    (optional, shown in popup)
*/
(function(){
"use strict";

/* ---------- Page scope ---------- */

/* PROD scope (leave commented until launch)
var PATH_OK = /\/pages\/(influencer|influencer-test)(?:\/|$)/i.test(location.pathname);
if (!PATH_OK) return;
*/

/* TEST-ONLY scope (active now) */
var PATH_OK = /\/pages\/influencer-test(?:\/|$)/i.test(location.pathname);
if (!PATH_OK) return;


// ---------- tiny helpers ----------
function ready(fn){ if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",fn,{once:true});} else { fn(); } }
function qsp(name){ var q=new URLSearchParams(location.search||""); return (q.get(name)||q.get("amp;"+name)||"").trim(); }
function pad(n){ return ("0"+n).slice(-2); }

// US Central Time DST helpers
function secondSundayInMarch(y){ var d=new Date(Date.UTC(y,2,1)); return 1+((7-d.getUTCDay())%7)+7; }
function firstSundayInNovember(y){ var d=new Date(Date.UTC(y,10,1)); return 1+((7-d.getUTCDay())%7); }
function isDST(y,m,d,h){
if(m<3||m>11) return false;
if(m>3&&m<11) return true;
if(m===3){ var s=secondSundayInMarch(y); return d>s || (d===s && h>=2); }
if(m===11){ var e=firstSundayInNovember(y); return d<e || (d===e && h<2); }
return false;
}

function endMsFromCT(Y,M,D,H,Min){
var off = isDST(Y,M,D,H) ? "-05:00" : "-06:00";
return Date.parse(Y+"-"+pad(M)+"-"+pad(D)+"T"+pad(H)+":"+pad(Min)+":00"+off);
}

function parseDeadline(){
var U=qsp("gh_until"), D=qsp("gh_until_date"), T=qsp("gh_until_time");
var Y,M,Da,H=23,Mi=59, m;
if (U){
m=/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2})(?::?(\d{2}))?)?$/.exec(U);
if(!m) return null;
Y=+m[1]; M=+m[2]; Da=+m[3];
if(m[4]!=null){ H=+m[4]; Mi=+(m[5]||0); }
} else if (D){
m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(D);
if(!m) return null;
Y=+m[1]; M=+m[2]; Da=+m[3];
if (T){
var t=/^(\d{1,2}):(\d{2})$/.exec(T);
if(!t) return null;
H=+t[1]; Mi=+t[2];
}
} else {
return null;
}
var end=endMsFromCT(Y,M,Da,H,Mi);
return isFinite(end) ? end : null;
}

var END = parseDeadline();
if(!END){ return; } // no params → leave the page as-is

// ---------- CSS (once) ----------
if(!document.getElementById("gh-countdown-css")){
var css=document.createElement("style");
css.id="gh-countdown-css";
css.textContent = `
/* Bar replacement (big digits) */
#gh-countdown-wrap{display:grid;gap:.5rem;align-items:center;justify-items:center}
#gh-countdown-grid{display:flex;gap:2.25rem;justify-content:center;align-items:flex-end;flex-wrap:wrap}
#gh-countdown-grid .cell{display:grid;justify-items:center}
#gh-countdown-grid .num{color:#fff;font-weight:800;line-height:1;font-size:clamp(28px,6vw,64px);letter-spacing:.02em}
#gh-countdown-grid .lab{color:rgba(255,255,255,.9);font-weight:700;font-size:10px;letter-spacing:.18em;text-transform:uppercase;margin-top:.25rem}
.gh-countdown-cta{margin-top:.25rem}
.gh-countdown-cta .gh-btn{background:#d7dad3;color:#1f4a35;border:0;border-radius:999px;font-weight:800;padding:.55rem 1.1rem;cursor:pointer}
.gh-countdown-cta .gh-btn:hover{filter:brightness(.95)}
@media (max-width:480px){ #gh-countdown-grid{gap:1.25rem} }

/* Scroll popup (appears after user scrolls) */
#gh-popdown{position:fixed;left:0;right:0;bottom:16px;display:none;justify-content:center;z-index:2147483600;pointer-events:none}
#gh-popdown .card{pointer-events:auto;display:flex;gap:12px;align-items:center;background:#1f4a35;color:#fff;padding:12px 14px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:840px;width:calc(100% - 24px)}
#gh-popdown .msg{flex:1;line-height:1.25;font-weight:700;font-size:14px}
#gh-popdown .msg b{font-weight:900}
#gh-popdown .btn{background:#d7dad3;color:#1f4a35;border:0;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer}
#gh-popdown .close{margin-left:4px;background:transparent;border:0;color:#fff;font-size:20px;line-height:1;cursor:pointer;opacity:.9}
@media (max-width:480px){ #gh-popdown .msg{font-size:13px} #gh-popdown .btn{padding:9px 12px} }
`;
document.head.appendChild(css);
}

// ---------- Bar replacement ----------
function buildBar(name){
var wrap=document.createElement("div");
wrap.id="gh-countdown-wrap";
wrap.setAttribute("aria-live","polite");
wrap.setAttribute("aria-atomic","true");

var grid=document.createElement("div");
grid.id="gh-countdown-grid";

function cell(id,label){
var c=document.createElement("div"); c.className="cell";
var n=document.createElement("div"); n.className="num"; n.id=id; n.textContent="00";
var l=document.createElement("div"); l.className="lab"; l.textContent=label;
c.appendChild(n); c.appendChild(l); return c;
}
grid.appendChild(cell("gh-cd-d","DAYS"));
grid.appendChild(cell("gh-cd-h","HOURS"));
grid.appendChild(cell("gh-cd-m","MINUTES"));
grid.appendChild(cell("gh-cd-s","SECONDS"));

var cta=document.createElement("div");
cta.className="gh-countdown-cta";
cta.innerHTML = '<button type="button" class="gh-btn" id="gh-countdown-cta">Shop '
    + (name||"Influencer") + '\'s Picks</button>';

wrap.appendChild(grid);
wrap.appendChild(cta);
return wrap;
}

function startDigits(endMs){
var dE=document.getElementById("gh-cd-d"),
hE=document.getElementById("gh-cd-h"),
mE=document.getElementById("gh-cd-m"),
sE=document.getElementById("gh-cd-s");

function tick(){
var left=endMs - Date.now();
if(left<=0){
dE.textContent="0"; hE.textContent="00"; mE.textContent="00"; sE.textContent="00";
clearInterval(iv); return;
}
var s=Math.floor(left/1000),
d=Math.floor(s/86400),
h=Math.floor((s%86400)/3600),
m=Math.floor((s%3600)/60),
ss=s%60;
dE.textContent=d;
hE.textContent=pad(h);
mE.textContent=pad(m);
sE.textContent=pad(ss);
}
tick();
var iv=setInterval(tick,1000);
}

function findOrCreateBar(){
var el = document.getElementById("gh-offer-bar") || document.querySelector(".gh--bar h5");
if (el) return el;
// Inject our own bar just beneath the hero if this template is missing one
var header = document.querySelector(".gh--header") || document.body.firstElementChild || document.body;
var sec = document.createElement("section");
sec.className = "gh--bar bg-green py2";
sec.innerHTML = '<div class="page-width center"><h5 class="mb0 color-white" id="gh-offer-bar"></h5></div>';
header.parentNode.insertBefore(sec, header.nextSibling);
return sec.querySelector("#gh-offer-bar");
}

function mountBar(){
var bar = findOrCreateBar();
if (!bar || bar.dataset.ghBound==="1") return;

bar.dataset.ghBound = "1";
bar.replaceChildren( buildBar(qsp("gh_name")) );

var btn = document.getElementById("gh-countdown-cta");
if (btn){
btn.addEventListener("click", function(){
var t = document.querySelector(".product-slider") || document.getElementById("gh-products");
if(t && t.scrollIntoView) t.scrollIntoView({behavior:"smooth", block:"start"});
else location.hash = "#gh-products";
});
}
startDigits(END);
}

// Initial + resilient re-mount
ready(function(){
// Try several times in case theme paints late
var tries=0;(function again(){
var bar=document.getElementById("gh-offer-bar")||document.querySelector(".gh--bar h5");
if(bar){ mountBar(); return; }
if(++tries<25){ setTimeout(again,120); } else { mountBar(); }
})();
});
var mo = new MutationObserver(function(){
var bar=document.getElementById("gh-offer-bar")||document.querySelector(".gh--bar h5");
if(bar && bar.dataset.ghBound!=="1"){ mountBar(); }
});
mo.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener("shopify:section:load", mountBar);

// ---------- Popup: show ONLY after user scrolls ----------
ready(function(){
var host=document.createElement("div");
host.id="gh-popdown";
host.innerHTML =
'<div class="card" aria-label="Limited-time offer">'
    + '<div class="msg">Ends in <b id="gh-popdown-timer">--:--:--</b> CT'
        + (qsp("gh_code") ? ' • Use code <b>'+qsp("gh_code")+'</b>' : '')
        + '</div>'
    + '<button class="btn" id="gh-popdown-cta" type="button">Shop Picks</button>'
    + '<button class="close" id="gh-popdown-close" type="button" aria-label="Close">×</button>'
    + '</div>';
document.body.appendChild(host);

var shown=false;
function reveal(){ if(shown) return; shown=true; host.style.display="flex"; window.removeEventListener("scroll", onScroll, {passive:true}); }
function onScroll(){ if(window.scrollY > window.innerHeight*0.25) reveal(); }
window.addEventListener("scroll", onScroll, {passive:true});

document.getElementById("gh-popdown-cta").addEventListener("click", function(){
var t=document.querySelector(".product-slider")||document.getElementById("gh-products");
if(t && t.scrollIntoView) t.scrollIntoView({behavior:"smooth", block:"start"}); else location.hash="#gh-products";
});
document.getElementById("gh-popdown-close").addEventListener("click", function(){ host.remove(); });

var el=document.getElementById("gh-popdown-timer");
function fmt(ms){
var s=Math.floor(ms/1000), d=Math.floor(s/86400),
h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60), ss=s%60;
return d>0 ? (d+"d "+pad(h)+"h "+pad(m)+"m "+pad(ss)+"s") : (pad(h)+":"+pad(m)+":"+pad(ss));
}
function tick(){
var left=END - Date.now();
if(left<=0){ el.textContent="00:00:00"; host.querySelector(".msg").innerHTML="Offer <b>expired</b>."; clearInterval(iv); return; }
el.textContent = fmt(left);
}
tick(); var iv=setInterval(tick,1000);
});
})();
