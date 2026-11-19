const $ = s => document.querySelector(s);
const DATA = [[8,0],[20,1],[60,15],[64,20],[84,60],[147,200]]; // [x distancia, y caída] en cm
const REPORT = [0,2,5];
let order = [...REPORT];
let model = null;

/* ---------- Matemática ---------- */
function fit(idx){
  const p = idx.map(i => DATA[i]).sort((u,v) => u[0]-v[0]);
  const [[x1,y1],[x2,y2],[x3,y3]] = p;
  const A1=x2*x2-x1*x1, B1=x2-x1, C1=y2-y1;
  const A2=x3*x3-x1*x1, B2=x3-x1, C2=y3-y1;
  const num=C2*B1-B2*C1, den=A2*B1-B2*A1;
  const a=num/den, b=(C1-A1*a)/B1, c=y1-a*x1*x1-b*x1;
  return {a,b,c,p,A1,B1,C1,A2,B2,C2,num,den};
}
const yAt = (m,x) => m.a*x*x + m.b*x + m.c;
const fx = (n,d) => (Math.abs(n)<1e-12 ? 0 : n).toFixed(d);
const sgn = (n,d) => (n<0 ? '− ' : '+ ') + Math.abs(n).toFixed(d);
const formulaText = m => `y = ${m.a<0?'− ':''}${Math.abs(m.a).toFixed(6)}x² ${sgn(m.b,6)}x ${sgn(m.c,4)}`;
// Altura respecto a la boquilla: h = −y (es la que se dibuja, con el eje vertical hacia arriba)
const hText = m => formulaText({a:-m.a,b:-m.b,c:-m.c}).replace('y =','h =').replace('= − ','= −');

