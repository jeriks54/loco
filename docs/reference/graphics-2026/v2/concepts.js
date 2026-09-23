/* Static concept renderer. No production modules or gameplay state are changed. */
const theme=document.body.dataset.theme==='clean'?'clean':'warm';
const title=theme==='warm'?'The workshop':'The robot lab';
const subtitle=theme==='warm'?'A tactile maze, a brass machine, and a warm control panel.':'A precise overhead world, a compact rover, and a calm control console.';
const palettes={
 warm:{stage:'#ad8b60',frame:'#503c2d',frameRim:'#d9bc87',frameInner:'#3b2f24',floor:'#efdfb8',grid:'#dac79e',wall:'#6e5038',wallLight:'#916e4e',wallEdge:'#b38e60',wallShade:'#503c2b',ink:'#5b604e',sensor:'#26896a',targetFill:'#26896a16',robot:'#c88e42',robotLit:'#ebc980',roof:'#efdeb4',roofEdge:'#9b712f',track:'#343c35',tread:'#6c7464',bumper:'#435648',hole:'#111a16',holeRim:'#6e7965',goal:'#277459',goalFill:'#ccdcc1',steel:'#748d75',bodyInk:'#765120'},
 clean:{stage:'#29424f',frame:'#3a5361',frameRim:'#55717e',frameInner:'#142b37',floor:'#c9d9dc',grid:'#b4c9cd',wall:'#4a6470',wallLight:'#567582',wallEdge:'#7695a0',wallShade:'#354d59',ink:'#526e77',sensor:'#19735f',targetFill:'#19735f18',robot:'#ebeee5',robotLit:'#ffffff',roof:'#d8e0d9',roofEdge:'#9faea4',track:'#1d323b',tread:'#5c7680',bumper:'#617c7e',hole:'#09191e',holeRim:'#76929a',goal:'#26745e',goalFill:'#a9d5c7',steel:'#618278',bodyInk:'#697b73'}
};
const P=palettes[theme];
const grid=['#############','#S.....######','######.######','######.######','######.######','#G.....######','######H######','#############'];
const icon='<span class="brand-symbol">[·]</span>';
const commands=()=>`<div class="console-top"><div class="console-title"><h3>Commands</h3><span>Drag or tap to add</span></div><div class="commands"><span class="chip"><b>↑</b> move</span><span class="chip"><b>↶</b> turn left</span><span class="chip"><b>↷</b> turn right</span><span class="chip"><b>↻</b> loop</span><span class="chip"><b>↻</b> loop until</span><span class="chip"><b>↳</b> end</span><span class="chip operand">◉ wall sensor</span><span class="chip operand">■ blocked</span></div></div>`;
const count=()=>'<span class="memory-count"><b>11</b> / 11</span>';
const program=()=>{
 const condition='loop until <span class="token">wall sensor</span> = <span class="token">blocked</span>';
 const code=[condition,'move','end','turn right','loop <span class="loop-count">4</span>','move','end','turn right',condition,'move','end'];
 return `<div class="program-wrap"><div class="program-title"><span>Your program</span>${count()}</div><div class="memory-bar">${'<i></i>'.repeat(11)}</div><div class="program">${code.map((v,i)=>`<div class="code-line ${[1,5,9].includes(i)?'body':''} ${[2,6,10].includes(i)?'end':''}"><span class="line-number">${String(i+1).padStart(2,'0')}</span><span class="line-code">${v}</span></div>`).join('')}</div><div class="program-note"><span>11 lines · memory full</span><span>Clear</span></div></div>`;
};
const legend=()=>'<div class="board-legend"><span><i class="legend-icon"></i>Wall</span><span><i class="legend-icon hole"></i>Hole</span><span><i class="legend-icon goal"></i>Exit</span></div>';
const equipment=()=>`<div class="equipment"><canvas class="equipment-robot" data-robot="E" data-equipped="true"></canvas><div><div class="overline"><i class="equipped-dot"></i>Equipment fitted</div><h3>Front wall sensor</h3><p>Checks the next tile ahead.<br>Misses holes. Does not brake.</p></div><div class="reading"><div class="reading-label">CURRENT READING</div><strong><i class="status-shape"></i>No wall detected</strong><p>Outlined tile = what it checks.</p></div></div>`;
const desktop=()=>`<div class="game ${theme} desktop" data-capture="desktop"><header class="app-head"><div class="brand">${icon}LoCo</div><div class="head-middle"><span class="back-link">← All levels</span><span class="divider"></span><span class="chapter">03 &nbsp; Sensing</span></div><div class="head-progress"><span>Level 19 of 25</span><div class="progress-dots">${Array.from({length:5},(_,i)=>`<i class="${i<3?'done':''}"></i>`).join('')}</div></div></header><div class="desktop-content"><section class="world"><div class="mission"><div><h2>Safe Passage</h2><p>Reach the exit without falling into the gap.</p></div><span class="mission-id">03.04</span></div><div class="board-stage"><canvas data-board="main"></canvas></div>${legend()}${equipment()}</section><aside class="console">${commands()}${program()}<div class="console-actions"><div class="run">▶ &nbsp; Run program</div><div class="reset">↺ &nbsp; Reset</div><div class="speed"><span>Speed</span><span>½×</span><span class="selected">1×</span><span>2×</span></div></div></aside></div></div>`;
const phone=expanded=>`<div><p class="phone-label">${expanded?'Editing the program':'Watching the board'}</p><div class="game ${theme} phone ${expanded?'expanded':''}" data-capture="phone-${expanded?'expanded':'collapsed'}"><div class="phone-head"><div class="brand">${icon}LoCo</div><span class="back-link">← Levels</span></div><div class="phone-mission"><div><h2>Safe Passage</h2><p>03 · Sensing</p></div><span class="mission-id">19 / 25</span></div><div class="phone-sensor"><div class="sensor-name">Front wall sensor fitted<br>1 tile ahead · misses holes<br>Does not brake automatically</div><strong><i class="status-shape"></i>No wall detected</strong></div><div class="board-stage"><canvas data-board="main"></canvas></div>${legend()}${equipment()}<div class="ready-note"><b>Your program is ready.</b>Run it and watch each instruction unfold.</div><div class="phone-sheet"><div class="sheet-grip"><i></i></div><div class="peek"><div class="run">▶ &nbsp; Run program</div><div class="reset">↺ &nbsp; Reset</div>${count()}</div>${expanded?`<div class="mobile-scroll">${commands()}${program()}<div class="speed"><span>Speed</span><span>½×</span><span class="selected">1×</span><span>2×</span></div></div><div class="scroll-hint">Scroll to see all 11 lines ↓</div>`:'<div class="peek-caption"><span>↑ Open your program</span><span>Speed 1×</span></div>'}</div></div></div>`;
const details=()=>`<section class="game ${theme} details" data-capture="details"><div class="detail-top"><div><h2 class="detail-heading">A front you can always find.</h2><p class="detail-intro">Paired tracks, a shaped nose, and an arrow on the roof. The sensor is a separate module.</p><div class="orientation-grid"><div class="dir"></div>${['North','East','South','West'].map(d=>`<div class="dir">${d}</div>`).join('')}${[false,true].map(e=>`<div class="row-label">${e?'Sensor fitted':'No sensor'}</div>${['N','E','S','W'].map(d=>`<div class="sample"><canvas data-robot="${d}" data-equipped="${e}"></canvas></div>`).join('')}`).join('')}</div></div><div class="scale-panel"><h3>Drawn for the size you actually play.</h3><p>The same robot, at three real tile sizes.</p><div class="scale-strip">${[14,22,48].map(n=>`<div class="scale-item"><canvas style="width:${n}px;height:${n}px" data-size="${n}" data-robot="E" data-equipped="true"></canvas>${n} px</div>`).join('')}</div><p>At the smallest sizes, silhouette and facing lead. The equipment panel carries the readable sensor name and status.</p><div class="sensor-explainer"><i class="status-shape"></i><span>An open circle means no wall detected.<br>A filled square means a wall was detected.</span></div></div></div><h2 class="detail-heading">One tile. One question: is there a wall?</h2><p class="detail-intro">The bracket marks the exact tile being checked. A negative reading does not mean it is safe to move.</p><div class="sense-grid">${['wall','floor','hole'].map((kind,i)=>`<div class="sense-card"><div class="sense-title">${['Wall ahead','Floor ahead','Hole ahead'][i]}<small>Facing east →</small></div><canvas data-sense="${kind}"></canvas><div class="sense-reading"><i class="status-shape ${kind==='wall'?'wall':''}"></i>${kind==='wall'?'Wall detected':'No wall detected'}</div><p>${['The program can use this reading to decide when to turn.','The sensor reports a reading. Your program decides what happens next.','A hole is not a wall. This sensor misses it and will not stop the robot.'][i]}</p></div>`).join('')}</div></section>`;
document.querySelector('#app').innerHTML=`<main class="review"><header class="review-head"><div><p class="overline">LoCo · Graphics study 02</p><h1>${title}</h1><p>${subtitle}</p></div><nav class="switch"><a href="warm.html" class="${theme==='warm'?'current':''}">A · Workshop</a><a href="clean.html" class="${theme==='clean'?'current':''}">B · Robot lab</a></nav></header><div class="section-heading"><h2>The complete game screen</h2><span>1280 × 800 · static concept</span></div><div class="capture-shell">${desktop()}</div><div class="section-heading"><h2>On your phone</h2><span>390 × 844 · identical board position in both views</span></div><div class="phones">${phone(false)}${phone(true)}</div><div class="section-heading"><h2>Direction, equipment, and sensor meaning</h2><span>Actual artwork · actual sensor rules</span></div><div class="capture-shell">${details()}</div><p class="review-foot">Static design study, not a playable build. This is the real Safe Passage level and its 11-line solution. The board and program use the same rules as the game; choosing a visual direction comes before implementation.</p></main>`;

