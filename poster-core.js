/* Tamil Poster Maker — no AI, no server. Fabric.js 7.4.0 (MIT) draws everything in the browser.
   Rules learned from research: every text line is drawn as ONE run (no letter-spacing, no curved text) so Tamil
   conjuncts stay correct; PDF is a raster page written by hand (jsPDF/pdf-lib cannot shape Tamil). */
(function(){
'use strict';
var $ = function(id){ return document.getElementById(id); };
var F = window.fabric;

/* ---------- fonts ---------- */
var FONTS = [
  ['Baloo Thambi 2','Baloo Thambi (தலைப்பு)'],['Catamaran','Catamaran'],['Hind Madurai','Hind Madurai'],
  ['Mukta Malar','Mukta Malar'],['Anek Tamil','Anek Tamil'],['Noto Sans Tamil','Noto Sans Tamil'],
  ['Noto Serif Tamil','Noto Serif Tamil (பாரம்பரியம்)'],['Tiro Tamil','Tiro Tamil (அழைப்பிதழ்)']
];
var FH='Baloo Thambi 2', FC='Catamaran', FM='Hind Madurai', FS='Noto Serif Tamil', FT='Tiro Tamil', FN='Noto Sans Tamil';
var fontDone = {};
function ensureFont(name){
  if (fontDone[name]) return fontDone[name];
  var loads = [];
  [400,700].forEach(function(w){
    loads.push(document.fonts.load(w+' 48px "'+name+'"','தமிழ் ஸ்ரீ க்ஷ கொ'));
    loads.push(document.fonts.load(w+' 48px "'+name+'"','Ag 0123'));
  });
  fontDone[name] = Promise.all(loads).catch(function(){});
  return fontDone[name];
}
function ensureFonts(list){ return Promise.all(list.map(ensureFont)); }

/* ---------- sizes ---------- */
var SIZES = [
  {id:'story', label:'WhatsApp Status / Reel', w:1080, h:1920, note:'1080×1920 (9:16)'},
  {id:'ig45',  label:'Instagram 4:5',        w:1080, h:1350, note:'1080×1350'},
  {id:'sq',    label:'சதுரம்',                w:1080, h:1080, note:'1080×1080'},
  {id:'yt',    label:'YouTube / Facebook',   w:1280, h:720,  note:'1280×720 (16:9)'},
  {id:'a4',    label:'A4',                   w:1240, h:1754, note:'A4 — 150 dpi (உயர் தரம்: 300 dpi)', pt:[595.28,841.89]},
  {id:'f23',   label:'Flex 2×3 அடி',         w:1200, h:1800, ft:[2,3]},
  {id:'f34',   label:'Flex 3×4.5 அடி',       w:1350, h:2025, ft:[3,4.5]},
  {id:'f46',   label:'Flex 4×6 அடி',         w:1440, h:2160, ft:[4,6]},
  {id:'f58',   label:'Flex 5×8 அடி',         w:1500, h:2400, ft:[5,8]}
];

/* ---------- state ---------- */
var canvas, W = 1080, H = 1350, sizeId = 'ig45', tplId = 'greet', landscape = false;
var footerOn = false, loading = false, hist = [], histIx = -1, histTimer = null;
var PROPS = ['name','isFooter','isSlot'];
var brand = loadBrand();

function loadBrand(){
  try { return JSON.parse(localStorage.getItem('pm_brand')||'{}') || {}; } catch(e){ return {}; }
}
function saveBrand(){ try { localStorage.setItem('pm_brand', JSON.stringify(brand)); } catch(e){} }
function toast(msg, share){
  var t=$('toast'); t.textContent=msg;
  if (share){ var a=document.createElement('a'); a.href='https://wa.me/?text='+encodeURIComponent('Tamil போஸ்டரை இலவசமாக நானே செய்தேன் 👍 நீங்களும் செய்து பாருங்க (Login வேண்டாம்):\nhttps://pdftoolsindia.com/poster-maker?utm_source=whatsapp&utm_medium=share&utm_campaign=poster'); a.target='_blank'; a.rel='noopener'; a.textContent=' · WhatsApp-ல் share'; a.style.cssText='color:#7CFC9A;font-weight:800;text-decoration:none'; t.appendChild(a); }
  t.style.pointerEvents='auto'; t.classList.remove('hide');
  clearTimeout(toast._t); toast._t=setTimeout(function(){ t.classList.add('hide'); },share?7000:2600);
}

/* ---------- drawing helpers ---------- */
function mk(c, w, h){
  var u = Math.min(w,h)/1080;
  var o = { c:c, w:w, h:h, u:u };
  o.add = function(obj){ c.add(obj); return obj; };
  o.grad = function(stops, vertical, x2, y2){
    var co = vertical===false ? {x1:0,y1:0,x2:x2||w,y2:0} : {x1:0,y1:0,x2:0,y2:y2||h};
    return new F.Gradient({type:'linear', coords:co, colorStops:stops.map(function(s,i){ return {offset:s[0], color:s[1]}; })});
  };
  o.bg = function(fill){
    var r = new F.Rect({left:0,top:0,width:w,height:h,fill:fill,selectable:false,evented:false,name:'bg'});
    c.add(r); return r;
  };
  o.rect = function(x,y,rw,rh,fill,extra){
    var r = new F.Rect(Object.assign({left:x,top:y,width:rw,height:rh,fill:fill}, extra||{})); c.add(r); return r;
  };
  o.circ = function(cx,cy,r,fill,extra){
    var k = new F.Circle(Object.assign({left:cx-r,top:cy-r,radius:r,fill:fill}, extra||{})); c.add(k); return k;
  };
  o.path = function(d,cx,cy,fill,extra){
    var p = new F.Path(d, Object.assign({fill:fill,originX:'center',originY:'center',left:cx,top:cy}, extra||{})); c.add(p); return p;
  };
  o.poly = function(pts,cx,cy,fill,extra){
    var p = new F.Polygon(pts, Object.assign({fill:fill,originX:'center',originY:'center',left:cx,top:cy,objectCaching:false}, extra||{})); c.add(p); return p;
  };
  o.star = function(cx,cy,r1,r2,n,fill,extra){
    var pts=[]; for (var i=0;i<n*2;i++){ var a=Math.PI*i/n - Math.PI/2, r=i%2?r2:r1; pts.push({x:Math.cos(a)*r,y:Math.sin(a)*r}); }
    return o.poly(pts,cx,cy,fill,extra);
  };
  o.rays = function(cx,cy,r1,r2,n,fill,extra){
    var d=''; for (var i=0;i<n;i++){
      var a=2*Math.PI*i/n, b=a+Math.PI/n*0.55;
      d+='M '+cx+' '+cy+' L '+(cx+Math.cos(a)*r2)+' '+(cy+Math.sin(a)*r2)+' L '+(cx+Math.cos(b)*r2)+' '+(cy+Math.sin(b)*r2)+' Z ';
    }
    var p = new F.Path(d, Object.assign({fill:fill,selectable:false,evented:false,objectCaching:false}, extra||{}));
    p.set({left:cx-r2, top:cy-r2}); c.add(p); return p;
  };
  o.dots = function(x,y,cols,rows,gap,r,fill,extra){
    var d=''; for (var i=0;i<cols;i++) for (var j=0;j<rows;j++){
      var px=i*gap, py=j*gap; d+='M '+(px-r)+' '+py+' a '+r+' '+r+' 0 1 0 '+(2*r)+' 0 a '+r+' '+r+' 0 1 0 '+(-2*r)+' 0 ';
    }
    var p = new F.Path(d, Object.assign({fill:fill,left:x,top:y,selectable:false,evented:false}, extra||{})); c.add(p); return p;
  };
  o.diya = function(cx,cy,s,body,flame){
    var b = new F.Path('M -50 0 Q -44 42 0 46 Q 44 42 50 0 Z',{fill:body,originX:'center',originY:'center',left:cx,top:cy,scaleX:s,scaleY:s});
    var f = new F.Path('M 0 -6 Q -17 -32 0 -62 Q 17 -32 0 -6 Z',{fill:flame,originX:'center',originY:'center',left:cx,top:cy-48*s,scaleX:s,scaleY:s});
    var g = new F.Circle({radius:34*s,left:cx-34*s,top:cy-82*s,fill:'rgba(255,214,102,.28)',selectable:false,evented:false});
    c.add(g); c.add(b); c.add(f);
  };
  o.slot = function(cx,cy,sw,sh,shape,stroke){
    var base = {left:cx-sw/2,top:cy-sh/2,fill:'rgba(255,255,255,.35)',stroke:stroke||'#ffffff',strokeWidth:6*u,strokeDashArray:[18*u,12*u],isSlot:true,name:'slot'};
    var s = shape==='circle' ? new F.Circle(Object.assign(base,{radius:sw/2}))
          : new F.Rect(Object.assign(base,{width:sw,height:sh,rx:shape==='round'?28*u:0,ry:shape==='round'?28*u:0}));
    s.slotShape = shape; s.slotW=sw; s.slotH=sh; s.slotCx=cx; s.slotCy=cy;
    c.add(s);
    var hint = o.text('படம் இங்கே', {left:cx-sw/2,top:cy-14*u,w:sw,size:34*u,font:FM,color:'#ffffff',align:'center',noSel:true,name:'slotHint',isSlot:true});
    return s;
  };
  /* one Textbox = one line/paragraph, drawn in one run */
  o.text = function(t, op){
    op = op||{};
    var tb = new F.Textbox(t, {
      left: op.left||0, top: op.top||0, width: op.w||w*0.8,
      fontSize: op.size||48*u, fontFamily: op.font||FM, fontWeight: op.bold?700:400,
      fill: op.color||'#222', textAlign: op.align||'center', lineHeight: op.lh||1.28,
      editable:false, name: op.name||'text', isSlot: !!op.isSlot
    });
    if (op.shadow) tb.shadow = new F.Shadow({color:'rgba(0,0,0,.4)',blur:10*u,offsetX:3*u,offsetY:3*u});
    if (op.noSel){ tb.selectable=false; tb.evented=false; }
    c.add(tb); return tb;
  };
  /* stack texts one under another (heights measured after the font is loaded) */
  o.flow = function(y, items, gap){
    var objs=[], k=0.86;
    function lay(scale){
      var cur=y;
      objs.forEach(function(tb,i){
        var it=items[i]; tb.set({fontSize:(it.s||0.05)*w*k*scale,top:cur}); tb.initDimensions();
        cur += tb.height + (it.g!==undefined ? it.g : (gap||0.012))*h;
      });
      return cur;
    }
    items.forEach(function(it){
      var wd=(it.w||0.84)*w;
      objs.push(o.text(it.t,{left:(w-wd)/2,top:y,w:wd,size:(it.s||0.05)*w*k,font:it.f,color:it.c,bold:it.b,align:it.a,shadow:it.sh,lh:it.lh,name:it.n}));
    });
    var end=lay(1), limit=h*0.85;
    for (var n=0;n<6 && end>limit;n++){ end=lay((limit-y)/(end-y)*0.97*(n?0.97:1)); k=k; }
    return end;
  };
  return o;
}

/* ---------- templates ---------- */
function shop(){ return brand.name || 'உங்கள் கடை பெயர்'; }
var TPLS = [
 {id:'greet', label:'வாழ்த்து (பொது)', fonts:[FH,FM], build:function(h){
   var w=h.w, H=h.h, u=h.u;
   h.bg(h.grad([[0,'#6a11cb'],[1,'#ec4899']]));
   h.dots(w*0.06,H*0.04,9,4,w*0.1,5*u,'rgba(255,255,255,.18)');
   h.circ(w*0.9,H*0.12,w*0.22,'rgba(255,255,255,.1)',{selectable:false,evented:false});
   h.slot(w/2,H*0.30,w*0.46,w*0.46,'circle');
   h.flow(H*0.50,[
     {t:'வாழ்த்துகள்!',s:0.13,f:FH,c:'#ffe066',b:1,sh:1,g:0.015},
     {t:'உங்கள் பெயர்',s:0.07,f:FH,c:'#ffffff',b:1,g:0.02},
     {t:'உங்கள் வாழ்வில் மகிழ்ச்சியும் வெற்றியும் நிறைந்திருக்கட்டும்',s:0.04,f:FM,c:'#ffffff',w:0.78}
   ]);
 }},
 {id:'pongal', label:'பொங்கல்', fonts:[FH,FM], build:function(h){
   var w=h.w, H=h.h, u=h.u;
   h.bg(h.grad([[0,'#ff9a00'],[0.6,'#ffd23f'],[1,'#fff3b0']]));
   h.rays(w/2,H*0.25,0,w*1.1,24,'rgba(255,255,255,.22)');
   h.circ(w/2,H*0.25,w*0.2,'#ff6b00',{selectable:false,evented:false});
   h.circ(w/2,H*0.25,w*0.15,'#ffb300',{selectable:false,evented:false});
   /* sugarcane */
   h.rect(w*0.12,H*0.22,w*0.035,H*0.3,'#2f9e44',{angle:-8,rx:8*u,ry:8*u});
   h.rect(w*0.84,H*0.22,w*0.035,H*0.3,'#2f9e44',{angle:8,rx:8*u,ry:8*u});
   /* pot with froth and steam */
   h.circ(w*0.43,H*0.285,w*0.045,'#ffffff'); h.circ(w*0.5,H*0.265,w*0.055,'#ffffff'); h.circ(w*0.57,H*0.285,w*0.045,'#ffffff');
   h.path('M -55 -50 L 55 -50 Q 82 12 46 62 Q 0 82 -46 62 Q -82 12 -55 -50 Z',w/2,H*0.38,'#c2410c',{scaleX:w/520,scaleY:w/520});
   h.rect(w*0.38,H*0.298,w*0.24,H*0.012,'#7c2d12',{rx:6*u,ry:6*u});
   h.flow(H*0.50,[
     {t:'பொங்கலோ பொங்கல்!',s:0.12,f:FH,c:'#7c2d12',b:1,g:0.01},
     {t:'இனிய பொங்கல் நல்வாழ்த்துகள்',s:0.065,f:FH,c:'#b91c1c',b:1,g:0.02},
     {t:'தை பிறந்தால் வழி பிறக்கும் — உங்கள் இல்லத்தில் இன்பம் பொங்கட்டும்',s:0.04,f:FM,c:'#5b2a06',w:0.8,g:0.02},
     {t:'உங்கள் பெயர் / குடும்பத்தினர்',s:0.048,f:FH,c:'#14532d',b:1}
   ]);
 }},
 {id:'tny', label:'தமிழ் புத்தாண்டு', fonts:[FH,FM,FS], build:function(h){
   var w=h.w, H=h.h, u=h.u;
   h.bg(h.grad([[0,'#0b6e4f'],[1,'#08a045']]));
   h.rays(w/2,H*0.26,0,w*1.1,28,'rgba(255,224,102,.14)');
   h.circ(w/2,H*0.26,w*0.2,'#ffd23f',{selectable:false,evented:false});
   h.circ(w/2,H*0.26,w*0.165,'#ff9f1c',{selectable:false,evented:false});
   h.dots(w*0.08,H*0.5,9,2,w*0.105,6*u,'rgba(255,224,102,.55)');
   h.flow(H*0.40,[
     {t:'இனிய',s:0.07,f:FH,c:'#ffffff',b:1,g:0}
   ]);
   h.flow(H*0.53,[
     {t:'தமிழ் புத்தாண்டு',s:0.12,f:FH,c:'#ffe066',b:1,sh:1,g:0.01},
     {t:'நல்வாழ்த்துகள்',s:0.085,f:FH,c:'#ffffff',b:1,g:0.025},
     {t:'புதிய ஆண்டு உங்களுக்கு நலமும் வளமும் தரட்டும்',s:0.042,f:FM,c:'#e8fff1',w:0.78,g:0.025},
     {t:'உங்கள் பெயர்',s:0.05,f:FH,c:'#ffe066',b:1}
   ]);
 }},
 {id:'deepavali', label:'தீபாவளி', fonts:[FH,FM], build:function(h){
   var w=h.w, H=h.h, u=h.u;
   h.bg(h.grad([[0,'#1b0a3c'],[1,'#5b1a7a']]));
   h.star(w/2,H*0.22,w*0.30,w*0.13,16,'rgba(255,196,0,.18)',{selectable:false,evented:false});
   h.star(w/2,H*0.22,w*0.20,w*0.10,12,'rgba(255,196,0,.35)',{selectable:false,evented:false});
   h.circ(w/2,H*0.22,w*0.09,'#ffd23f',{selectable:false,evented:false});
   for (var i=0;i<5;i++) h.diya(w*(0.14+i*0.18),H*0.70,w/820,'#d97706','#ff5d00');
   h.flow(H*0.37,[
     {t:'இனிய',s:0.07,f:FH,c:'#ffffff',b:1,g:0},
     {t:'தீபாவளி',s:0.15,f:FH,c:'#ffd23f',b:1,sh:1,g:0},
     {t:'நல்வாழ்த்துகள்',s:0.075,f:FH,c:'#ffffff',b:1,g:0.01}
   ]);
   h.flow(H*0.76,[
     {t:'ஒளி நிறைந்த வாழ்வு அமையட்டும்',s:0.045,f:FM,c:'#fde68a',g:0.015},
     {t:'உங்கள் பெயர் / கடை பெயர்',s:0.05,f:FH,c:'#ffffff',b:1}
   ]);
 }},
 {id:'republic', label:'சுதந்திர / குடியரசு தினம்', fonts:[FH,FM], build:function(h){
   var w=h.w, H=h.h, u=h.u;
   h.bg('#ffffff');
   h.rect(0,0,w,H*0.33,'#ff9933',{selectable:false,evented:false});
   h.rect(0,H*0.67,w,H*0.33,'#138808',{selectable:false,evented:false});
   var cx=w/2, cy=H*0.5, r=w*0.15, d='';
   for (var i=0;i<24;i++){ var a=Math.PI*2*i/24; d+='M '+cx+' '+cy+' L '+(cx+Math.cos(a)*r)+' '+(cy+Math.sin(a)*r)+' '; }
   var sp = new F.Path(d,{stroke:'#000080',strokeWidth:3*u,fill:'',left:cx-r,top:cy-r,selectable:false,evented:false}); h.c.add(sp);
   h.circ(cx,cy,r,'rgba(0,0,0,0)',{stroke:'#000080',strokeWidth:7*u,selectable:false,evented:false});
   h.circ(cx,cy,r*0.12,'#000080',{selectable:false,evented:false});
   h.flow(H*0.07,[
     {t:'இனிய சுதந்திர தின',s:0.085,f:FH,c:'#ffffff',b:1,sh:1,g:0},
     {t:'நல்வாழ்த்துகள்',s:0.085,f:FH,c:'#ffffff',b:1,sh:1}
   ]);
   h.flow(H*0.71,[
     {t:'ஜெய் ஹிந்த்!',s:0.1,f:FH,c:'#ffffff',b:1,sh:1,g:0.015},
     {t:'உங்கள் பெயர் / நிறுவனம்',s:0.05,f:FH,c:'#ffffff',b:1}
   ]);
 }},
 {id:'teachers', label:'ஆசிரியர் தினம்', fonts:[FH,FM], build:function(h){
   var w=h.w, H=h.h, u=h.u;
   h.bg('#1f3d2b');
   h.rect(w*0.04,H*0.03,w*0.92,H*0.84,'rgba(0,0,0,0)',{stroke:'#c08a4b',strokeWidth:16*u,rx:10*u,ry:10*u,selectable:false,evented:false});
   h.slot(w/2,H*0.28,w*0.40,w*0.40,'circle','#f5f5dc');
   h.flow(H*0.46,[
     {t:'ஆசிரியர் தின',s:0.1,f:FH,c:'#fdfdf0',b:1,g:0},
     {t:'நல்வாழ்த்துகள்',s:0.1,f:FH,c:'#ffd166',b:1,g:0.02},
     {t:'எழுத்தறிவித்தவன் இறைவன் ஆவான்',s:0.05,f:FM,c:'#fdfdf0',g:0.02},
     {t:'— உங்கள் பெயர்',s:0.05,f:FH,c:'#ffd166',b:1}
   ]);
 }},
 {id:'sale', label:'தள்ளுபடி / விற்பனை', fonts:[FH,FM], build:function(h){
   var w=h.w, H=h.h, u=h.u;
   h.bg(h.grad([[0,'#d90429'],[1,'#8d0801']]));
   h.rays(w/2,H*0.30,0,w*1.1,30,'rgba(255,214,0,.13)');
   h.star(w/2,H*0.28,w*0.34,w*0.26,22,'#ffd60a',{selectable:false,evented:false});
   h.star(w/2,H*0.28,w*0.29,w*0.225,22,'#ff9f1c',{selectable:false,evented:false});
   h.text('50%',{left:w*0.2,top:H*0.28-w*0.15,w:w*0.6,size:w*0.22,font:FH,color:'#7a0000',bold:1,align:'center',name:'big'});
   h.text('வரை தள்ளுபடி',{left:w*0.2,top:H*0.28+w*0.06,w:w*0.6,size:w*0.06,font:FH,color:'#7a0000',bold:1,align:'center'});
   h.flow(H*0.53,[
     {t:'மெகா தள்ளுபடி விற்பனை',s:0.095,f:FH,c:'#ffd60a',b:1,sh:1,g:0.012},
     {t:shop(),s:0.07,f:FH,c:'#ffffff',b:1,g:0.02},
     {t:'தேதி: 01-01-2027 முதல் 07-01-2027 வரை',s:0.045,f:FM,c:'#ffffff',b:1,g:0.012},
     {t:'வருக! வருக! குடும்பத்துடன் வருக!',s:0.045,f:FM,c:'#ffe3e3'}
   ]);
 }},
 {id:'opening', label:'திறப்பு விழா', fonts:[FH,FM,FS], build:function(h){
   var w=h.w, H=h.h, u=h.u;
   h.bg(h.grad([[0,'#0b1d51'],[1,'#162a6b']]));
   h.rect(w*0.04,H*0.03,w*0.92,H*0.84,'rgba(0,0,0,0)',{stroke:'#ffc300',strokeWidth:8*u,selectable:false,evented:false});
   h.rect(w*0.06,H*0.045,w*0.88,H*0.81,'rgba(0,0,0,0)',{stroke:'#ffc300',strokeWidth:2*u,selectable:false,evented:false});
   h.star(w/2,H*0.14,w*0.07,w*0.035,12,'#ffc300',{selectable:false,evented:false});
   h.flow(H*0.21,[
     {t:'புதிய கிளை',s:0.05,f:FM,c:'#ffd966',g:0},
     {t:'திறப்பு விழா',s:0.15,f:FH,c:'#ffc300',b:1,sh:1,g:0.01},
     {t:shop(),s:0.08,f:FH,c:'#ffffff',b:1,g:0.02},
     {t:'திறப்பு நாள்: 01-01-2027, காலை 9.00 மணி',s:0.05,f:FM,c:'#ffffff',b:1,g:0.01},
     {t:'முகவரி: உங்கள் கடை முகவரி',s:0.045,f:FM,c:'#dbe4ff',g:0.03},
     {t:'அனைவரும் வருக! ஆதரவு தருக!',s:0.06,f:FH,c:'#ffc300',b:1,g:0.01},
     {t:'திறப்பு விழா சலுகைகள் உண்டு',s:0.042,f:FM,c:'#ffffff'}
   ]);
 }},
 {id:'condolence', label:'கண்ணீர் அஞ்சலி', fonts:[FH,FM,FS], build:function(h){
   var w=h.w, H=h.h, u=h.u;
   h.bg(h.grad([[0,'#f4f4f4'],[1,'#d9d9d9']]));
   h.rect(0,0,w,H*0.04,'#111',{selectable:false,evented:false});
   h.rect(0,H*0.84,w,H*0.04,'#111',{selectable:false,evented:false});
   h.text('கண்ணீர் அஞ்சலி',{left:w*0.05,top:H*0.07,w:w*0.9,size:w*0.092,font:FH,color:'#111',bold:1,align:'center'});
   h.slot(w/2,H*0.36,w*0.42,w*0.52,'round','#555');
   h.flow(H*0.57,[
     {t:'அமரர் உங்கள் பெயர்',s:0.075,f:FH,c:'#111',b:1,g:0.008},
     {t:'பிறப்பு: 01-01-1950   மறைவு: 01-01-2027',s:0.04,f:FM,c:'#333',g:0.015},
     {t:'அன்னாரின் ஆத்மா சாந்தியடைய இறைவனை வேண்டுகிறோம்',s:0.045,f:FS,c:'#222',w:0.8,g:0.015},
     {t:'— குடும்பத்தினர் / நண்பர்கள்',s:0.042,f:FM,c:'#444'}
   ]);
 }},
 {id:'wedding', label:'திருமண அழைப்பிதழ்', fonts:[FT,FH,FM,FS], build:function(h){
   var w=h.w, H=h.h, u=h.u;
   h.bg('#fff7e6');
   h.rect(w*0.035,H*0.025,w*0.93,H*0.85,'rgba(0,0,0,0)',{stroke:'#8d0f2f',strokeWidth:14*u,selectable:false,evented:false});
   h.rect(w*0.06,H*0.045,w*0.88,H*0.81,'rgba(0,0,0,0)',{stroke:'#c9a227',strokeWidth:4*u,selectable:false,evented:false});
   h.star(w/2,H*0.10,w*0.06,w*0.03,10,'#c9a227',{selectable:false,evented:false});
   h.flow(H*0.15,[
     {t:'திருமண அழைப்பிதழ்',s:0.095,f:FT,c:'#8d0f2f',b:1,g:0.018},
     {t:'தங்கள் அன்புடன் வருகை தந்து மணமக்களை வாழ்த்தி அருளுமாறு அன்புடன் அழைக்கிறோம்',s:0.04,f:FS,c:'#4a2c0a',w:0.78,g:0.03},
     {t:'மணமகன்',s:0.04,f:FM,c:'#8d0f2f',g:0},
     {t:'உங்கள் மணமகன் பெயர்',s:0.075,f:FH,c:'#2b2b2b',b:1,g:0.005},
     {t:'&',s:0.07,f:FT,c:'#c9a227',g:0.005},
     {t:'மணமகள்',s:0.04,f:FM,c:'#8d0f2f',g:0},
     {t:'உங்கள் மணமகள் பெயர்',s:0.075,f:FH,c:'#2b2b2b',b:1,g:0.03},
     {t:'நாள்: 01-01-2027, காலை 9.00 – 10.30 மணி',s:0.045,f:FM,c:'#2b2b2b',b:1,g:0.01},
     {t:'இடம்: திருமண மண்டபம் பெயர், ஊர்',s:0.045,f:FM,c:'#2b2b2b'}
   ]);
 }},
 {id:'birthday', label:'பிறந்தநாள்', fonts:[FH,FM], build:function(h){
   var w=h.w, H=h.h, u=h.u;
   h.bg(h.grad([[0,'#00c6ff'],[1,'#0072ff']]));
   var cols=['#ffd60a','#ff4d6d','#7CFC00','#ffffff','#ff9f1c'];
   for (var i=0;i<26;i++){
     var x=(i*173%100)/100*w, y=(i*97%60)/100*H;
     h.circ(x,y,(8+(i%4)*6)*u,cols[i%5],{opacity:.85,selectable:false,evented:false});
   }
   h.slot(w/2,H*0.36,w*0.5,w*0.5,'circle');
   h.flow(H*0.57,[
     {t:'பிறந்தநாள்',s:0.13,f:FH,c:'#ffe066',b:1,sh:1,g:0},
     {t:'வாழ்த்துகள்!',s:0.1,f:FH,c:'#ffffff',b:1,sh:1,g:0.015},
     {t:'உங்கள் பெயர்',s:0.075,f:FH,c:'#ffffff',b:1,g:0.015},
     {t:'நீடூழி வாழ்க! நலமுடன் வாழ்க!',s:0.045,f:FM,c:'#e0f2ff'}
   ]);
 }},
 {id:'notice', label:'அறிவிப்பு', fonts:[FH,FM], build:function(h){
   var w=h.w, H=h.h, u=h.u;
   h.bg('#ffffff');
   h.rect(0,0,w,H*0.17,'#0b5ed7',{selectable:false,evented:false});
   h.text('அறிவிப்பு',{left:w*0.05,top:H*0.035,w:w*0.9,size:w*0.12,font:FH,color:'#ffffff',bold:1,align:'center'});
   h.rect(w*0.06,H*0.2,w*0.88,H*0.005,'#0b5ed7',{selectable:false,evented:false});
   h.flow(H*0.23,[
     {t:shop(),s:0.07,f:FH,c:'#0b5ed7',b:1,g:0.02},
     {t:'இதன் மூலம் அனைவருக்கும் தெரிவிப்பது என்னவென்றால், உங்கள் அறிவிப்பு விவரத்தை இங்கே எழுதுங்கள்.',s:0.048,f:FM,c:'#1f2937',w:0.84,a:'left',g:0.03},
     {t:'நாள்: 01-01-2027',s:0.05,f:FH,c:'#b91c1c',b:1,a:'left',g:0.01},
     {t:'நேரம்: காலை 10.00 மணி',s:0.05,f:FH,c:'#b91c1c',b:1,a:'left',g:0.01},
     {t:'தொடர்புக்கு: கீழே உள்ள எண்ணில்',s:0.045,f:FM,c:'#1f2937',a:'left'}
   ]);
 }},
 {id:'morning', label:'காலை வணக்கம்', fonts:[FH,FM], build:function(h){
   var w=h.w, H=h.h, u=h.u;
   h.bg(h.grad([[0,'#ff7e5f'],[0.55,'#feb47b'],[1,'#ffe29a']]));
   h.rays(w/2,H*0.62,0,w*1.2,26,'rgba(255,255,255,.2)');
   h.circ(w/2,H*0.62,w*0.24,'#fff1a8',{selectable:false,evented:false});
   h.circ(w/2,H*0.62,w*0.19,'#ffd23f',{selectable:false,evented:false});
   h.rect(0,H*0.70,w,H*0.18,'#2b6a3c',{selectable:false,evented:false});
   h.flow(H*0.08,[
     {t:'காலை வணக்கம்',s:0.14,f:FH,c:'#ffffff',b:1,sh:1,g:0.01},
     {t:'இனிய நாள் அமையட்டும்!',s:0.07,f:FH,c:'#7a1f00',b:1,g:0.02},
     {t:'நல்ல எண்ணங்கள் நல்ல நாளை உருவாக்கும்',s:0.045,f:FM,c:'#5a1a00',w:0.78}
   ]);
   h.text('— உங்கள் பெயர்',{left:w*0.1,top:H*0.775,w:w*0.8,size:w*0.05,font:FH,color:'#ffffff',bold:1,align:'center'});
 }}
];
function tplById(id){ for (var i=0;i<TPLS.length;i++) if (TPLS[i].id===id) return TPLS[i]; return TPLS[0]; }

/* ---------- canvas setup / zoom ---------- */
function fitCss(){
  var stage = $('stage');
  var avail = stage.clientWidth - 24;
  var maxH = Math.max(320, window.innerHeight*0.78);
  var k = Math.min(1, avail/W, maxH/H);
  if (!isFinite(k) || k<=0.05) k = 0.3;
  canvas.setDimensions({width:Math.round(W*k), height:Math.round(H*k)},{cssOnly:true});
}
function setSize(newId, keepLandscape){
  var s = SIZES.filter(function(x){ return x.id===newId; })[0] || SIZES[1];
  sizeId = s.id; W = s.w; H = s.h;
  if (landscape && s.id!=='yt'){ var t=W; W=H; H=t; }
  canvas.setDimensions({width:W,height:H},{backstoreOnly:true});
  fitCss();
  document.querySelectorAll('#sizes .chip').forEach(function(b){ b.classList.toggle('on', b.dataset.id===sizeId); });
  var note = s.note || '';
  if (s.ft){
    var fw = landscape ? s.ft[1] : s.ft[0];
    var dpi = Math.round(W/(fw*12));
    note = 'Flex '+(landscape? s.ft[1]+'×'+s.ft[0] : s.ft[0]+'×'+s.ft[1])+' அடி — '+W+'×'+H+' px (~'+dpi+' dpi). Flex தூரத்தில் பார்க்கப்படுவதால் இது போதும்; அச்சகத்தாரிடம் கேட்டு உறுதி செய்யுங்கள்.';
  }
  $('sizeNote').textContent = note + (s.id==='yt'?'':' ');
  updateExportNote();
}
function pageInfo(){
  var s = SIZES.filter(function(x){ return x.id===sizeId; })[0];
  var ptW, ptH;
  if (s && s.pt){ ptW = landscape?s.pt[1]:s.pt[0]; ptH = landscape?s.pt[0]:s.pt[1]; }
  else if (s && s.ft){ ptW = (landscape?s.ft[1]:s.ft[0])*72; ptH = (landscape?s.ft[0]:s.ft[1])*72; }
  else { ptW = W*0.75; ptH = H*0.75; }
  return {w:ptW,h:ptH};
}
function exportMult(){
  var m = $('xHi').checked ? 2 : 1;
  while (m>1 && W*H*m*m > 16000000) m -= 0.25;
  return Math.max(1,m);
}
function updateExportNote(){
  var m = exportMult();
  var s = SIZES.filter(function(x){ return x.id===sizeId; })[0];
  var txt = 'வெளியீடு: '+Math.round(W*m)+'×'+Math.round(H*m)+' px';
  if (s && s.pt) txt += ' ('+Math.round(W*m/ (pageInfo().w/72))+' dpi)';
  $('xNote').textContent = txt+'. PDF என்பது படப் பக்கம் (தமிழ் எழுத்து சரியாக இருக்க) — உரையைத் தேர்ந்தெடுக்க முடியாது.';
}

/* ---------- history ---------- */
function snapshot(){
  return JSON.stringify({W:W,H:H,sizeId:sizeId,landscape:landscape,tpl:tplId,footerOn:footerOn,c:canvas.toObject(PROPS)});
}
function pushHist(){
  if (loading) return;
  clearTimeout(histTimer);
  histTimer = setTimeout(function(){
    var s = snapshot();
    if (hist[histIx]===s) return;
    hist = hist.slice(0,histIx+1); hist.push(s);
    if (hist.length>40) hist.shift();
    histIx = hist.length-1;
    btnState(); autosave(s);
  }, 180);
}
function btnState(){ $('bUndo').disabled = histIx<=0; $('bRedo').disabled = histIx>=hist.length-1; }
function autosave(s){ try { if (s.length < 3500000) localStorage.setItem('pm_autosave', s); } catch(e){} }
async function restore(s){
  var d = JSON.parse(s);
  loading = true;
  W=d.W; H=d.H; sizeId=d.sizeId; landscape=!!d.landscape; tplId=d.tpl||tplId; footerOn=!!d.footerOn;
  await ensureFonts(FONTS.map(function(f){ return f[0]; }));
  await canvas.loadFromJSON(d.c);
  canvas.getObjects().forEach(function(o){ if (o instanceof F.Textbox){ o.editable=false; o.initDimensions(); o.dirty=true; } });
  canvas.setDimensions({width:W,height:H},{backstoreOnly:true});
  fitCss();
  document.querySelectorAll('#sizes .chip').forEach(function(b){ b.classList.toggle('on', b.dataset.id===sizeId); });
  document.querySelectorAll('#tpls .tpl').forEach(function(b){ b.classList.toggle('on', b.dataset.id===tplId); });
  canvas.discardActiveObject(); canvas.requestRenderAll();
  loading = false; updateExportNote(); syncProps();
}
function undo(){ if (histIx>0){ histIx--; restore(hist[histIx]).then(btnState); } }
function redo(){ if (histIx<hist.length-1){ histIx++; restore(hist[histIx]).then(btnState); } }

/* ---------- templates ---------- */
async function applyTemplate(id, extra){
  tplId = id;
  var t = tplById(id);
  loading = true;
  await ensureFonts(t.fonts.concat([FM]));
  canvas.clear();
  canvas.backgroundColor = '#ffffff';
  t.build(mk(canvas, W, H));
  if (extra && extra.title) setFirstTitle(extra.title);
  if (footerOn) buildFooter();
  canvas.getObjects().forEach(function(o){ if (o instanceof F.Textbox){ o.initDimensions(); o.dirty=true; } });
  canvas.discardActiveObject(); canvas.requestRenderAll();
  loading = false;
  document.querySelectorAll('#tpls .tpl').forEach(function(b){ b.classList.toggle('on', b.dataset.id===id); });
  pushHist(); syncProps();
}
function setFirstTitle(){ /* reserved */ }

/* template thumbnails, drawn off-screen */
async function makeThumbs(){
  var box = $('tpls');
  for (var i=0;i<TPLS.length;i++){
    var t = TPLS[i];
    var b = document.createElement('button');
    b.className = 'tpl'; b.dataset.id = t.id; b.type='button';
    b.innerHTML = '<img alt="" width="96" height="128"><span>'+t.label+'</span>';
    (function(tt){ b.addEventListener('click', function(){ applyTemplate(tt.id); }); })(t);
    box.appendChild(b);
  }
  await ensureFonts([FH,FM,FS,FT]);
  for (var j=0;j<TPLS.length;j++){
    try {
      var tw=1080, th=1440;
      var sc = new F.StaticCanvas(null,{width:tw,height:th});
      TPLS[j].build(mk(sc,tw,th));
      sc.getObjects().forEach(function(o){ if (o instanceof F.Textbox){ o.initDimensions(); } });
      sc.renderAll();
      box.children[j].querySelector('img').src = sc.toDataURL({format:'jpeg',quality:0.7,multiplier:0.12});
      sc.dispose();
    } catch(e){ /* thumbnail is cosmetic */ }
    await new Promise(function(r){ setTimeout(r,0); });
  }
  document.querySelectorAll('#tpls .tpl').forEach(function(b){ b.classList.toggle('on', b.dataset.id===tplId); });
}

/* ---------- brand footer ---------- */
function removeFooter(){
  canvas.getObjects().filter(function(o){ return o.isFooter; }).forEach(function(o){ canvas.remove(o); });
}
function fitText(tb, maxH, minSize){
  while (tb.height > maxH && tb.fontSize > minSize){ tb.set('fontSize', tb.fontSize*0.92); tb.initDimensions(); }
}
function qrPath(text, size){
  var q = window.qrcode(0,'M'); q.addData(text); q.make();
  var n = q.getModuleCount(), cell = size/n, d='';
  for (var r=0;r<n;r++) for (var c=0;c<n;c++) if (q.isDark(r,c)){
    d += 'M '+(c*cell)+' '+(r*cell)+' h '+cell+' v '+cell+' h '+(-cell)+' Z ';
  }
  return d;
}
function buildFooter(){
  removeFooter();
  var u = Math.min(W,H)/1080;
  var fh = Math.round(Math.min(W,H)*(W>H?0.17:0.15));
  if (fh < 120*u) fh = Math.round(120*u);
  var y0 = H - fh, pad = fh*0.12, mark = {isFooter:true, selectable:false, evented:false};
  var items = [];
  var col = brand.color || '#7c2d9a';
  items.push(new F.Rect(Object.assign({left:0,top:y0,width:W,height:fh,fill:col,name:'footerBand'},mark)));
  var left = pad*1.5, right = W - pad*1.5;
  var qrText = brand.upi ? 'upi://pay?pa='+encodeURIComponent(brand.upi)+'&pn='+encodeURIComponent(brand.name||'')+'&cu=INR' : '';
  if (qrText && window.qrcode){
    var qs = fh - pad*2;
    items.push(new F.Rect(Object.assign({left:right-qs-pad*0.5,top:y0+pad-pad*0.5,width:qs+pad,height:qs+pad,fill:'#ffffff',rx:8*u,ry:8*u,name:'qrBack'},mark)));
    var qp = new F.Path(qrPath(qrText, qs), Object.assign({left:right-qs,top:y0+pad,fill:'#000000',name:'qr'},mark));
    items.push(qp);
    right = right - qs - pad*2;
  }
  if (brand.logo && brand.logoImg){
    var li = brand.logoImg; var ls = fh - pad*2;
    var k = Math.min(ls/li.width, ls/li.height);
    var im = new F.FabricImage(li, Object.assign({left:left,top:y0+pad+(ls-li.height*k)/2,scaleX:k,scaleY:k,name:'footerLogo'},mark));
    items.push(im); left += li.width*k + pad;
  }
  var tw = Math.max(80, right-left);
  var lines = [];
  var nm = new F.Textbox(brand.name||'உங்கள் கடை பெயர்',{left:left,top:0,width:tw,fontSize:fh*0.30,fontFamily:FH,fontWeight:700,fill:'#ffffff',textAlign:'left',lineHeight:1.15,name:'fName',editable:false});
  var parts = [];
  if (brand.phone) parts.push('☎ '+brand.phone);
  var ph = new F.Textbox(parts.join('  ')||' ',{left:left,top:0,width:tw,fontSize:fh*0.22,fontFamily:FM,fontWeight:700,fill:'#ffe066',textAlign:'left',lineHeight:1.15,name:'fPhone',editable:false});
  var ad = new F.Textbox(brand.addr||' ',{left:left,top:0,width:tw,fontSize:fh*0.17,fontFamily:FM,fill:'#ffffff',textAlign:'left',lineHeight:1.2,name:'fAddr',editable:false});
  [nm,ph,ad].forEach(function(t){ t.initDimensions(); });
  fitText(nm, fh*0.34, 14); fitText(ph, fh*0.24, 12); fitText(ad, fh*0.3, 11);
  var total = nm.height + (brand.phone?ph.height:0) + (brand.addr?ad.height:0);
  var cy = y0 + (fh - total)/2;
  nm.set('top',cy); cy += nm.height;
  if (brand.phone){ ph.set('top',cy); cy += ph.height; }
  if (brand.addr){ ad.set('top',cy); }
  lines.push(nm); if (brand.phone) lines.push(ph); if (brand.addr) lines.push(ad);
  lines.forEach(function(t){ t.set(mark); });
  items = items.concat(lines);
  items.forEach(function(o){ o.isFooter = true; canvas.add(o); });
  canvas.requestRenderAll();
}

/* ---------- selection / property panel ---------- */
var FILLABLE = ['Rect','Circle','Polygon','Path','Ellipse'];
function active(){ return canvas.getActiveObject(); }
function isText(o){ return o && o instanceof F.Textbox; }
function toHex(c){
  if (typeof c!=='string') return '#000000';
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#'+c[1]+c[1]+c[2]+c[2]+c[3]+c[3];
  var m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return '#'+[m[1],m[2],m[3]].map(function(x){ return ('0'+(+x).toString(16)).slice(-2); }).join('');
  return '#000000';
}
function syncProps(){
  var o = active();
  $('noSel').classList.toggle('hide', !!o);
  $('textProps').classList.toggle('hide', !isText(o));
  $('shapeProps').classList.toggle('hide', !(o && !isText(o) && o.fill!==undefined && !(o instanceof F.FabricImage)));
  if (isText(o)){
    $('tTxt').value = o.text;
    $('tFont').value = o.fontFamily;
    $('tSize').value = Math.round(o.fontSize*(o.scaleX||1)); $('tSizeV').textContent = Math.round(o.fontSize*(o.scaleX||1));
    $('tColor').value = toHex(o.fill);
    document.querySelectorAll('#tAlign button').forEach(function(b){ b.classList.toggle('on', b.dataset.a===o.textAlign); });
    $('tBold').classList.toggle('p', o.fontWeight>=600);
    $('tShadow').classList.toggle('p', !!o.shadow);
  } else if (o && o.fill!==undefined){
    $('sColor').value = toHex(o.fill);
    $('sOpacity').value = Math.round((o.opacity===undefined?1:o.opacity)*100);
  }
}
function touchText(o){ o.initDimensions(); o.dirty=true; o.setCoords(); canvas.requestRenderAll(); }

function wireProps(){
  $('tTxt').addEventListener('input', function(){ var o=active(); if (!isText(o)) return; o.set('text', this.value); touchText(o); });
  $('tTxt').addEventListener('change', pushHist);
  $('tFont').addEventListener('change', async function(){ var o=active(); if(!isText(o)) return; var f=this.value; await ensureFont(f); o.set('fontFamily', f); touchText(o); pushHist(); });
  $('tSize').addEventListener('input', function(){ var o=active(); if(!isText(o)) return; o.set({fontSize:+this.value, scaleX:1, scaleY:1}); $('tSizeV').textContent=this.value; touchText(o); });
  $('tSize').addEventListener('change', pushHist);
  $('tColor').addEventListener('input', function(){ var o=active(); if(!isText(o)) return; o.set('fill', this.value); o.dirty=true; canvas.requestRenderAll(); });
  $('tColor').addEventListener('change', pushHist);
  document.querySelectorAll('#tAlign button').forEach(function(b){ b.addEventListener('click', function(){ var o=active(); if(!isText(o)) return; o.set('textAlign', b.dataset.a); touchText(o); syncProps(); pushHist(); }); });
  $('tBold').addEventListener('click', function(){ var o=active(); if(!isText(o)) return; o.set('fontWeight', o.fontWeight>=600?400:700); touchText(o); syncProps(); pushHist(); });
  $('tShadow').addEventListener('click', function(){ var o=active(); if(!isText(o)) return; o.set('shadow', o.shadow?null:new F.Shadow({color:'rgba(0,0,0,.45)',blur:10,offsetX:3,offsetY:3})); o.dirty=true; canvas.requestRenderAll(); syncProps(); pushHist(); });
  $('sColor').addEventListener('input', function(){ var o=active(); if(!o) return; o.set('fill', this.value); canvas.requestRenderAll(); });
  $('sColor').addEventListener('change', pushHist);
  $('sOpacity').addEventListener('input', function(){ var o=active(); if(!o) return; o.set('opacity', this.value/100); canvas.requestRenderAll(); });
  $('sOpacity').addEventListener('change', pushHist);
  $('bgColor').addEventListener('input', function(){
    var bg = canvas.getObjects().filter(function(o){ return o.name==='bg'; })[0];
    if (bg) bg.set('fill', this.value); else canvas.backgroundColor = this.value;
    canvas.requestRenderAll();
  });
  $('bgColor').addEventListener('change', pushHist);
}
var FSEL = $('tFont');
FONTS.forEach(function(f){ var op=document.createElement('option'); op.value=f[0]; op.textContent=f[1]; FSEL.appendChild(op); });

/* ---------- adding things ---------- */
function centerAdd(obj){
  obj.set({left:W/2-(obj.width*(obj.scaleX||1))/2, top:H*0.4});
  canvas.add(obj); canvas.setActiveObject(obj); canvas.requestRenderAll();
}
async function addText(){
  await ensureFont(FM);
  var t = new F.Textbox('உங்கள் உரை',{left:W*0.1,top:H*0.4,width:W*0.8,fontSize:W*0.07,fontFamily:FM,fontWeight:700,fill:'#222222',textAlign:'center',lineHeight:1.28,editable:false,name:'text'});
  canvas.add(t); canvas.setActiveObject(t); canvas.requestRenderAll();
  setTimeout(function(){ var ta=$('tTxt'); ta.focus(); ta.select(); },50);
}
function readImage(file){
  return new Promise(function(res,rej){
    var fr = new FileReader();
    fr.onload = function(){ var im = new Image(); im.onload=function(){ res(im); }; im.onerror=rej; im.src = fr.result; };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}
function downscale(im, maxSide){
  var k = Math.min(1, maxSide/Math.max(im.naturalWidth, im.naturalHeight));
  var c = document.createElement('canvas'); c.width=Math.round(im.naturalWidth*k); c.height=Math.round(im.naturalHeight*k);
  c.getContext('2d').drawImage(im,0,0,c.width,c.height);
  return c;
}
async function addPhoto(file){
  try {
    var im = await readImage(file);
    var src = downscale(im, 2400);
    var img = new F.FabricImage(src, {name:'photo'});
    var slot = active();
    if (!(slot && slot.isSlot && slot.name==='slot')) slot = canvas.getObjects().filter(function(o){ return o.isSlot && o.name==='slot'; })[0];
    if (slot){
      var sw=slot.slotW, sh=slot.slotH, k=Math.max(sw/img.width, sh/img.height);
      img.set({scaleX:k,scaleY:k,originX:'center',originY:'center',left:slot.slotCx,top:slot.slotCy});
      var cw=sw/k, ch=sh/k;
      img.clipPath = slot.slotShape==='circle'
        ? new F.Circle({radius:cw/2,originX:'center',originY:'center',left:0,top:0})
        : new F.Rect({width:cw,height:ch,rx:(slot.slotShape==='round'?28:0)/k,ry:(slot.slotShape==='round'?28:0)/k,originX:'center',originY:'center',left:0,top:0});
      var idx = canvas.getObjects().indexOf(slot);
      canvas.getObjects().filter(function(o){ return o.name==='slotHint' && Math.abs(o.left-(slot.slotCx-sw/2))<2; }).forEach(function(o){ canvas.remove(o); });
      canvas.remove(slot);
      canvas.insertAt(Math.min(idx, canvas.getObjects().length), img);
    } else {
      var k2 = Math.min(W*0.8/img.width, H*0.5/img.height, 1.5);
      img.set({scaleX:k2,scaleY:k2,left:W*0.1,top:H*0.2});
      canvas.add(img);
    }
    canvas.setActiveObject(img); canvas.requestRenderAll();
  } catch(e){ toast('படத்தைத் திறக்க முடியவில்லை'); }
}
function addRect(){
  var r = new F.Rect({width:W*0.5,height:W*0.25,fill:'#ffd23f',rx:16,ry:16,name:'shape'}); centerAdd(r);
}
function addCircle(){
  var r = new F.Circle({radius:W*0.15,fill:'#ff4d6d',name:'shape'}); centerAdd(r);
}
async function dup(){
  var o = active(); if (!o || o.isFooter) return;
  var cl = await o.clone(PROPS); cl.set({left:o.left+30, top:o.top+30});
  if (isText(cl)) cl.editable=false;
  canvas.add(cl); canvas.setActiveObject(cl); canvas.requestRenderAll();
}
function del(){
  var o = active(); if (!o) return;
  if (o.isSlot && o.name==='slot'){ canvas.getObjects().filter(function(x){ return x.name==='slotHint' && Math.abs(x.left-(o.slotCx-o.slotW/2))<2; }).forEach(function(x){ canvas.remove(x); }); }
  canvas.remove(o); canvas.discardActiveObject(); canvas.requestRenderAll(); syncProps();
}
function toFront(){
  var o=active(); if(!o) return; canvas.bringObjectToFront(o);
  canvas.getObjects().filter(function(x){ return x.isFooter; }).forEach(function(x){ canvas.bringObjectToFront(x); });
  canvas.requestRenderAll(); pushHist();
}
function toBack(){
  var o=active(); if(!o) return; canvas.sendObjectToBack(o);
  canvas.getObjects().filter(function(x){ return x.name==='bg'; }).forEach(function(x){ canvas.sendObjectToBack(x); });
  canvas.requestRenderAll(); pushHist();
}

/* ---------- export ---------- */
function download(blob, name){
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
function dataUrlToBytes(u){
  var b = atob(u.split(',')[1]), a = new Uint8Array(b.length);
  for (var i=0;i<b.length;i++) a[i] = b.charCodeAt(i);
  return a;
}
function renderUrl(fmt){
  canvas.discardActiveObject(); canvas.requestRenderAll();
  return canvas.toDataURL({format:fmt==='png'?'png':'jpeg',quality:0.93,multiplier:exportMult(),enableRetinaScaling:false});
}
function stamp(){ var d=new Date(); return d.getFullYear()+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2)+'-'+('0'+d.getHours()).slice(-2)+('0'+d.getMinutes()).slice(-2); }
function exportImg(fmt){
  try {
    var u = renderUrl(fmt);
    download(new Blob([dataUrlToBytes(u)],{type:fmt==='png'?'image/png':'image/jpeg'}), 'poster-'+stamp()+'.'+(fmt==='png'?'png':'jpg'));
    toast('பதிவிறக்கம் தொடங்கியது',1);
  } catch(e){ toast('இந்த அளவு உங்கள் சாதனத்தில் முடியவில்லை — "உயர் தரம்" குறியை நீக்கிப் பாருங்கள்'); }
}
function exportPdf(){
  try {
    var u = renderUrl('jpg'), jpg = dataUrlToBytes(u), m = exportMult();
    var pw = Math.round(W*m), ph = Math.round(H*m), pg = pageInfo();
    var enc = new TextEncoder(), parts = [], offs = [], len = 0;
    function push(x){ var b = typeof x==='string' ? enc.encode(x) : x; parts.push(b); len += b.length; }
    function obj(n, body){ offs[n] = len; push(n+' 0 obj\n'+body+'\nendobj\n'); }
    push('%PDF-1.4\n');
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
    obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pg.w.toFixed(2)+' '+pg.h.toFixed(2)+'] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    offs[4] = len; push('4 0 obj\n<< /Type /XObject /Subtype /Image /Width '+pw+' /Height '+ph+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg.length+' >>\nstream\n'); push(jpg); push('\nendstream\nendobj\n');
    var cs = 'q '+pg.w.toFixed(2)+' 0 0 '+pg.h.toFixed(2)+' 0 0 cm /Im0 Do Q';
    obj(5,'<< /Length '+cs.length+' >>\nstream\n'+cs+'\nendstream');
    var xref = len; var x = 'xref\n0 6\n0000000000 65535 f \n';
    for (var i=1;i<=5;i++) x += ('0000000000'+offs[i]).slice(-10)+' 00000 n \n';
    push(x+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
    download(new Blob(parts,{type:'application/pdf'}), 'poster-'+stamp()+'.pdf');
    toast('PDF பதிவிறக்கம் தொடங்கியது',1);
  } catch(e){ toast('PDF உருவாக்க முடியவில்லை'); }
}
function saveProject(){
  download(new Blob([snapshot()],{type:'application/json'}), 'poster-'+stamp()+'.json');
}
function openProject(file){
  var fr = new FileReader();
  fr.onload = function(){
    try { var s = String(fr.result); JSON.parse(s); restore(s).then(pushHist); }
    catch(e){ toast('இந்தக் கோப்பைத் திறக்க முடியவில்லை'); }
  };
  fr.readAsText(file);
}

/* ---------- brand panel ---------- */
function brandUI(){
  $('bName').value = brand.name||''; $('bPhone').value = brand.phone||''; $('bAddr').value = brand.addr||'';
  $('bUpi').value = brand.upi||''; $('bColor').value = brand.color||'#7c2d9a';
  $('bLogoDel').classList.toggle('hide', !brand.logo);
  if (brand.logo){ var im = new Image(); im.onload=function(){ brand.logoImg = im; }; im.src = brand.logo; }
}
function readBrandFields(){
  brand.name = $('bName').value.trim(); brand.phone = $('bPhone').value.trim(); brand.addr = $('bAddr').value.trim();
  brand.upi = $('bUpi').value.trim(); brand.color = $('bColor').value;
  var keep = {name:brand.name,phone:brand.phone,addr:brand.addr,upi:brand.upi,color:brand.color,logo:brand.logo};
  var li = brand.logoImg; brand = keep; brand.logoImg = li;
  try { localStorage.setItem('pm_brand', JSON.stringify(keep)); } catch(e){}
}
async function applyFooter(){
  readBrandFields();
  if (brand.upi && !/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(brand.upi)){ toast('UPI ID சரியாக இல்லை (எ.கா. name@bank)'); return; }
  await ensureFonts([FH,FM]);
  footerOn = true; buildFooter(); pushHist();
  toast(brand.upi ? 'Footer சேர்ந்தது — QR-ஐ ஒருமுறை ஸ்கேன் செய்து சரிபாருங்கள்' : 'Footer சேர்ந்தது');
}
async function setLogo(file){
  try {
    var im = await readImage(file);
    var c = downscale(im, 300);
    brand.logo = c.toDataURL('image/png');
    var li = new Image(); li.onload = function(){ brand.logoImg = li; $('bLogoDel').classList.remove('hide'); readBrandFields(); }; li.src = brand.logo;
  } catch(e){ toast('Logo-வைத் திறக்க முடியவில்லை'); }
}

/* ---------- festivals ---------- */
var FESTS = [
  {n:'புத்தாண்டு', tpl:'greet', md:'01-01'},
  {n:'பொங்கல்', tpl:'pongal', dates:['2027-01-15','2028-01-15']},
  {n:'குடியரசு தினம்', tpl:'republic', md:'01-26'},
  {n:'தமிழ் புத்தாண்டு', tpl:'tny', dates:['2027-04-14','2028-04-14']},
  {n:'சுதந்திர தினம்', tpl:'republic', md:'08-15'},
  {n:'ஆசிரியர் தினம்', tpl:'teachers', md:'09-05'},
  {n:'தீபாவளி', tpl:'deepavali', dates:['2026-11-08','2027-10-29']},
  {n:'கிறிஸ்துமஸ்', tpl:'greet', md:'12-25'}
];
function upcoming(){
  var now = new Date(); now.setHours(0,0,0,0);
  var out = [];
  FESTS.forEach(function(f){
    var cand = [];
    if (f.md){ [0,1].forEach(function(dy){ cand.push(new Date(now.getFullYear()+dy+'-'+f.md+'T00:00:00')); }); }
    else f.dates.forEach(function(d){ cand.push(new Date(d+'T00:00:00')); });
    cand = cand.filter(function(d){ return d>=now; }).sort(function(a,b){ return a-b; });
    if (cand[0]) out.push({f:f, d:cand[0], days:Math.round((cand[0]-now)/86400000)});
  });
  return out.sort(function(a,b){ return a.days-b.days; }).slice(0,4);
}
function drawFest(){
  var box = $('fest'); box.innerHTML='';
  upcoming().forEach(function(x){
    var b = document.createElement('button'); b.type='button';
    b.textContent = x.f.n+' — '+(x.days===0?'இன்று':x.days+' நாள்');
    b.addEventListener('click', function(){ applyTemplate(x.f.tpl); document.getElementById('stage').scrollIntoView({behavior:'smooth',block:'center'}); });
    box.appendChild(b);
  });
}

/* ---------- boot ---------- */
async function boot(){
  if (!F){ $('stage').textContent = 'Fabric.js ஏற்ற முடியவில்லை — பக்கத்தைப் புதுப்பிக்கவும்'; return; }
  try{ F.FabricObject.ownDefaults.originX='left'; F.FabricObject.ownDefaults.originY='top'; }catch(e){}
  canvas = new F.Canvas('c',{width:W,height:H,preserveObjectStacking:true,selection:false,backgroundColor:'#ffffff',enableRetinaScaling:false,allowTouchScrolling:true});
  window.__poster = {canvas:canvas, state:function(){ return {W:W,H:H,sizeId:sizeId,tplId:tplId}; }, applyTemplate:applyTemplate, setSize:setSize};
  var sz = $('sizes');
  SIZES.forEach(function(s){
    var b = document.createElement('button'); b.type='button'; b.className='chip'; b.dataset.id=s.id; b.textContent=s.label;
    b.addEventListener('click', async function(){ setSize(s.id); await applyTemplate(tplId); });
    sz.appendChild(b);
  });
  var rot = document.createElement('button'); rot.type='button'; rot.className='chip'; rot.textContent='↻ சுழற்று';
  rot.addEventListener('click', async function(){ landscape=!landscape; setSize(sizeId); await applyTemplate(tplId); });
  sz.appendChild(rot);
  wireProps(); brandUI(); drawFest();
  canvas.on('selection:created', syncProps); canvas.on('selection:updated', syncProps); canvas.on('selection:cleared', syncProps);
  canvas.on('object:modified', function(){ syncProps(); pushHist(); });
  canvas.on('object:added', pushHist); canvas.on('object:removed', pushHist);
  $('bText').onclick = addText;
  $('bPhoto').onclick = function(){ $('file').click(); };
  $('file').onchange = function(){ if (this.files[0]) addPhoto(this.files[0]); this.value=''; };
  $('bRect').onclick = addRect; $('bCircle').onclick = addCircle;
  $('bUndo').onclick = undo; $('bRedo').onclick = redo;
  $('bDup').onclick = dup; $('bDel').onclick = del; $('bFront').onclick = toFront; $('bBack').onclick = toBack;
  $('bApply').onclick = applyFooter;
  $('bRemove').onclick = function(){ footerOn=false; removeFooter(); canvas.requestRenderAll(); pushHist(); };
  $('bLogoBtn').onclick = function(){ $('logoFile').click(); };
  $('logoFile').onchange = function(){ if (this.files[0]) setLogo(this.files[0]); this.value=''; };
  $('bLogoDel').onclick = function(){ delete brand.logo; delete brand.logoImg; $('bLogoDel').classList.add('hide'); readBrandFields(); };
  $('xPng').onclick = function(){ exportImg('png'); };
  $('xJpg').onclick = function(){ exportImg('jpg'); };
  $('xPdf').onclick = exportPdf;
  $('xHi').onchange = updateExportNote;
  $('xSave').onclick = saveProject;
  $('xOpen').onclick = function(){ $('open').click(); };
  $('open').onchange = function(){ if (this.files[0]) openProject(this.files[0]); this.value=''; };
  document.addEventListener('keydown', function(e){
    var tag = (document.activeElement && document.activeElement.tagName)||'';
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if (e.key==='Delete' || e.key==='Backspace'){ if (active()){ e.preventDefault(); del(); } }
    if ((e.ctrlKey||e.metaKey) && e.key==='z'){ e.preventDefault(); e.shiftKey ? redo() : undo(); }
  });
  var rz; window.addEventListener('resize', function(){ clearTimeout(rz); rz=setTimeout(fitCss,120); });
  setSize(sizeId);
  var qs = new URLSearchParams(location.search), want = qs.get('t');
  await applyTemplate(want && TPLS.some(function(t){ return t.id===want; }) ? want : 'greet');
  makeThumbs();
}
boot();
})();