/* ---------- Gráfica ---------- */
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function flame(g,cx,cy,s,c1,c2){
  const draw=(k,col)=>{g.fillStyle=col;g.beginPath();g.moveTo(cx,cy+k*.8);
    g.bezierCurveTo(cx-k*.95,cy+k*.4,cx-k*.55,cy-k*.4,cx,cy-k*1.0);
    g.bezierCurveTo(cx+k*.55,cy-k*.4,cx+k*.95,cy+k*.4,cx,cy+k*.8);g.fill();};
  draw(s,c1); draw(s*.55,c2);
}
function chart(cv,o){
  const dpr=window.devicePixelRatio||1, r=cv.getBoundingClientRect(), W=r.width, H=r.height;
  if(!W) return;
  cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  const k={ink:css('--ink'),muted:css('--muted'),grid:css('--grid'),water:css('--water'),fire:css('--fire'),line:css('--line'),surface:css('--surface'),good:css('--good'),soft:css('--water-soft')};
  const L=62,R=14,T=14,B=38,w=W-L-R,h=H-T-B, X1=160,Y0=-10,Y1=210;
  const px=x=>L+x/X1*w, py=y=>T+(y-Y0)/(Y1-Y0)*h;
  g.clearRect(0,0,W,H);
  g.font='11px "IBM Plex Mono",monospace'; g.lineWidth=1;
  g.textBaseline='middle';
  for(let x=0;x<=160;x+=20){ g.strokeStyle=k.grid; g.beginPath(); g.moveTo(px(x),T); g.lineTo(px(x),T+h); g.stroke();
    g.fillStyle=k.muted; g.textAlign='center'; g.fillText(x,px(x),T+h+12); }
  for(let y=0;y<=200;y+=50){ g.strokeStyle=y===0?k.muted:k.grid; g.beginPath(); g.moveTo(L,py(y)); g.lineTo(L+w,py(y)); g.stroke();
    g.fillStyle=k.muted; g.textAlign='right'; g.fillText(y===0?'0':'−'+y,L-8,py(y)); }
  g.fillStyle=k.muted; g.textAlign='right'; g.fillText('x · distancia (cm)',L+w,T+h+28);
  g.save(); g.translate(11,T+h/2); g.rotate(-Math.PI/2); g.textAlign='center'; g.fillText('h = −y · altura (cm)',0,0); g.restore();

  g.save(); g.beginPath(); g.rect(L,T,w,h); g.clip();
  // línea objetivo
  if(o.tx!=null){ g.setLineDash([4,4]); g.strokeStyle=k.muted; g.beginPath(); g.moveTo(px(o.tx),T); g.lineTo(px(o.tx),T+h); g.stroke(); g.setLineDash([]);
    g.fillStyle=k.ink; g.textAlign=o.tx>120?'right':'left'; g.font='600 12px "IBM Plex Mono",monospace';
    g.fillText(`x = ${o.tx} cm`, px(o.tx)+(o.tx>120?-6:6), T+12); g.font='11px "IBM Plex Mono",monospace'; }
  // curva
  if(o.m){
    let xe=160; for(let x=0;x<=160;x+=.5){ if(yAt(o.m,x)>=Y1){xe=x;break;} }
    const xEnd=Math.min(o.xEnd??xe, xe);
    const path=(to)=>{ g.beginPath(); for(let x=0;x<=to;x+=.5){ const X=px(x),Y=py(yAt(o.m,x)); x===0?g.moveTo(X,Y):g.lineTo(X,Y);} };
    if(o.ghost){ g.setLineDash([5,5]); g.strokeStyle=k.muted; g.lineWidth=1.2; path(xe); g.stroke(); g.setLineDash([]); }
    const T_=o.T??1, to=xEnd*T_;
    if(to>0){ g.lineJoin='round'; g.lineCap='round';
      g.strokeStyle=k.water; g.globalAlpha=.25; g.lineWidth=9; path(to); g.stroke();
      g.globalAlpha=1; g.lineWidth=3; path(to); g.stroke();
      if(T_<1){ g.fillStyle=k.water; for(let i=0;i<5;i++){ const xx=to+i*1.6, yy=yAt(o.m,xx)+((i%2)?3:-3);
        g.globalAlpha=.8-i*.15; g.beginPath(); g.arc(px(xx),py(yy),2.4-i*.3,0,7); g.fill(); } g.globalAlpha=1; } }
  }
  g.lineWidth=1;
  // mediciones
  if(o.data){ DATA.forEach((p,i)=>{ const on=(o.sel||[]).includes(i);
    g.beginPath(); g.arc(px(p[0]),py(p[1]),on?6:4.5,0,7);
    g.fillStyle=on?k.water:k.surface; g.fill(); g.strokeStyle=on?k.ink:k.muted; g.lineWidth=on?2:1.5; g.stroke();
    g.fillStyle=k.ink; g.textAlign='left'; g.font='600 11px "IBM Plex Mono",monospace'; g.fillText(i+1,px(p[0])+9,py(p[1])-9); g.font='11px "IBM Plex Mono",monospace'; }); g.lineWidth=1; }
  // chorro real en el juego
  if(o.real){ g.strokeStyle=k.water; g.lineWidth=2; g.beginPath(); g.arc(px(o.real.x),py(o.real.y),7,0,7); g.stroke();
    g.fillStyle=k.water; g.beginPath(); g.arc(px(o.real.x),py(o.real.y),2.5,0,7); g.fill(); g.lineWidth=1; }
  // fuego
  if(o.fire){ const fx_=px(o.fire.x), fy=py(o.fire.y);
    if(o.fire.out){ g.fillStyle=k.soft; g.beginPath(); g.ellipse(fx_,fy+10,16,5,0,0,7); g.fill();
      g.strokeStyle=k.muted; g.lineWidth=2; g.lineCap='round';
      [-6,6].forEach(d=>{ g.beginPath(); g.moveTo(fx_+d,fy+4); g.bezierCurveTo(fx_+d+7,fy-4,fx_+d-7,fy-12,fx_+d,fy-22); g.stroke(); }); g.lineWidth=1;
    } else flame(g,fx_,fy,15,k.fire,'#FFC857'); }
  g.restore();
}

/* ---------- Animación ---------- */
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
function anim(ms,step,done){
  if(reduce.matches){ step(1); done&&done(); return; }
  const t0=performance.now();
  (function tick(now){ const t=Math.min(1,(now-t0)/ms); step(t); t<1?requestAnimationFrame(tick):(done&&done()); })(t0);
}