function round(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function setup(cv){const r=cv.getBoundingClientRect(),d=2;cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d);const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);return[c,r.width,r.height]}
function robot(c,cx,cy,t,dir='E',equipped=true){
 c.save();c.translate(cx,cy);c.rotate({E:0,S:Math.PI/2,W:Math.PI,N:-Math.PI/2}[dir]);
 c.fillStyle='#08181025';round(c,-t*.38+t*.035,-t*.40+t*.06,t*.82,t*.85,t*.1,'#08181025');
 for(const sy of [-.38,.25]){
  round(c,-t*.35,t*sy,t*.67,t*.14,t*.035,P.track);
  if(t>=22){c.strokeStyle=P.tread;c.lineWidth=Math.max(.6,t*.015);for(let i=0;i<6;i++){const x=t*(-.30+i*.106);c.beginPath();c.moveTo(x,t*(sy+.026));c.lineTo(x,t*(sy+.114));c.stroke()}}
 }
 // Overhead chassis, with a chamfered forward bumper and a roof access panel.
 round(c,-t*.32,-t*.27,t*.67,t*.54,t*.095,P.robot);
 c.lineWidth=Math.max(.6,t*.018);round(c,-t*.31,-t*.265,t*.64,t*.51,t*.08,null,P.robotLit);
 round(c,-t*.245,-t*.205,t*.46,t*.41,t*.055,P.roof,P.roofEdge);
 round(c,t*.265,-t*.19,t*.13,t*.38,t*.05,P.bumper);
 // Forward arrow on the roof remains when equipment is absent.
 c.fillStyle=P.bodyInk;c.beginPath();c.moveTo(t*.005,-t*.075);c.lineTo(t*.07,-t*.075);c.lineTo(t*.07,-t*.13);c.lineTo(t*.195,0);c.lineTo(t*.07,t*.13);c.lineTo(t*.07,t*.075);c.lineTo(t*.005,t*.075);c.closePath();c.fill();
 if(t>=22){c.strokeStyle=P.roofEdge;c.lineWidth=Math.max(.75,t*.018);for(let i=0;i<3;i++){c.beginPath();c.moveTo(t*(-.17+i*.045),-t*.10);c.lineTo(t*(-.17+i*.045),t*.10);c.stroke()}}
 if(equipped){round(c,t*.32,-t*.13,t*.15,t*.26,t*.035,theme==='warm'?'#267b63':'#178875');if(t>=20){for(const sy of [-.06,.06]){c.beginPath();c.arc(t*.397,t*sy,t*.035,0,Math.PI*2);c.fillStyle='#c5f5dc';c.fill()}}else{c.fillStyle='#b7f1cd';c.fillRect(t*.39,-t*.035,Math.max(1,t*.035),Math.max(1,t*.07))}}
 c.restore();
}
function hole(c,x,y,t){round(c,x+t*.10,y+t*.10,t*.8,t*.8,t*.065,P.holeRim);round(c,x+t*.145,y+t*.165,t*.71,t*.70,t*.035,P.hole);c.fillStyle='#020a0829';c.fillRect(x+t*.18,y+t*.17,t*.64,t*.16);c.strokeStyle=theme==='warm'?'#d4c4a5':'#a9c1c6';c.lineWidth=Math.max(1,t*.022);c.beginPath();c.moveTo(x+t*.12,y+t*.91);c.lineTo(x+t*.87,y+t*.91);c.stroke()}
function goal(c,x,y,t){round(c,x+t*.10,y+t*.10,t*.80,t*.80,t*.07,P.goalFill);c.strokeStyle=P.goal;c.lineWidth=Math.max(1,t*.035);c.beginPath();c.arc(x+t*.5,y+t*.40,t*.19,0,Math.PI*2);c.stroke();c.fillStyle=P.goal;c.beginPath();c.arc(x+t*.5,y+t*.40,t*.065,0,Math.PI*2);c.fill();if(t>=25){c.font=`700 ${t*.145}px 'Segoe UI',sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText('EXIT',x+t*.5,y+t*.77)} }
function target(c,x,y,t,wall=false){
 c.fillStyle=P.targetFill;c.fillRect(x+t*.08,y+t*.08,t*.84,t*.84);c.strokeStyle=P.sensor;c.lineWidth=Math.max(1.2,t*.038);c.lineCap='square';
 const inset=.1,len=.18;
 for(const [sx,sy]of [[1,1],[-1,1],[1,-1],[-1,-1]]){const xx=x+t*(sx===1?inset:1-inset),yy=y+t*(sy===1?inset:1-inset);c.beginPath();c.moveTo(xx,yy+sy*t*len);c.lineTo(xx,yy);c.lineTo(xx+sx*t*len,yy);c.save();c.strokeStyle=theme==='warm'?'#e7e6cb':'#d4eee8';c.lineWidth+=1.8;c.stroke();c.restore();c.stroke()}
 if(wall){c.fillStyle=P.sensor;round(c,x+t*.41,y+t*.41,t*.18,t*.18,t*.02,P.sensor)}
}
function map(c,rows,ox,oy,t,{pose={x:1,y:1,dir:'E'},equipped=true}={}){
 const get=(x,y)=>rows[y]?.[x]??'#';
 // Floor first; contiguous wall masses share a top plane, with no side-view brick courses.
 rows.forEach((row,y)=>[...row].forEach((v,x)=>{
  const px=ox+x*t,py=oy+y*t;
  c.fillStyle=v==='#'?P.wall:P.floor;c.fillRect(px,py,t+.2,t+.2);
  if(v!=='#'){
   c.strokeStyle=P.grid;c.lineWidth=.6;c.strokeRect(px+.3,py+.3,t-.6,t-.6);
   if(v!=='H'){
    c.fillStyle='#28302418';const s=t*.075;
    if(get(x,y-1)==='#')c.fillRect(px,py,t,s);
    if(get(x-1,y)==='#')c.fillRect(px,py,s,t);
    if(get(x,y+1)==='#')c.fillRect(px,py+t-s,t,s*.6);
    if(get(x+1,y)==='#')c.fillRect(px+t-s,py,s*.6,t);
   }
   if(v==='H')hole(c,px,py,t);
   if(v==='G')goal(c,px,py,t);
   if(v==='S'){c.strokeStyle=P.grid;c.lineWidth=1;c.beginPath();c.arc(px+t*.5,py+t*.5,t*.32,0,Math.PI*2);c.stroke()}
  }
 }));
 if(theme==='warm'){
  c.save();c.beginPath();rows.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='#')c.rect(ox+x*t,oy+y*t,t,t)}));c.clip();
  c.strokeStyle='#d9ad7816';c.lineWidth=.7;
  for(let j=0;j<rows.length*7;j++){const yy=oy+j*t/7;c.beginPath();c.moveTo(ox,yy);c.bezierCurveTo(ox+2.9*t,yy+t*.10*Math.sin(j),ox+8*t,yy-t*.11,ox+rows[0].length*t,yy+t*.05);c.stroke()}
  c.restore();
 }
 rows.forEach((row,y)=>[...row].forEach((v,x)=>{
  if(v!=='#')return;const px=ox+x*t,py=oy+y*t,e=Math.max(1,t*.035);
  c.fillStyle=P.wallEdge;if(get(x,y-1)!=='#')c.fillRect(px,py,t,e);if(get(x-1,y)!=='#')c.fillRect(px,py,e,t);
  c.fillStyle=P.wallShade;if(get(x+1,y)!=='#')c.fillRect(px+t-e,py,e,t);if(get(x,y+1)!=='#')c.fillRect(px,py+t-e,t,e);
  // Restrained top-surface machining lines. Never masonry or a front face.
  if(theme==='clean'&&t>=30&&((x*3+y)%5===0)){c.strokeStyle=P.wallLight;c.lineWidth=.7;c.beginPath();c.moveTo(px+t*.25,py+t*.44);c.lineTo(px+t*.64,py+t*.44);c.stroke();c.beginPath();c.moveTo(px+t*.25,py+t*.50);c.lineTo(px+t*.55,py+t*.50);c.stroke()}
 }));
 if(equipped){const delta={E:[1,0],S:[0,1],W:[-1,0],N:[0,-1]}[pose.dir],tx=pose.x+delta[0],ty=pose.y+delta[1];target(c,ox+tx*t,oy+ty*t,t,get(tx,ty)==='#')}
 robot(c,ox+(pose.x+.5)*t,oy+(pose.y+.5)*t,t,pose.dir,equipped);
}
function board(cv){const[c,w,h]=setup(cv);c.fillStyle=P.stage;c.fillRect(0,0,w,h);const small=w<450,pad=small?13:31,t=Math.min((w-pad*2)/13,(h-pad*2)/8),ox=(w-13*t)/2,oy=(h-8*t)/2;
 round(c,ox-10,oy-10,13*t+20,8*t+20,small?7:11,P.frameRim);round(c,ox-8,oy-8,13*t+16,8*t+16,small?6:9,P.frame);round(c,ox-2,oy-2,13*t+4,8*t+4,2,P.frameInner);
 map(c,grid,ox,oy,t);
 if(!small){for(const[x,y]of [[ox-5,oy-5],[ox+13*t+5,oy-5],[ox-5,oy+8*t+5],[ox+13*t+5,oy+8*t+5]]){c.beginPath();c.arc(x,y,1.8,0,Math.PI*2);c.fillStyle=P.frameRim;c.fill()}}
}
function drawAll(){
 document.querySelectorAll('[data-board]').forEach(board);
 document.querySelectorAll('[data-robot]').forEach(cv=>{const[c,w,h]=setup(cv);robot(c,w/2,h/2,Math.min(w,h)*(cv.dataset.size?1:.9),cv.dataset.robot,cv.dataset.equipped==='true')});
 document.querySelectorAll('[data-sense]').forEach(cv=>{const[c,w,h]=setup(cv);const kind=cv.dataset.sense,rows=['...','..'+(kind==='wall'?'#':kind==='hole'?'H':'.'),'...'];const t=Math.min((w-32)/3,(h-22)/3),ox=(w-3*t)/2,oy=(h-3*t)/2;round(c,ox-3,oy-3,t*3+6,t*3+6,5,P.frame);map(c,rows,ox,oy,t)});
}
drawAll();window.addEventListener('resize',drawAll);window.CONCEPT={theme,grid,drawAll};
