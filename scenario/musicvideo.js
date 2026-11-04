// "The music video": a paper train carries mini-Ursula through every stop of her story,
// changing outfit at each station, on an original soundtrack made live in the browser.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const STOPS = [
  {city:'Milano', line:'Università Cattolica', sub:'Communication & Advertising', outfit:'student', land:'brick'},
  {city:'Boston', line:'A first taste of America', sub:'Summer Program in Marketing', outfit:'student', land:'boston'},
  {city:'Milano', line:'MIP Politecnico', sub:'Master in Marketing & Customer Analytics', outfit:'student', land:'glass'},
  {city:'Antwerp', line:'University of Antwerp', sub:'Business & Economics', outfit:'student', land:'gables'},
  {city:'Milano', line:"L'Oréal Brandstorm", sub:'6 finalists out of 280. It rained. Then the sun came back.', outfit:'milan', land:'stage', rain:true},
  {city:'Milano', line:'Tell-Me · SLB Coaching Academy', sub:'First startup, first stories', outfit:'work', land:'phone'},
  {city:'Zurich · Bern · Lugano', line:'Accenture Song', sub:'Five projects, four roles', outfit:'work', land:'alps'},
  {city:'The Pinewood', line:'The Plushy Society', sub:'A world I built on my own', outfit:'plushy', land:'cabin'},
  {city:'Barcelona', line:'Didit · YC W26', sub:'Launch night', outfit:'summer', land:'palms'},
  {city:'San Francisco', line:'Next stop', sub:'The next chapter is unwritten', outfit:'travel', land:'sf'},
];
const BOX = {milan:[7,134,345,893], student:[349,133,683,899], work:[684,133,1014,895], plushy:[1018,114,1350,903], summer:[1338,114,1712,903], travel:[1702,114,2040,903]};
const GAP = 9, STAY = 3.2, RIDE = 1.9, INTRO = 4.2;
const clamp = v => Math.min(1, Math.max(0, v)), smooth = t => t*t*(3-2*t), lerp = THREE.MathUtils.lerp;

const mv = document.getElementById('mv');
document.querySelectorAll('[data-mv-open]').forEach(b => b.addEventListener('click', open));
let built = null;

function open(){
  mv.hidden = false; requestAnimationFrame(() => mv.classList.add('on'));
  if (!built) built = build();
  built.play();
}
function close(){ mv.classList.remove('on'); built && built.stop(); setTimeout(() => { mv.hidden = true; }, 600); }
mv.querySelector('.mv-close').addEventListener('click', close);
mv.querySelector('.mv-story').addEventListener('click', () => { close(); const h = document.getElementById('hero-enter'); h && h.click(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !mv.hidden) close(); });