/* ---------- Simulación ---------- */
function renderTable(){
  const err=i=>model? yAt(model,DATA[i][0])-DATA[i][1] : null;
  $('#tbody').innerHTML = DATA.map((p,i)=>{
    const on=order.includes(i), e=err(i), ee=e==null?null:(Math.abs(e)<.05?0:e);
    return `<tr class="${on?'on':''}"><td><label class="pick"><input type="checkbox" data-i="${i}" ${on?'checked':''} aria-label="Usar la medición ${i+1}"><span>${i+1}</span></label></td>
    <td>${p[0]}</td><td>${p[1]}</td><td>${model?fx(yAt(model,p[0]),1):'–'}</td>
    <td class="${ee===0||ee==null?'zero':'pos'}">${ee==null?'–':(ee>0?'+':'')+fx(ee,1)}</td></tr>`; }).join('');
  if(model){ const es=DATA.map((p,i)=>Math.abs(err(i))), mean=es.reduce((s,v)=>s+v,0)/es.length, mx=Math.max(...es);
    $('#stats').innerHTML=`Error medio: <b>${fx(mean,1)} cm</b> · Mayor error: <b>${fx(mx,1)} cm</b> (medición ${es.indexOf(mx)+1})`;
  } else $('#stats').textContent='Elige 3 puntos para calcular el error.';
}
function renderResult(){
  if(!model){ $('#formula').textContent='Elige exactamente 3 puntos de la tabla.'; $('#formulaH').textContent=''; $('#coefs').innerHTML=''; $('#steps').textContent='Sin tres puntos no hay sistema de ecuaciones.'; return; }
  const m=model;
  $('#formula').textContent=formulaText(m);
  $('#formulaH').textContent='Gráfica (h = −y): '+hText(m);
  $('#coefs').innerHTML=[['a',m.a,6],['b',m.b,6],['c',m.c,4]].map(([n,v,d])=>`<div class="coef"><span>${n}</span><b>${fx(v,d)}</b></div>`).join('');
  const P=m.p.map(q=>`(${q[0]}, ${q[1]})`).join(', ');
  const eq=m.p.map((q,i)=>`${i+1}) ${q[0]*q[0]}a + ${q[0]}b + c = ${q[1]}`).join('\n');
  $('#steps').innerHTML=
`<span class="h">Paso 1 · Puntos elegidos</span>${P}
<span class="h">Paso 2 · Sistema de ecuaciones</span>${eq}
<span class="h">Paso 3 · Eliminar c (2 − 1 y 3 − 1)</span>${m.A1}a + ${m.B1}b = ${m.C1}
${m.A2}a + ${m.B2}b = ${m.C2}
<span class="h">Paso 4 · Despejar b de la primera</span>b = (${m.C1} − ${m.A1}a) / ${m.B1}
<span class="h">Paso 5 · Sustituir y hallar a</span>a = (${m.C2}·${m.B1} − ${m.B2}·${m.C1}) / (${m.A2}·${m.B1} − ${m.B2}·${m.A1})
a = ${m.num} / ${m.den} = ${fx(m.a,8)}
<span class="h">Paso 6 · Hallar b</span>b = (${m.C1} − ${m.A1}·${fx(m.a,8)}) / ${m.B1} = ${fx(m.b,8)}
<span class="h">Paso 7 · Hallar c con el primer punto</span>c = ${m.p[0][1]} − ${fx(m.a,8)}·${m.p[0][0]*m.p[0][0]} − (${fx(m.b,8)})·${m.p[0][0]} = ${fx(m.c,6)}
<span class="h">Resultado</span>${formulaText(m)}   (caída)
${hText(m)}   (altura, la que se grafica)`;
}
function simDraw(T,ghost){ chart($('#sc'),{m:model,T:T,ghost:!!ghost,data:true,sel:order}); }
function update(){
  model = order.length===3 ? fit(order) : null;
  renderTable(); renderResult(); simDraw(1);
  $('#launch').disabled=!model;
}
$('#tbody').addEventListener('change',e=>{
  const i=+e.target.dataset.i;
  if(e.target.checked){ order.push(i); if(order.length>3) order.shift(); } else order=order.filter(v=>v!==i);
  update();
});
$('#reset').onclick=()=>{ order=[...REPORT]; update(); };
$('#launch').onclick=()=>{ if(!model) return; $('#launch').disabled=true; anim(1500,t=>simDraw(t,true),()=>{ $('#launch').disabled=false; simDraw(1); }); };

