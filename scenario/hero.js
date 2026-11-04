// The opening spread: a storybook lying open, pages curving up, and a pop-up of the whole journey
// rising from the gutter. A button leads into the book.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const Q = new URLSearchParams(location.search);
const REDUCE = Q.has('still') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const skip = /^#p\d+$/.test(location.hash) || Q.has('nohero');
const hero = document.getElementById('hero');
if (hero && skip) hero.remove();
else if (hero) start();

function start(){
  const clamp = v => Math.min(1, Math.max(0, v)), smooth = t => t*t*(3-2*t), ease = (t,a,b) => smooth(clamp((t-a)/(b-a)));
  const easeBack = t => { const c = 1.6; t -= 1; return 1 + (c+1)*t*t*t + c*t*t; };
  let renderer;
  try { renderer = new THREE.WebGLRenderer({antialias:true, alpha:true}); } catch(e){ hero.remove(); return; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  hero.prepend(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, .1, 80);
  scene.add(new THREE.HemisphereLight('#fff2df', '#6b4a35', 1.5));
  const sun = new THREE.DirectionalLight('#ffe9c8', 2.3); sun.position.set(-4, 8, 5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left:-7, right:7, top:6, bottom:-6}); sun.shadow.bias = -.0005; sun.shadow.radius = 4; scene.add(sun);
  const warm = new THREE.PointLight('#ffcf8a', 6, 8); warm.position.set(0, 2.5, 1.5); scene.add(warm);

  // ---------- page paper with faint printed lines
  function pageTexture(side){
    const c = document.createElement('canvas'); c.width = 1024; c.height = 768; const x = c.getContext('2d');
    x.fillStyle = '#fbf5ea'; x.fillRect(0, 0, 1024, 768);
    const g = x.createLinearGradient(side < 0 ? 1024 : 0, 0, side < 0 ? 760 : 264, 0); g.addColorStop(0, 'rgba(120,80,40,.22)'); g.addColorStop(1, 'rgba(120,80,40,0)');
    x.fillStyle = g; x.fillRect(0, 0, 1024, 768);
    x.fillStyle = 'rgba(70,50,40,.18)';
    const cols = side < 0 ? [[90, 470]] : [[560, 940]];
    cols.forEach(([a, b]) => { for (let y = 120; y < 690; y += 22) { if ((y / 22 | 0) % 9 === 0) continue; const w = (b - a) * (.75 + .25 * Math.abs(Math.sin(y * 1.7))); x.fillRect(a, y, w, 5); } });
    if (side > 0) {
      x.fillStyle = '#9c2f4f'; x.textAlign = 'center';
      x.font = '28px Kalam, cursive'; x.fillText('a storybook by', 750, 80);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  // ---------- the open book: two curved pages, a page block, a berry cover
  const PW = 3.6, PD = 2.9;
  const book = new THREE.Group(); scene.add(book);
  const curve = u => .42 * Math.sin(Math.PI * Math.pow(u, .45)) * (1 - .45 * u);
  const pages = [-1, 1].map(side => {
    const geo = new THREE.PlaneGeometry(PW, PD, 48, 1); geo.rotateX(-Math.PI/2); geo.translate(side * PW/2, 0, 0);
    const base = geo.attributes.position.array.slice();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({map: pageTexture(side), roughness:.95, side:THREE.DoubleSide}));
    m.receiveShadow = true; m.castShadow = true; book.add(m);
    return {m, geo, base, side};
  });
  function bend(k){
    pages.forEach(({geo, base}) => { const a = geo.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) { const u = Math.abs(base[i]) / PW; a[i+1] = .2 + curve(u) * k; }
      geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); });
  }
  const block = new THREE.Mesh(new THREE.BoxGeometry(PW*2 - .1, .18, PD - .06), new THREE.MeshStandardMaterial({color:'#efe4d0', roughness:.9}));
  block.position.y = .1; block.castShadow = block.receiveShadow = true; book.add(block);
  const cover = new THREE.Mesh(new THREE.BoxGeometry(PW*2 + .25, .05, PD + .2), new THREE.MeshStandardMaterial({color:'#9c2f4f', roughness:.7}));
  cover.position.y = .025; cover.receiveShadow = true; book.add(cover);
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(.08, .01, .9), new THREE.MeshStandardMaterial({color:'#c8a24a'})); ribbon.position.set(.05, .02, PD/2 + .35); book.add(ribbon);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.ShadowMaterial({opacity:.35})); shadow.rotation.x = -Math.PI/2; shadow.receiveShadow = true; scene.add(shadow);

  // ---------- video helpers (white background keyed away)
  function video(src, loop){ const v = document.createElement('video'); v.src = src; v.muted = true; v.loop = loop; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; return v; }
  function keyed(tex){ const m = new THREE.MeshBasicMaterial({map:tex, side:THREE.DoubleSide, transparent:true});
    m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n float kmin = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b)); if (kmin > 0.86) discard;'); }; return m; }
  const loader = new THREE.TextureLoader();
  function still(src, crop, h){ // illustrated cut-out from a Scenario sheet, alpha-cut
    const t = loader.load(src); t.colorSpace = THREE.SRGBColorSpace;
    if (crop) { const [x0,y0,x1,y1,W,H] = crop; t.offset.set(x0/W, 1 - y1/H); t.repeat.set((x1-x0)/W, (y1-y0)/H); }
    const aspect = crop ? (crop[2]-crop[0])/(crop[3]-crop[1]) : 1;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(h*aspect, h), new THREE.MeshStandardMaterial({map:t, alphaTest:.45, side:THREE.DoubleSide, roughness:.9}));
    m.customDepthMaterial = new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking, map:t, alphaTest:.45}); m.castShadow = true; m.position.y = h/2; return m;
  }
  // a pop-up piece: the still illustration, then its Kling clip takes over once it stands
  const pieces = [], vids = [];
  function popup(src, crop, h, clip, x, z, ry, at){
    const pivot = new THREE.Group(); pivot.position.set(x, .2, z); pivot.rotation.y = ry; book.add(pivot);
    const hinge = new THREE.Group(); pivot.add(hinge);
    const s = still(src, crop, h); hinge.add(s);
    let cm = null;
    if (clip) { const v = video(clip.src, true); vids.push(v); const tex = new THREE.VideoTexture(v); tex.colorSpace = THREE.SRGBColorSpace;
      cm = new THREE.Mesh(new THREE.PlaneGeometry(clip.w, clip.h), keyed(tex)); cm.position.y = clip.y; cm.position.z = .01; cm.visible = false; hinge.add(cm); cm.userData.v = v; }
    pieces.push({hinge, s, cm, at}); hinge.rotation.x = -Math.PI/2;
  }
  // the journey, back to front: San Francisco, the cabin, the Duomo, and Ursula waving in front
  const sfH = 1.9, cabH = 1.6, duoH = 1.75;
  popup('art/sf.png', [71,38,2000,1310,2048,1365], sfH, {src:'clips/sf-art.mp4', w:sfH*1.515/0.86, h:sfH/0.748, y:sfH/2}, 0, -.75, 0, .9);
  popup('art/cabin.png', [43,61,2011,1998,2048,2048], cabH, {src:'clips/cabin-art.mp4', w:cabH*1.016/0.86, h:cabH/0.748, y:cabH/2}, -1.55, -.35, .38, 1.2);
  popup('art/duomo.png', [0,0,2048,1707,2048,1707], duoH, {src:'clips/duomo-art.mp4', w:duoH*1.2/0.86, h:duoH/0.748, y:duoH/2}, 1.55, -.35, -.38, 1.4);
  const gH = .95;
  popup('art/outfits.png', [7,134,345,893,2048,1024], gH, {src:'clips/girl-milan.mp4', w:(gH/.86)*(720/1280), h:gH/.86, y:gH/2}, 0, .45, 0, 1.9);

  // the enchanted portrait lying on the left page
  const pv = video('clips/cover.mp4', true); vids.push(pv);
  const ptex = new THREE.VideoTexture(pv); ptex.colorSpace = THREE.SRGBColorSpace;
  const frame = new THREE.Group();
  const card = new THREE.Mesh(new THREE.BoxGeometry(1.05, .02, 1.5), new THREE.MeshStandardMaterial({color:'#fffdf8', roughness:.8})); card.castShadow = true; frame.add(card);
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.2), new THREE.MeshBasicMaterial({map:ptex})); photo.rotation.x = -Math.PI/2; photo.position.set(0, .012, -.08); frame.add(photo);
  frame.position.set(-2.25, .75, .45); frame.rotation.set(-.95, .18, .04); book.add(frame);

  // golden dust drifting over the book
  const N = 260, pos = new Float32Array(N*3), seed = [];
  for (let i = 0; i < N; i++) { seed.push([Math.random()*7-3.5, Math.random()*2.6, Math.random()*3-1.6, Math.random()*6]); }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sprite = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,'rgba(255,245,210,1)'); g.addColorStop(.3,'rgba(255,205,110,.7)'); g.addColorStop(1,'rgba(255,190,80,0)'); x.fillStyle = g; x.fillRect(0,0,64,64); return new THREE.CanvasTexture(c); })();
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({size:.07, map:sprite, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0}));
  scene.add(dust);

  // ---------- camera, sizing, loop
  let px = 0, py = 0;
  addEventListener('pointermove', e => { px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5; });
  function size(){ const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w/h; camera.fov = w/h < .8 ? 44 : 32; camera.updateProjectionMatrix(); }
  addEventListener('resize', size); size();
  let t = REDUCE ? 9 : 0, last = performance.now(), running = true, started = false;
  function frameAt(t){
    bend(ease(t, .2, 1.4));
    pieces.forEach(p => { const k = clamp((t - p.at)/1.1); p.hinge.rotation.x = -Math.PI/2 * (1 - easeBack(k)); p.hinge.visible = k > 0;
      if (p.cm && k >= 1 && !p.cm.visible) { p.cm.visible = true; p.s.visible = false; const pr = p.cm.userData.v.play(); if (pr && pr.catch) pr.catch(() => {}); } });
    frame.position.y = .75 + (1 - ease(t, 1, 2.2)) * 1.2; frame.rotation.z = (1 - ease(t, 1, 2.2)) * .6;
    if (t > 2 && pv.paused && !pv.ended) { const pr = pv.play(); if (pr && pr.catch) pr.catch(() => {}); }
    for (let i = 0; i < N; i++) { const [x, y, z, ph] = seed[i]; pos.set([x + Math.sin(t*.4 + ph)*.25, .35 + ((y + t*.18) % 2.6), z + Math.cos(t*.3 + ph)*.2], i*3); }
    dustGeo.attributes.position.needsUpdate = true; dust.material.opacity = ease(t, 1.5, 3) * .9;
    const w = innerWidth / innerHeight < .8;
    camera.position.set(Math.sin(t*.15)*.35 + px*.8, (w ? 9.6 : 4.2) - py*.5, w ? 14.5 : 8.1);
    camera.lookAt(0, w ? 1.1 : .95, -.1);
    renderer.render(scene, camera);
  }
  function loop(now){ if (!running) return; t += Math.min(.05, (now - last)/1000); last = now; frameAt(t); requestAnimationFrame(loop); }
  Promise.all(['600 60px "Cormorant Garamond"', '28px Kalam'].map(f => document.fonts.load(f))).catch(() => {}).then(() => {
    pages.forEach(p => { p.m.material.map = pageTexture(p.side); p.m.material.needsUpdate = true; });
    if (REDUCE) { pieces.forEach(p => {}); frameAt(t); } else requestAnimationFrame(loop);
  });

  function enter(){
    if (!hero.isConnected) return;
    hero.classList.add('gone'); running = false; vids.forEach(v => v.pause());
    setTimeout(() => { renderer.dispose(); hero.remove(); }, 900);
  }
  hero.querySelector('#hero-enter').addEventListener('click', enter);
  addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { if (hero.isConnected) { e.stopPropagation(); enter(); } } }, true);
}