function build(){
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mv.prepend(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#f3e7d3'); scene.fog = new THREE.Fog('#f3e7d3', 14, 30);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 80);
  const hemi = new THREE.HemisphereLight('#fff7ea', '#c9b495', 1.7); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1dc', 2.2); sun.position.set(-4, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 1024);
  Object.assign(sun.shadow.camera, {left:-12, right:12, top:6, bottom:-6}); scene.add(sun, sun.target);
  const mat = c => new THREE.MeshStandardMaterial({color:c, roughness:.9, side:THREE.DoubleSide});
  const box = (w,h,d,c,x=0,y=0,z=0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat(c)); m.position.set(x,y+h/2,z); m.castShadow = m.receiveShadow = true; return m; };
  const cone = (r,h,c,x=0,y=0,z=0,s=8) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r,h,s), mat(c)); m.position.set(x,y+h/2,z); m.castShadow = true; return m; };
  const cut = (pts,c,d=.06) => { const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0],p[1]))); const g = new THREE.ExtrudeGeometry(sh,{depth:d,bevelEnabled:false}); g.translate(0,0,-d/2); const m = new THREE.Mesh(g, mat(c)); m.castShadow = true; return m; };
  const loader = new THREE.TextureLoader();
  const tex = src => { const t = loader.load(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  function artPlane(src, crop, h){ const t = tex(src); const [x0,y0,x1,y1,W,H] = crop; t.offset.set(x0/W, 1-y1/H); t.repeat.set((x1-x0)/W, (y1-y0)/H);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(h*(x1-x0)/(y1-y0), h), new THREE.MeshStandardMaterial({map:t, alphaTest:.45, side:THREE.DoubleSide, roughness:.9}));
    m.customDepthMaterial = new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking, map:t, alphaTest:.45}); m.castShadow = true; m.position.y = h/2; return m; }
  function sign(l1, l2, w){ const c = document.createElement('canvas'); c.width = 1024; c.height = 300; const x = c.getContext('2d');
    x.fillStyle = '#2b3550'; x.fillRect(0,0,1024,300); x.strokeStyle = '#f3d38c'; x.lineWidth = 8; x.strokeRect(14,14,996,272);
    x.fillStyle = '#fbf6ec'; x.textAlign = 'center'; x.textBaseline = 'middle'; let s = 120; do { x.font = `600 ${s}px "Cormorant Garamond", serif`; s -= 4; } while (x.measureText(l1).width > 920);
    x.fillText(l1, 512, l2 ? 125 : 150); if (l2) { x.fillStyle = '#f3d38c'; x.font = '44px Kalam, cursive'; x.fillText(l2, 512, 230); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w*300/1024), new THREE.MeshStandardMaterial({map:t, roughness:.8})); m.position.y = .9 + w*150/1024; m.castShadow = true; g.add(m);
    g.add(box(.05,.9,.05,'#3a2a22',-w/2+.15)); g.add(box(.05,.9,.05,'#3a2a22',w/2-.15)); return g; }
  function house(w,h,d,c,r='#b5553c'){ const g = new THREE.Group(); g.add(box(w,h,d,c)); const rf = cut([[-w/2-.04,0],[w/2+.04,0],[0,h*.5]],r,d+.06); rf.position.y = h; g.add(rf); return g; }
  function landmark(kind){ const g = new THREE.Group();
    const add = (o, x, z) => { o.position.x = x; o.position.z = z; g.add(o); return o; };
    if (kind === 'brick'){ add(box(2.2,1.2,.8,'#c9805f'),0,0); add(box(.6,1.9,.9,'#bf7355'),0,0); }
    if (kind === 'boston'){ add(box(2,1.3,.8,'#a9503c'),0,0); for(let i=0;i<4;i++) add(box(.08,1.05,.08,'#f6efe4'),-.3+i*.2,.5); }
    if (kind === 'glass'){ add(box(1.8,1.6,.8,'#9fb3c2'),0,0); }
    if (kind === 'gables'){ [-.8,0,.8].forEach((x,i) => { const h = house(.7, 1 + (i%2)*.3, .6, ['#b45f45','#d3a275','#9e4d3a'][i], '#7a3f2c'); add(h,x,0); }); }
    if (kind === 'stage'){ add(box(2.4,.15,1,'#3a2a22'),0,0); add(box(2.6,1.4,.08,'#2c2228'),0,-.5); const l = add(box(.3,.9,.3,'#d9b45a'),1.6,0); l.add(box(.24,.4,.24,'#b8203a',0,.45)); }
    if (kind === 'phone'){ add(box(.8,1.5,.1,'#2f2a2e'),0,0); add(box(.68,1.25,.02,'#cfe3e8',0,.12),0,.06); }
    if (kind === 'alps'){ [[-1.2,2.4,1.9],[.6,2.8,2.2],[2.2,2,1.6]].forEach(([x,w,h]) => { add(cut([[-w/2,0],[0,h],[w/2,0]],'#9fb0bf',.2),x,-.4); add(cut([[-w*.16,h*.68],[0,h],[w*.16,h*.68]],'#ffffff',.22),x,-.39); }); }
    if (kind === 'cabin'){ add(artPlane('art/cabin.png',[43,61,2011,1998,2048,2048],2.2),0,0); }
    if (kind === 'palms'){ add(box(1.8,1,.7,'#f4f1ea'),0,0); [-1.4,1.4].forEach(x => { add(box(.06,1.3,.06,'#9a7451'),x,.3); add(cone(.45,.3,'#6f9a5c',0,0,0,6),x,.3).position.y = 1.4; }); }
    if (kind === 'sf'){ add(artPlane('art/sf.png',[71,38,2000,1310,2048,1365],2.2),0,0); }
    return g; }

  // world: a long paper strip, the track, the stations
  const world = new THREE.Group(); scene.add(world);
  const L = STOPS.length * GAP + 12;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(L + 30, 14), mat('#f6ead6')); ground.rotation.x = -Math.PI/2; ground.position.x = L/2 - 6; ground.receiveShadow = true; world.add(ground);
  const pal = ['#efd9c8','#e6e9d4','#f3dfbf','#e0e6ee','#f1d2d6']; let sd = 5; const rnd = () => (sd = (sd*9301+49297)%233280)/233280;
  for (let i = 0; i < 140; i++){ const p = new THREE.Mesh(new THREE.PlaneGeometry(.8+rnd()*1.6, .5+rnd()*1.1), mat(pal[i%5])); p.rotation.set(-Math.PI/2, 0, rnd()-.5); p.position.set(-6 + rnd()*(L+12), .004, -3.5 + rnd()*7); p.receiveShadow = true; world.add(p); }
  for (let x = -6; x < L + 6; x += .45) world.add(box(.12,.03,.9,'#8a6446',x,0,1.2));
  world.add(box(L+14,.04,.05,'#5d5d5d',L/2-1,.03,.85)); world.add(box(L+14,.04,.05,'#5d5d5d',L/2-1,.03,1.55));
  const stations = STOPS.map((s, i) => { const x = i * GAP + 4; const g = new THREE.Group(); g.position.x = x; world.add(g);
    const sg = sign(s.city, '', 2.2); sg.position.set(-1.9, 0, -.15); g.add(sg);
    const lm = landmark(s.land); lm.position.set(1.4, 0, -1.9); g.add(lm);
    const pl = box(5,.12,.9,'#d9cbb5',0,0,.3); g.add(pl);
    [lm, sg].forEach(o => { o.userData.h = o; o.scale.y = .001; });
    return {x, g, lm, sg}; });

  // the train, with Ursula leaning out of the first carriage
  const train = new THREE.Group(); scene.add(train);
  [0,1,2].forEach(i => { const c = new THREE.Group(); c.add(box(1.9,.62,.7,i ? '#c8303a' : '#9c2f4f',0,.12)); c.add(box(1.96,.08,.76,'#f3e3c3',0,.74));
    for (let j=0;j<3;j++) c.add(box(.34,.24,.01,'#f6efe4',-.6+j*.6,.38,.356)); c.add(box(1.9,.1,.6,'#3a2a22'));
    [-.6,.6].forEach(x => { const w = new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.72,16), mat('#2a2a2a')); w.rotation.x = Math.PI/2; w.position.set(x,.14,0); c.add(w); });
    c.position.x = -i*2.05; train.add(c); });
  const chimney = box(.18,.35,.18,'#3a2a22',.6,.82); train.add(chimney);
  train.position.z = 1.2;
  const sheet = tex('art/outfits.png'); const sprites = {};
  Object.entries(BOX).forEach(([k,[x0,y0,x1,y1]]) => { const t = sheet.clone(); t.offset.set(x0/2048, 1-y1/1024); t.repeat.set((x1-x0)/2048, (y1-y0)/1024); t.needsUpdate = true;
    const h = 1.05, m = new THREE.Mesh(new THREE.PlaneGeometry(h*(x1-x0)/(y1-y0), h), new THREE.MeshStandardMaterial({map:t, alphaTest:.45, side:THREE.DoubleSide}));
    m.customDepthMaterial = new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking, map:t, alphaTest:.45}); m.castShadow = true; m.visible = false; sprites[k] = m; scene.add(m); });
  // steam puffs and sparkles
  const puffs = [...Array(14)].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), new THREE.MeshStandardMaterial({color:'#ffffff', transparent:true, opacity:0})); scene.add(m); return {m, t:Math.random()*2}; });
  const NS = 90, spPos = new Float32Array(NS*3), spSeed = [...Array(NS)].map(() => [Math.random()*Math.PI*2, Math.random(), Math.random()]);
  const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'rgba(255,245,210,1)'); g.addColorStop(.35,'rgba(255,200,100,.7)'); g.addColorStop(1,'rgba(255,190,80,0)'); x.fillStyle = g; x.fillRect(0,0,64,64); return new THREE.CanvasTexture(c); })();
  const sparkle = new THREE.Points(spGeo, new THREE.PointsMaterial({size:.12, map:dot, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0})); scene.add(sparkle);
  const NR = 200, rPos = new Float32Array(NR*6), rSeed = [...Array(NR)].map(() => [Math.random()*6-3, Math.random(), Math.random()*4-2]);
  const rGeo = new THREE.BufferGeometry(); rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
  const rain = new THREE.LineSegments(rGeo, new THREE.LineBasicMaterial({color:'#6f93b8', transparent:true, opacity:0})); rain.frustumCulled = false; scene.add(rain);

  // ---------- timeline
  const T = []; let tt = INTRO;
  STOPS.forEach((s, i) => { const arrive = tt + RIDE; T.push({i, depart: tt, arrive, leave: arrive + STAY}); tt = arrive + STAY; });
  const END = tt + 3;
  function trainX(t){ if (t < INTRO) return -10 + (t/INTRO) * 4; for (const s of T) { if (t < s.arrive) { const k = smooth((t - s.depart)/RIDE); const from = s.i ? STOPS.length && T[s.i-1] && stations[s.i-1].x + .6 : -6; return lerp(from, stations[s.i].x + .6, k); } if (t < s.leave) return stations[s.i].x + .6; } return stations[STOPS.length-1].x + .6 + (t - T[T.length-1].leave) * 2.5; }
  const cap = mv.querySelector('.mv-cap'), capK = cap.querySelector('small'), capL = cap.querySelector('strong'), capS = cap.querySelector('span');
  const intro = mv.querySelector('.mv-intro'); let lastStop = -2;
  function setCaption(i){ if (i === lastStop) return; lastStop = i; cap.classList.remove('on');
    setTimeout(() => { if (i < 0) return; const s = STOPS[i]; capK.textContent = s.city; capL.textContent = s.line; capS.textContent = s.sub; cap.classList.add('on'); }, 260); }

  let t = 0, last = 0, running = false, outfit = null, burst = -9, faded = false;
  function frame(t){
    const x = trainX(t); train.position.x = x;
    train.children.forEach((c, j) => { if (c.children.length > 5) c.position.y = Math.abs(Math.sin(t*14 + j))*.012; });
    let cur = -1, atStop = false; T.forEach(s => { if (t >= s.arrive - .3 && t < s.leave) { cur = s.i; atStop = true; } });
    const next = T.find(s => t < s.leave); const want = next ? STOPS[next.i].outfit : 'travel';
    if (want !== outfit) { if (outfit) sprites[outfit].visible = false; outfit = want; sprites[outfit].visible = true; burst = t; }
    const sp = sprites[outfit]; const hop = atStop ? Math.abs(Math.sin((t - (T[cur] ? T[cur].arrive : 0)) * 5)) * .18 * clamp((T[cur].leave - t) / .6) : 0;
    sp.position.set(x - .35, .82 + .525 + hop, 1.2); sp.lookAt(camera.position.x, sp.position.y, camera.position.z);
    sp.rotation.z = atStop ? 0 : Math.sin(t*9)*.05;
    stations.forEach((st, i) => { const s = T[i]; const k = clamp((t - (s.arrive - 1.1)) / .9), e = k < 1 ? 1 + 1.7*Math.pow(k-1,3) + 1.7*0 : 1;
      const v = Math.max(.001, k < 1 ? (1 - Math.pow(1-k, 3)) * (1 + Math.sin(k*Math.PI)*.12) : 1); st.lm.scale.y = v; st.sg.scale.y = v; });
    // steam
    puffs.forEach((p, i) => { p.t += .016; const k = (p.t % 1.6) / 1.6; p.m.position.set(x + .6 - k*1.8, 1.25 + k*1.1, 1.2 + Math.sin(i)*.15); p.m.scale.setScalar(.6 + k*1.8); p.m.material.opacity = (1-k)*.55; });
    // outfit sparkle burst
    const bk = clamp((t - burst)/1.1); sparkle.material.opacity = bk < 1 ? (1 - bk) : 0;
    spSeed.forEach(([a, r, h], i) => { const rr = .2 + bk*(.6 + r*.6); spPos.set([sp.position.x + Math.cos(a + bk*3)*rr, sp.position.y - .3 + h*.9 + bk*.3, 1.2 + Math.sin(a + bk*3)*rr*.5], i*3); });
    spGeo.attributes.position.needsUpdate = true;
    // rain on the L'Oréal stop, then the sun comes back
    const R = T[4]; const rk = clamp((t - R.arrive + .2)/.4) * (1 - clamp((t - R.arrive - 1.8)/.5));
    rain.material.opacity = rk*.8; if (rk > 0) { rSeed.forEach(([a, b, c], i) => { const y = 3.2 - ((b + t*1.5) % 1) * 3.2, xx = x + a, z = 1.2 + c; rPos.set([xx, y, z, xx - .02, y - .22, z], i*6); }); rGeo.attributes.position.needsUpdate = true; }
    hemi.intensity = 1.7 - rk*.7;
    // captions
    setCaption(atStop ? cur : -1);
    intro.classList.toggle('on', t > .3 && t < INTRO - .4);
    const w = innerWidth / innerHeight < .8;
    camera.position.set(x + 1.2, w ? 5.6 : 4.3, w ? 13.5 : 10.2); camera.lookAt(x + 1.2, 1.1, -.4);
    sun.position.set(x - 4, 9, 6); sun.target.position.set(x, 0, 0);
    renderer.render(scene, camera);
  }
  function size(){ renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth/innerHeight; camera.fov = innerWidth/innerHeight < .8 ? 46 : 34; camera.updateProjectionMatrix(); }
  addEventListener('resize', size); size();
  const music = soundtrack();
  function loop(now){ if (!running) return; t += Math.min(.05, (now - last)/1000); last = now; frame(t);
    if (t > END) { mv.querySelector('.mv-end').classList.add('on'); if (!faded) { faded = true; music.fadeOut(); } }
    requestAnimationFrame(loop); }
  mv.querySelector('.mv-replay').addEventListener('click', () => { t = 0; faded = false; lastStop = -2; mv.querySelector('.mv-end').classList.remove('on'); music.restart(); });
  return {
    play(){ if (running) return; running = true; t = 0; faded = false; lastStop = -2; mv.querySelector('.mv-end').classList.remove('on'); last = performance.now(); music.start(); requestAnimationFrame(loop); },
    stop(){ running = false; music.stop(); },
    seek(x){ running = false; t = x; frame(t); setTimeout(() => frame(t), 1500); setTimeout(() => frame(t), 3500); }
  };
}

// ---------- soundtrack: "A Small Miracle" by Romarecord1973, Pixabay Content License (free to use)
function soundtrack(){
  const a = new Audio('audio/a-small-miracle.mp3'); a.preload = 'auto'; a.volume = 0;
  let fade = 0;
  const to = (v, ms, done) => { clearInterval(fade); const v0 = a.volume, t0 = performance.now();
    fade = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms); a.volume = v0 + (v - v0) * k; if (k >= 1) { clearInterval(fade); done && done(); } }, 30); };
  return {
    start(){ a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {}); to(.85, 1200); },
    stop(){ to(0, 600, () => a.pause()); },
    restart(){ a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {}); to(.85, 800); },
    fadeOut(){ to(0, 2500, () => a.pause()); }
  };
}

const MQ = new URLSearchParams(location.search).get('mvt');
if (MQ != null) { const h = document.getElementById('hero'); h && h.remove(); open(); built.stop(); built.seek(+MQ); }