/* ---------- Modo reto ---------- */
const TOL=4, ROUNDS=5, XS=[40,50,60,70,80,90,100,110,120,130,140];
const G={round:0,score:0,xs:[],x:0,guess:null,t:0,res:null,busy:false,hint:false,fails:0,sig:'',saved:false};
const roundPts=()=>Math.max(0,100-10*G.fails);
const store={ get(){ try{ return JSON.parse(localStorage.getItem('chorro-ranking')||'[]'); }catch(e){ return []; } },
  set(v){ try{ localStorage.setItem('chorro-ranking',JSON.stringify(v)); }catch(e){} } };
let memRank=[]; // respaldo si el navegador bloquea localStorage
function ranking(){ const s=store.get(); return s.length?s:memRank; }
function renderRank(){
  const r=ranking().slice(0,5);
  $('#rank').innerHTML = r.length ? r.map(e=>`<li>${e.n.replace(/[<>&]/g,'')} — ${e.s} pts</li>`).join('') : '<li style="list-style:none;margin-left:-22px;color:var(--muted)">Aún no hay puntajes. Sé el primero.</li>';
}
function gameDraw(){
  const o={data:true,sel:order};
  if(model){ o.m=model; o.T=G.t; o.xEnd=G.x; o.tx=G.x;
    if(G.guess!=null) o.fire={x:G.x,y:G.guess,out:!!(G.res&&G.res.hit)};
    if(G.res) o.real={x:G.x,y:G.res.real}; }
  chart($('#gc'),o);
}
function hud(){ $('#gRound').textContent=Math.min(G.round+1,ROUNDS); $('#gScore').textContent=G.score; $('#gPts').textContent=G.res?G.res.pts:roundPts(); }
function setMsg(t,c){ const m=$('#msg'); m.textContent=t; m.className='msg '+(c||''); }
function newGame(){
  G.xs=[...XS].sort(()=>Math.random()-.5).slice(0,ROUNDS); G.round=0; G.score=0; G.saved=false; G.sig=model?formulaText(model):'';
  closeOver(); $('#nameRow').hidden=false; $('#play').hidden=false; $('#end').hidden=true; startRound();
}
function startRound(){
  G.x=G.xs[G.round]; G.guess=null; G.t=0; G.res=null; G.busy=false; G.hint=false; G.fails=0;
  $('#gTarget').textContent=`Fuego a x = ${G.x} cm`;
  $('#gFormula').textContent=model?formulaText(model):'Elige 3 puntos en la simulación.';
  $('#guess').value=''; $('#guess').disabled=false; $('#shoot').hidden=false; $('#hintBtn').hidden=false; $('#next').hidden=true; $('#hintBox').hidden=true;
  $('#shoot').disabled=!model; $('#hintBtn').disabled=!model;
  setMsg(model?'Escribe tu respuesta y dispara.':'Primero elige 3 puntos en la simulación.');
  hud(); gameDraw();
}
$('#guess').addEventListener('input',e=>{ if(G.busy||G.res) return; const v=parseFloat(e.target.value.replace(',','.')); G.guess=isNaN(v)?null:v; gameDraw(); });
$('#guess').addEventListener('keydown',e=>{ if(e.key==='Enter') $('#shoot').click(); });
$('#hintBtn').onclick=()=>{ if(!model||G.hint||G.res) return; G.hint=true; const m=model, x=G.x;
  $('#hintBox').hidden=false; $('#hintBox').textContent=`y = ${fx(m.a,6)}·(${x})² ${sgn(m.b,6)}·(${x}) ${sgn(m.c,4)}`; };
$('#shoot').onclick=()=>{
  if(!model||G.busy||G.res) return;
  const v=parseFloat($('#guess').value.replace(',','.'));
  if(isNaN(v)){ setMsg('Escribe un número para y, por ejemplo 85.5.','no'); return; }
  G.guess=v;
  const real=yAt(model,G.x);
  if(Math.abs(v-real)>TOL){
    G.fails++; hud(); gameDraw();
    setMsg(`Todavía no. Tu valor de y es ${v>real?'mayor':'menor'} que el real. Revisa la cuenta e inténtalo otra vez. Esta ronda ahora vale ${roundPts()} puntos.`,'no');
    $('#guess').focus(); $('#guess').select(); return;
  }
  G.busy=true; $('#shoot').disabled=true; $('#hintBtn').disabled=true; $('#guess').disabled=true;
  anim(1100,t=>{ G.t=t; gameDraw(); },()=>{
    const pts=roundPts();
    G.score+=pts; G.res={hit:true,real,pts}; G.busy=false; gameDraw(); hud();
    setMsg(`Apagado. El chorro pasó a y = ${fx(real,1)} cm. +${pts} puntos${G.fails?` (${G.fails} ${G.fails===1?'error':'errores'}, −${G.fails*10})`:' sin errores'}.`,'ok');
    $('#shoot').hidden=true; $('#hintBtn').hidden=true; $('#next').hidden=false;
    $('#next').textContent=G.round+1>=ROUNDS?'Ver resultado final':'Siguiente ronda';
  });
};
$('#next').onclick=()=>{
  G.round++;
  if(G.round>=ROUNDS) endGame(); else startRound();
};
function endGame(){
  $('#play').hidden=true; $('#end').hidden=false; G.t=0; G.res=null; G.guess=null; gameDraw();
  $('#endTitle').textContent=`Terminaste con ${G.score} de ${ROUNDS*100} puntos`;
  openOver(G.score>=WIN);
}

/* ---------- Pantalla final: ganar (450 a 500) o perder (menos de 450) ---------- */
const WIN=450;
let fxId=0;
function stopFx(){ cancelAnimationFrame(fxId); fxId=0; const c=$('#fx'); c.getContext('2d').clearRect(0,0,c.width,c.height); }
function startFx(mode){
  stopFx(); if(reduce.matches) return;
  const c=$('#fx'), g=c.getContext('2d'), dpr=window.devicePixelRatio||1, W=innerWidth, H=innerHeight;
  c.width=W*dpr; c.height=H*dpr; g.setTransform(dpr,0,0,dpr,0,0);
  const rnd=(a,b)=>a+Math.random()*(b-a), P=[], cols=['#FFD166','#EF476F','#06D6A0','#4DB3F0','#FFFFFF','#FF9F1C'];
  const pick=()=>cols[(Math.random()*cols.length)|0];
  if(mode==='win'){
    for(let i=0;i<150;i++) P.push({x:rnd(0,W),y:rnd(-H,H*.3),vx:rnd(-.6,.6),vy:rnd(1.6,3.6),w:rnd(6,11),h:rnd(10,16),r:rnd(0,6.28),vr:rnd(-.15,.15),c:pick(),s:rnd(0,6.28)});
    for(let i=0;i<70;i++){ const left=i%2===0; // dos cañones de confeti desde las esquinas de abajo
      P.push({x:left?0:W,y:H,vx:(left?1:-1)*rnd(3,9),vy:rnd(-17,-9),w:rnd(6,11),h:rnd(10,16),r:rnd(0,6.28),vr:rnd(-.3,.3),c:pick(),s:0,burst:true}); }
  } else {
    for(let i=0;i<110;i++){ const up=Math.random()<.2; // ceniza que cae y brasas que suben
      P.push({x:rnd(0,W),y:rnd(0,H),vx:rnd(-.3,.3),vy:up?rnd(-1.4,-.5):rnd(.5,1.6),w:rnd(1.5,4),s:rnd(0,6.28),ember:up}); }
  }
  (function loop(){
    g.clearRect(0,0,W,H);
    for(const p of P){
      if(mode==='win'){
        p.s+=.05; if(p.burst){ p.vy+=.35; p.vx*=.985; }
        p.x+=p.vx+(p.burst?0:Math.sin(p.s)*.8); p.y+=p.vy; p.r+=p.vr;
        if(p.y>H+20){ if(p.burst){ p.burst=false; p.vr=rnd(-.15,.15); } p.vx=rnd(-.6,.6); p.vy=rnd(1.6,3.6); p.y=-20; p.x=rnd(0,W); }
        g.save(); g.translate(p.x,p.y); g.rotate(p.r); g.scale(1,Math.abs(Math.cos(p.s*2))*.8+.2); g.fillStyle=p.c; g.fillRect(-p.w/2,-p.h/2,p.w,p.h); g.restore();
      } else {
        p.s+=.02; p.x+=p.vx+Math.sin(p.s)*.4; p.y+=p.vy;
        if(p.y>H+10) p.y=-10; if(p.y<-10) p.y=H+10;
        g.globalAlpha=p.ember?.85:.5; g.fillStyle=p.ember?'#FF6B3D':'#C9C9C9'; g.beginPath(); g.arc(p.x,p.y,p.w,0,7); g.fill();
      }
    }
    g.globalAlpha=1; fxId=requestAnimationFrame(loop);
  })();
}
function openOver(win){
  const o=$('#over'), img=$('#ovImg'), ph=$('#ph'), src=win?'img/congrulations_tung_tung.jpeg':'img/you_lose_bad_sahur.jpeg';
  o.className='over '+(win?'win':'lose'); o.hidden=false;
  $('#ovTitle').textContent=win?'¡Felicidades!':'¡Perdiste!';
  $('#ovSub').textContent=win?'Dominaste la parábola y apagaste los fuegos.':`Necesitas ${WIN} puntos o más para ganar. Revisa la fórmula e inténtalo otra vez.`;
  ph.hidden=true; img.hidden=false; img.alt=win?'Felicitaciones':'Perdiste';
  img.onerror=()=>{ img.hidden=true; ph.hidden=false; ph.textContent=`Falta la imagen ${src}. Ponla en la carpeta img con ese nombre.`; };
  img.removeAttribute('src'); img.src=src;
  $('#ovScore').innerHTML=`<b id="ovN">0</b> de ${ROUNDS*100} puntos`;
  anim(900,t=>{ const n=$('#ovN'); if(n) n.textContent=Math.round(G.score*t); });
  $('#nameRow').hidden=G.saved;
  startFx(win?'win':'lose'); $('#again2').focus();
}
function closeOver(){ $('#over').hidden=true; stopFx(); }
$('#save').onclick=()=>{
  if(G.saved) return; const n=($('#pname').value.trim()||'Anónimo');
  const r=[...ranking(),{n,s:G.score}].sort((a,b)=>b.s-a.s).slice(0,10); memRank=r; store.set(r); G.saved=true; $('#nameRow').hidden=true; renderRank(); };
$('#again').onclick=newGame; $('#again2').onclick=newGame; $('#closeOv').onclick=closeOver;
$('#showOv').onclick=()=>openOver(G.score>=WIN);
addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('#over').hidden) closeOver(); });

/* ---------- Pestañas ---------- */
function show(which){
  const sim=which!=='reto';
  $('#view-sim').hidden=!sim; $('#view-reto').hidden=sim;
  $('#tab-sim').setAttribute('aria-selected',sim); $('#tab-reto').setAttribute('aria-selected',!sim);
  requestAnimationFrame(()=>{ if(sim) simDraw(1); else { if(!G.xs.length||G.sig!==(model?formulaText(model):'')) newGame(); else gameDraw(); } });
}
$('#tab-sim').onclick=()=>{ location.hash='simulacion'; };
$('#tab-reto').onclick=()=>{ location.hash='reto'; };
addEventListener('hashchange',()=>show(location.hash.slice(1)));
addEventListener('resize',()=>{ $('#view-reto').hidden?simDraw(1):gameDraw(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{ $('#view-reto').hidden?simDraw(1):gameDraw(); });
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ $('#view-reto').hidden?simDraw(1):gameDraw(); });

update(); renderRank(); show(location.hash.slice(1));
