// Pop-up scenes for the storybook. One small three.js stage per .pop3d[data-scene] slot.
// Each stage starts when the book says its page is open, and pauses when it is not.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const Q = new URLSearchParams(location.search);
const STILL = Q.has('still');
const REDUCE = STILL || matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAPER = '#fbf6ec', INK = '#3a2a22', BERRY = '#9c2f4f', MARBLE = '#f3e7e0', GOLD = '#d7a84a', SKIN = '#f1c9a5', HAIR = '#3a2318';
const clamp = v => Math.min(1, Math.max(0, v)), smooth = t => t*t*(3-2*t);
const ease = (t, a, b) => smooth(clamp((t - a) / (b - a)));
const easeBack = t => { const c = 1.7; t -= 1; return 1 + (c+1)*t*t*t + c*t*t; };
const lerp = THREE.MathUtils.lerp;

// ---------------------------------------------------------------- materials & shapes
const mat = c => new THREE.MeshStandardMaterial({color:c, roughness:.9, side:THREE.DoubleSide});
const soft = c => new THREE.MeshStandardMaterial({color:c, roughness:.55});
function cut(pts, color, depth=.04){
  const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(s, {depth, bevelEnabled:false}); g.translate(0,0,-depth/2);
  const m = new THREE.Mesh(g, mat(color)); m.userData.c = color; return m;
}
function box(w,h,d,c,x=0,y=0,z=0){ const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat(c)); m.position.set(x,y+h/2,z); m.userData.c=c; return m; }
function cyl(r,h,c,x=0,y=0,z=0,seg=16,rt=r){ const m = new THREE.Mesh(new THREE.CylinderGeometry(rt,r,h,seg), mat(c)); m.position.set(x,y+h/2,z); m.userData.c=c; return m; }
function cone(r,h,c,x=0,y=0,z=0,seg=8){ const m = new THREE.Mesh(new THREE.ConeGeometry(r,h,seg), mat(c)); m.position.set(x,y+h/2,z); m.userData.c=c; return m; }
function ball(r,c,x=0,y=0,z=0){ const m = new THREE.Mesh(new THREE.SphereGeometry(r,16,12), mat(c)); m.position.set(x,y,z); m.userData.c=c; return m; }
function arch(w,h,c){ return cut([[-w/2,0],[w/2,0],[w/2,h*.7],[0,h],[-w/2,h*.7]], c, .03); }
function windows(g,w,h,d,rows,cols,c='#5d6c7c',y0=.13){
  for(let r=0;r<rows;r++) for(let k=0;k<cols;k++) g.add(box(.07,.11,.01,c,(k-(cols-1)/2)*(w/cols), y0+r*(h-y0-.08)/rows, d/2+.006));
}
function house(w,h,d,c,roofc='#b5553c',win='#5d6c7c'){
  const g = new THREE.Group(); g.add(box(w,h,d,c));
  const rf = cut([[-w/2-.03,0],[w/2+.03,0],[w/2-.08,.16],[-w/2+.08,.16]], roofc, d+.04); rf.position.y = h; g.add(rf);
  windows(g,w,h,d,Math.max(1,Math.round(h/.28)),Math.max(1,Math.round(w/.22)),win);
  g.add(box(.15,.21,.01,'#6b4a3a',0,0,d/2+.008)); return g;
}
function gable(w,h,c){
  const g = new THREE.Group(), st = 3, sw = w/(2*st+1), s = [[-w/2,0],[w/2,0]];
  for(let i=0;i<st;i++){ const x = w/2 - i*sw; s.push([x,h+i*.1],[x-sw,h+i*.1]); }
  s.push([sw/2,h+st*.1],[sw/2,h+st*.1+.09],[-sw/2,h+st*.1+.09],[-sw/2,h+st*.1]);
  for(let i=st-1;i>=0;i--){ const x = -w/2 + i*sw; s.push([x+sw,h+i*.1],[x,h+i*.1]); }
  g.add(cut(s,c,.4)); windows(g,w,h,.4,Math.max(1,Math.round(h/.3)),2,'#f3e6cf'); g.add(box(.13,.2,.01,'#4a2f20',0,0,.206)); return g;
}
function tree(h=.45,c='#86a86f'){ const g = new THREE.Group(); g.add(box(.035,h*.4,.035,'#8a6446')); const k = new THREE.Mesh(new THREE.IcosahedronGeometry(h*.3,0), mat(c)); k.position.y = h*.62; k.userData.c = c; g.add(k); return g; }
function pine(h=.6,c='#4f7a4d'){ const g = new THREE.Group(); g.add(box(.04,h*.25,.04,'#7d5539')); g.add(cone(h*.26,h*.5,c,0,h*.2,0,7)); g.add(cone(h*.19,h*.4,c,0,h*.48,0,7)); return g; }
function palm(h=.8){ const g = new THREE.Group(); const t = box(.04,h,.04,'#9a7451'); t.rotation.z = .1; g.add(t);
  for(let i=0;i<5;i++){ const f = cut([[0,0],[.34,.06],[.38,-.04],[.08,-.03]],'#6f9a5c',.015); f.position.set(.08,h,0); f.rotation.set(0,i*1.25,-.35); g.add(f); } return g; }
function lamp(){ const g = new THREE.Group(); g.add(box(.018,.36,.018,'#3a2a22')); g.add(box(.06,.05,.06,'#f3d38c',0,.36)); return g; }
function mountain(w,h,c){ const g = new THREE.Group(); g.add(cut([[-w/2,0],[0,h],[w/2,0]],c,.16));
  g.add(cut([[-w*.16,h*.68],[0,h],[w*.16,h*.68],[w*.05,h*.6],[-w*.06,h*.65]],'#ffffff',.18)); return g; }
function sign(l1, l2, w=1.4, post=.22){
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 380; const x = cv.getContext('2d');
  x.fillStyle = PAPER; x.fillRect(0,0,1024,380);
  x.strokeStyle = BERRY; x.lineWidth = 7; x.strokeRect(16,16,992,348); x.lineWidth = 2.5; x.strokeRect(32,32,960,316);
  x.fillStyle = INK; x.textAlign = 'center'; x.textBaseline = 'middle';
  let s = 112; do { x.font = `600 ${s}px "Cormorant Garamond", Georgia, serif`; s -= 4; } while (x.measureText(l1).width > 920);
  x.fillText(l1, 512, l2 ? 150 : 190);
  if(l2){ x.fillStyle = BERRY; s = 58; do { x.font = `${s}px Kalam, cursive`; s -= 2; } while (x.measureText(l2).width > 920); x.fillText(l2, 512, 278); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const h = w*380/1024, g = new THREE.Group(), side = mat(PAPER);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,.02), [side,side,side,side,new THREE.MeshStandardMaterial({map:tex, roughness:.9}),side]);
  m.position.y = post + h/2; m.userData.c = '#ffffff'; g.add(m);
  if(post > 0){ g.add(box(.03,post,.03,'#8a6446',-w/2+.1)); g.add(box(.03,post,.03,'#8a6446',w/2-.1)); }
  return g;
}

// ---------------------------------------------------------------- the little Ursula
// outfit: {lower:'skirt'|'coat'|'trousers', bottom, top, legs, hair, props:[...]}
function makeGirl(o = {}){
  const root = new THREE.Group(), all = [];
  const P = m => { m.castShadow = true; all.push(m); return m; };
  const bottom = o.bottom || BERRY, top = o.top || bottom, legsC = o.legs || '#2f2522', hairC = o.hair || HAIR;
  const hipY = o.lower === 'trousers' ? .2 : .12, legLen = o.lower === 'trousers' ? .15 : .07;
  const legs = [-.045,.045].map(x => { const piv = new THREE.Group(); piv.position.set(x,hipY,0);
    const l = P(new THREE.Mesh(new THREE.CapsuleGeometry(.027,legLen,4,8), soft(legsC))); l.position.y = -legLen/2 - .02; piv.add(l);
    const shoe = P(new THREE.Mesh(new THREE.SphereGeometry(.03,10,8), soft(o.shoes || '#3a2a22'))); shoe.scale.set(1,.6,1.4); shoe.position.set(0,-legLen-.045,.012); piv.add(shoe);
    root.add(piv); return piv; });
  let lower;
  if(o.lower === 'coat'){ lower = P(new THREE.Mesh(new THREE.CylinderGeometry(.08,.165,.33,22), soft(bottom))); lower.position.y = .2;
    const belt = P(new THREE.Mesh(new THREE.TorusGeometry(.086,.012,6,22), soft(o.belt || '#8a6446'))); belt.rotation.x = Math.PI/2; belt.position.y = .33; root.add(belt); }
  else if(o.lower === 'trousers'){ lower = P(new THREE.Mesh(new THREE.CylinderGeometry(.08,.105,.17,22), soft(bottom))); lower.position.y = .28; }
  else { lower = P(new THREE.Mesh(new THREE.CylinderGeometry(.075,.155,.25,22), soft(bottom))); lower.position.y = .235; }
  root.add(lower);
  const torso = P(new THREE.Mesh(new THREE.CylinderGeometry(.068,.08,.1,20), soft(top))); torso.position.y = .4; root.add(torso);
  if(o.collar){ const c = P(new THREE.Mesh(new THREE.ConeGeometry(.05,.05,12), soft(o.collar))); c.position.set(0,.43,.045); c.rotation.x = Math.PI; c.scale.z = .5; root.add(c); }
  const arms = [-1,1].map(sd => { const piv = new THREE.Group(); piv.position.set(sd*.085,.44,0);
    const a = P(new THREE.Mesh(new THREE.CapsuleGeometry(.024,.1,4,8), soft(o.sleeves || top))); a.position.y = -.07; piv.add(a);
    const hand = P(new THREE.Mesh(new THREE.SphereGeometry(.024,10,8), soft(SKIN))); hand.position.y = -.135; piv.add(hand);
    piv.rotation.z = sd*.22; root.add(piv); return piv; });
  const head = new THREE.Group(); head.position.y = .57; root.add(head);
  head.add(P(new THREE.Mesh(new THREE.SphereGeometry(.13,24,18), soft(SKIN))));
  const cap = P(new THREE.Mesh(new THREE.SphereGeometry(.142,24,18,0,Math.PI*2,0,Math.PI*.58), soft(hairC))); cap.rotation.x = -.45; cap.position.set(0,.01,-.012); head.add(cap);
  const back = P(new THREE.Mesh(new THREE.SphereGeometry(.135,20,14), soft(hairC))); back.scale.set(1.02,1.05,.7); back.position.set(0,-.04,-.06); head.add(back);
  [-.045,.045].forEach(x => { const e = P(new THREE.Mesh(new THREE.SphereGeometry(.013,8,8), soft('#2a1d18'))); e.position.set(x,0,.123); head.add(e); });
  [-.07,.07].forEach(x => { const c = P(new THREE.Mesh(new THREE.SphereGeometry(.018,8,8), soft('#eaa39a'))); c.position.set(x,-.035,.112); c.scale.z = .4; head.add(c); });
  const mouth = P(new THREE.Mesh(new THREE.TorusGeometry(.018,.005,4,10,Math.PI), soft(o.lips || '#9c4a4a'))); mouth.position.set(0,-.05,.126); mouth.rotation.z = Math.PI; head.add(mouth);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(.16,20), new THREE.MeshBasicMaterial({color:INK, transparent:true, opacity:.12, depthWrite:false}));
  blob.rotation.x = -Math.PI/2; blob.position.y = .003; root.add(blob);

  const props = {}, has = k => (o.props || []).includes(k);
  if(has('books')){ const b = new THREE.Group(); ['#2f5d8a','#c8553d','#e3b04b'].forEach((c,i) => b.add(P(box(.15,.032,.11,c,0,i*.034,0)))); b.position.set(0,.33,.1); b.rotation.x = -.15; root.add(b); props.books = b; }
  if(has('backpack')){ const b = P(box(.15,.17,.07,o.pack || '#5f7a8a',0,.3,-.1)); root.add(b); props.backpack = b; }
  if(has('briefcase')){ const b = new THREE.Group(); b.add(P(box(.13,.095,.035,'#5a3b2c',0,-.25))); b.add(P(box(.05,.015,.012,'#3a2a22',0,-.157))); arms[1].add(b); props.briefcase = b; }
  if(has('suitcase')){ const s = new THREE.Group(); s.add(P(box(.15,.21,.09,BERRY,0,.03))); s.add(P(box(.15,.02,.092,'#f3d38c',0,.12)));
    [-.05,.05].forEach(x => s.add(P(cyl(.02,.02,'#3a2a22',x,.01,0,10))));
    s.add(P(box(.012,.16,.012,'#3a2a22',0,.24))); s.position.set(.21,0,-.1); s.rotation.x = .25; root.add(s); props.suitcase = s; }
  if(has('hat')){ const h = new THREE.Group(); h.add(P(cyl(.21,.012,'#e7c98a',0,0,0,24))); h.add(P(cyl(.1,.07,'#e7c98a',0,.012,0,20))); h.add(P(cyl(.102,.022,BERRY,0,.016,0,20)));
    h.position.set(0,.09,-.01); h.rotation.x = -.15; head.add(h); props.hat = h; }
  if(has('badge')){ const b = new THREE.Group(); b.add(P(box(.045,.055,.008,'#ffffff',0,.33,.082))); b.add(P(box(.03,.008,.009,'#2f6bff',0,.37,.083))); root.add(b); props.badge = b; }
  if(has('mic')){ const m = new THREE.Group(); m.add(P(cyl(.012,.07,'#3a2a22',0,-.2))); m.add(P(ball(.02,'#5d5d5d',0,-.125))); arms[1].add(m); props.mic = m; m.visible = false; }
  if(has('gradcap')){ const g = new THREE.Group(); g.add(P(box(.24,.015,.24,'#1f1f24',0,.06))); g.add(P(cyl(.09,.06,'#1f1f24',0,0,0,16))); g.add(P(box(.01,.07,.01,'#e3b04b',.1,0,.1)));
    g.position.y = .1; head.add(g); g.visible = false; props.gradcap = g; }

  return {root, head, arms, legs, props, mouth, all,
    fade(k){ all.forEach(m => { m.material.transparent = k < 1; m.material.opacity = k; }); blob.material.opacity = .12*k; },
    pose({t=0, moving=false, speed=10, wave=0, sad=0, look=0, hop=0, hold=has('books'), cheer=0}={}){
      const ph = t*speed, sw = moving ? Math.sin(ph) : 0;
      legs[0].rotation.x = sw*.6; legs[1].rotation.x = -sw*.6;
      if(hold){ arms[0].rotation.set(-1.05,0,-.35); arms[1].rotation.set(-1.05,0,.35); }
      else { arms[0].rotation.set(-sw*.5*(1-sad*.7), 0, -.22 + sad*.1); arms[1].rotation.set(sw*.5*(1-sad*.7), 0, .22 - sad*.1); }
      if(props.briefcase) arms[1].rotation.x *= .4;
      if(props.suitcase) arms[1].rotation.set(.55,0,.35);
      if(wave){ arms[1].rotation.z = .22 + wave*2.4; arms[1].rotation.x = Math.sin(t*9)*.3*wave; }
      if(cheer){ arms[0].rotation.set(0,0,-.22 - cheer*2.5); arms[1].rotation.set(0,0,.22 + cheer*2.5); }
      head.rotation.x = -.2*look + .35*sad; head.rotation.z = wave ? Math.sin(t*3)*.06 : 0;
      root.position.y = (root.userData.base || 0) + (moving ? Math.abs(Math.sin(ph))*.022 : 0) + hop;
      mouth.rotation.z = sad > .5 ? 0 : Math.PI; mouth.position.y = sad > .5 ? -.062 : -.05;
    }};
}
function person(top, hair, opts={}){ return makeGirl({lower: opts.lower || 'skirt', bottom: opts.bottom || top, top, hair, legs: opts.legs, props: []}); }
function plushBear(c='#ffffff', s=1){
  const g = new THREE.Group(), m = x => { x.castShadow = true; return x; };
  const body = m(new THREE.Mesh(new THREE.SphereGeometry(.1*s,16,12), soft(c))); body.scale.set(1,.95,.9); body.position.y = .1*s; g.add(body);
  const head = m(new THREE.Mesh(new THREE.SphereGeometry(.085*s,16,12), soft(c))); head.position.y = .24*s; g.add(head);
  [-1,1].forEach(sd => { const e = m(new THREE.Mesh(new THREE.SphereGeometry(.032*s,10,8), soft(c))); e.position.set(sd*.06*s,.31*s,0); g.add(e); });
  const snout = m(new THREE.Mesh(new THREE.SphereGeometry(.035*s,10,8), soft('#f3ece4'))); snout.position.set(0,.225*s,.075*s); g.add(snout);
  const nose = m(new THREE.Mesh(new THREE.SphereGeometry(.012*s,8,6), soft('#2a1d18'))); nose.position.set(0,.235*s,.105*s); g.add(nose);
  [-1,1].forEach(sd => { const e = m(new THREE.Mesh(new THREE.SphereGeometry(.01*s,8,6), soft('#2a1d18'))); e.position.set(sd*.03*s,.26*s,.075*s); g.add(e); });
  return g;
}
// walk along keyframes [{x,z,t}]: between two frames she walks, on equal points she waits
function walker(keys){
  return t => {
    if(t <= keys[0].t) return {x:keys[0].x, z:keys[0].z, moving:false, dir:null};
    for(let i=0;i<keys.length-1;i++){ const a = keys[i], b = keys[i+1];
      if(t <= b.t){ const k = smooth((t-a.t)/(b.t-a.t)), still = a.x === b.x && a.z === b.z;
        return {x:lerp(a.x,b.x,k), z:lerp(a.z,b.z,k), moving:!still, dir: still ? null : Math.atan2(b.x-a.x, b.z-a.z)}; } }
    const l = keys[keys.length-1]; return {x:l.x, z:l.z, moving:false, dir:null};
  };
}


// ---------------------------------------------------------------- Scenario art: paper standees
const ART = {
  'girl-milan':   {src:'art/outfits.png', W:2048, H:1024, box:[7,134,345,893]},
  'girl-student': {src:'art/outfits.png', W:2048, H:1024, box:[349,133,683,899]},
  'girl-work':    {src:'art/outfits.png', W:2048, H:1024, box:[684,133,1014,895]},
  'girl-plushy':  {src:'art/outfits.png', W:2048, H:1024, box:[1018,114,1350,903]},
  'girl-summer':  {src:'art/outfits.png', W:2048, H:1024, box:[1338,114,1712,903]},
  'girl-travel':  {src:'art/outfits.png', W:2048, H:1024, box:[1702,114,2040,903]},
  duomo: {src:'art/duomo.png', W:2048, H:1707, box:[0,0,2048,1707]},
  sf:    {src:'art/sf.png',    W:2048, H:1365, box:[71,38,2000,1310]},
  cabin: {src:'art/cabin.png', W:2048, H:2048, box:[43,61,2011,1998]},
};
const texCache = {}, loader = new THREE.TextureLoader();
function artTex(name){
  const A = ART[name];
  if(!texCache[A.src]){ const t = loader.load(A.src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; texCache[A.src] = t; }
  const t = texCache[A.src].clone(); const [x0,y0,x1,y1] = A.box;
  t.offset.set(x0/A.W, 1 - y1/A.H); t.repeat.set((x1-x0)/A.W, (y1-y0)/A.H); t.needsUpdate = true;
  return {t, aspect: (x1-x0)/(y1-y0)};
}
function artPlane(name, h){
  const {t, aspect} = artTex(name), w = h*aspect;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshStandardMaterial({map:t, alphaTest:.45, side:THREE.DoubleSide, roughness:.9}));
  m.customDepthMaterial = new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking, map:t, alphaTest:.45});
  m.userData.c = '#ffffff'; m.userData.noink = true; m.castShadow = true; return {m, w};
}
// a big illustrated cut-out that folds up from the page, w = width in world units
function art(name, w, clipSrc){ const A = ART[name], [x0,y0,x1,y1] = A.box, h = w*(y1-y0)/(x1-x0); const {m} = artPlane(name, h); m.position.y = h/2; const g = new THREE.Group(); g.add(m);
  if(clipSrc){ const cp = clipPlane(clipSrc, w/0.86, h/0.748); cp.mesh.position.set(0, h/2, .01); g.add(cp.mesh); g.userData.clip = {cp, still:m}; }
  return g; }
// the illustrated mini-Ursula: a paper doll that always faces the reader
function makeSprite(key, camera){
  const root = new THREE.Group(), holder = new THREE.Group(); root.add(holder);
  const H = .86, {m:plane} = artPlane('girl-' + key, H); plane.position.y = H/2; holder.add(plane);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(.17,20), new THREE.MeshBasicMaterial({color:INK, transparent:true, opacity:.13, depthWrite:false}));
  blob.rotation.x = -Math.PI/2; blob.position.y = .003; root.add(blob);
  const clip = clipPlane('clips/girl-' + key + '.mp4', (H/.86)*(720/1280), H/.86); clip.mesh.position.y = H/2; holder.add(clip.mesh);
  const top = new THREE.Group(); top.position.y = H - .12; holder.add(top);
  const cap = new THREE.Group(); cap.add(box(.26,.016,.26,'#1f1f24',0,.06)); cap.add(cyl(.1,.06,'#1f1f24',0,0,0,16)); cap.add(box(.01,.08,.01,'#e3b04b',.11,0,.11)); cap.visible = false; top.add(cap);
  const dummy = () => new THREE.Object3D();
  return {root, all:[plane], props:{books:dummy(), backpack:dummy(), briefcase:dummy(), suitcase:dummy(), hat:dummy(), badge:dummy(), mic:dummy(), gradcap:dummy()}, clip,
    playClip(){ clip.play(() => { plane.visible = true; }, () => { plane.visible = false; }); }, arms:[dummy(),dummy()], head:dummy(),
    fade(k){ plane.material.transparent = k < 1; plane.material.opacity = k; blob.material.opacity = .13*k; if(clip.mesh.visible) clip.mesh.material.opacity = Math.min(clip.mesh.material.opacity, k); },
    pose({t=0, moving=false, wave=0, look=0, hop=0, cheer=0}={}){
      const ph = t*10;
      holder.position.y = (root.userData.base || 0) + (moving ? Math.abs(Math.sin(ph))*.035 : 0) + hop + (cheer ? Math.abs(Math.sin(t*7))*.09*cheer : 0);
      holder.rotation.z = moving ? Math.sin(ph)*.075 : (wave ? Math.sin(t*6)*.09*wave : 0);
      holder.rotation.x = -.1*look;
      plane.rotation.y = Math.atan2(camera.position.x - root.position.x, camera.position.z - root.position.z) - root.rotation.y;
      plane.scale.x = (moving && Math.sin(root.rotation.y) < -.2) ? -1 : 1;
      clip.mesh.rotation.y = plane.rotation.y; holder.rotation.z = clip.mesh.visible ? 0 : holder.rotation.z;
    }};
}
const SPRITE_FOR = {duomo:'milan', montage:'student', accenture:'work', plushy:'plushy', didit:'summer', sf:'travel'};


// ---------------------------------------------------------------- Kling clips on paper (white background keyed out)
let ACTIVE = 0;
function keyedMaterial(tex){
  const m = new THREE.MeshBasicMaterial({map:tex, side:THREE.DoubleSide, transparent:true, opacity:0});
  m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>',
    '#include <map_fragment>\n  float kmin = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));\n  if (kmin > 0.86) discard;\n  diffuseColor.a *= smoothstep(0.86, 0.74, kmin) * 0.6 + 0.4;'); };
  return m;
}
function clipPlane(src, w, h){
  const v = document.createElement('video'); v.src = src; v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
  const tex = new THREE.VideoTexture(v); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), keyedMaterial(tex)); mesh.visible = false; mesh.userData.noink = true; mesh.userData.noshadow = true; mesh.userData.c = '#ffffff';
  let on = false;
  return {mesh, video:v,
    play(onEnd, onShown){ if(on || REDUCE) return; on = true; ACTIVE++; v.currentTime = 0; const pr = v.play(); if(pr && pr.catch) pr.catch(() => {});
      mesh.visible = true; const t0 = performance.now(); let shown = false;
      (function fade(now){ const k = Math.min(1, (now - t0) / 450); mesh.material.opacity = k; if(k >= 1 && !shown){ shown = true; onShown && onShown(); } if(on && k < 1) requestAnimationFrame(fade); })(t0);
      v.onended = () => { const t1 = performance.now(); onEnd && onEnd();
        (function out(now){ const k = Math.min(1, (now - t1) / 450); mesh.material.opacity = 1 - k; if(k < 1) requestAnimationFrame(out); else { mesh.visible = false; on = false; ACTIVE = Math.max(0, ACTIVE - 1); } })(t1); }; },
    reset(){ if(on){ on = false; ACTIVE = Math.max(0, ACTIVE - 1); } v.pause(); mesh.visible = false; mesh.material.opacity = 0; }};
}

// ---------------------------------------------------------------- one stage
function stage(host){
  let renderer;
  try { renderer = new THREE.WebGLRenderer({antialias:true, alpha:true}); } catch(e){ return null; }
  renderer.setClearColor(0x000000, 0); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 2, .1, 80);
  const hemi = new THREE.HemisphereLight('#fff8ee', '#cdb89c', 1.75); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff3e0', 2.1);
  sun.position.set(-3.5, 7, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera, {left:-6, right:6, top:5, bottom:-5}); sun.shadow.bias = -.0006; sun.shadow.radius = 5;
  scene.add(sun, sun.target);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(24,14), new THREE.ShadowMaterial({opacity:.16}));
  catcher.rotation.x = -Math.PI/2; catcher.receiveShadow = true; scene.add(catcher);
  const world = new THREE.Group(); scene.add(world);
  const pieces = [], flats = [], pc = new THREE.Color(PAPER), tc = new THREE.Color();
  const mats = m => Array.isArray(m.material) ? m.material : [m.material];
  const S = {scene, camera, world, hemi, sun, renderer, girl:null, girlX:-99, walkEnd:99, px:0, py:0, hx:0, hz:0, hoverT:0, hoverK:0,
    add(obj, x, z, opts={}){
      const pivot = new THREE.Group(); pivot.position.set(x, opts.y || 0, z); pivot.rotation.y = opts.ry || 0;
      const inner = new THREE.Group(); inner.add(obj); pivot.add(inner);
      const meshes = [], lines = [];
      obj.traverse(o => { if(o.isMesh){ o.castShadow = o.receiveShadow = !o.userData.noshadow; meshes.push(o); } });
      meshes.forEach(m => {
        if(m.userData.noink){ mats(m).forEach(mm => mm.color.set(PAPER)); return; }
        const l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 28), new THREE.LineBasicMaterial({color:INK, transparent:true, opacity:0}));
        l.position.copy(m.position); l.rotation.copy(m.rotation); l.scale.copy(m.scale); m.parent.add(l); lines.push(l);
        mats(m).forEach(mm => mm.color.set(PAPER));
      });
      world.add(pivot);
      const p = {pivot, inner, meshes, lines, mode: opts.mode || 'hinge', t0:null, at:opts.at, near:opts.near, clip: obj.userData.clip};
      pieces.push(p); return p;
    },
    flat(w,d,x,z,rot,c,at){ const m = new THREE.Mesh(new THREE.PlaneGeometry(w,d), mat(c)); m.rotation.set(-Math.PI/2,0,rot); m.position.set(x,.002+flats.length*.0003,z);
      m.userData.c = c; m.receiveShadow = true; m.material.transparent = true; m.material.opacity = 0; world.add(m); flats.push({m, at}); return m; },
    ground(seed, cx, cz, rx, rz, pal, n=30){ let s = seed; const r = () => (s = (s*9301+49297)%233280)/233280;
      for(let i=0;i<n;i++){ const a = r()*Math.PI*2, d = Math.sqrt(r()); S.flat(.3+r()*.5, .25+r()*.4, cx+Math.cos(a)*d*rx, cz+Math.sin(a)*d*rz, r()*1.2-.6, pal[i%pal.length], i*.016); } },
    putGirl(outfit){ const g = S.spriteKey ? makeSprite(S.spriteKey, camera) : makeGirl(outfit); g.root.scale.setScalar(.95); world.add(g.root); S.girl = g; return g; },
    cam(x,y,z,lx,ly,lz){ camera.position.set(x + S.px*.3, y + S.py*.12, z); camera.lookAt(lx, ly, lz); },
    run(t){
      flats.forEach(f => { const k = clamp((t - f.at)/.5); f.m.material.opacity = k; f.m.material.color.copy(pc).lerp(new THREE.Color(f.m.userData.c), k); });
      pieces.forEach(p => {
        if(p.t0 == null){
          if(p.at != null && t >= p.at) p.t0 = p.at;
          else if(p.near != null && (S.girlX > p.near - .9 || t > S.walkEnd)) p.t0 = Math.min(t, S.walkEnd);
        }
        const k = p.t0 == null ? 0 : t - p.t0;
        const sk = clamp(k/.4), rise = clamp((k-.25)/.95), wash = clamp((k-.85)/.8), e = easeBack(rise);
        p.lines.forEach(l => l.material.opacity = sk * (1 - wash*.82));
        p.inner.visible = sk > 0;
        if(p.mode === 'hinge') p.inner.rotation.x = -Math.PI/2 * (1-e); else p.inner.scale.set(1, Math.max(.001,e), 1);
        p.meshes.forEach(m => { tc.copy(pc).lerp(new THREE.Color(m.userData.c || PAPER), wash); mats(m).forEach(mm => mm.color.copy(tc)); });
        const near = rise >= 1 ? S.hoverK * Math.exp(-((p.pivot.position.x - S.hx)**2 + (p.pivot.position.z - S.hz)**2) / .45) : 0;
        const was = p.w || 0; p.w = was + (near - was) * .18;
        if(was < .45 && p.w >= .45 && window.__bookAudio && t - (S.lastRustle || 0) > .25){ S.lastRustle = t; window.__bookAudio.rustle(); }
        p.inner.rotation.z = Math.sin(t*8 + p.pivot.position.x*3) * .05 * p.w; p.inner.position.y = .07 * p.w;
        if(p.clip && k > 1.9 && !p.clipDone){ p.clipDone = true; const c = p.clip; c.cp.play(() => { c.still.visible = true; }, () => { c.still.visible = false; }); }
      });
      S.hoverK += (S.hoverT - S.hoverK) * .1;
      if(S.girl && S.girl.playClip && !S.girlClipped && t > S.walkEnd + .35){ S.girlClipped = true; S.girl.playClip(); }
    },
    reset(){ pieces.forEach(p => { p.t0 = null; p.clipDone = false; if(p.clip){ p.clip.cp.reset(); p.clip.still.visible = true; } }); S.girlClipped = false; if(S.girl && S.girl.clip){ S.girl.clip.reset(); } }};
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0,1,0), -.35), hit = new THREE.Vector3();
  host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); S.px = (e.clientX-r.left)/r.width - .5; S.py = (e.clientY-r.top)/r.height - .5;
    ndc.set(S.px*2, -S.py*2); ray.setFromCamera(ndc, camera); if(ray.ray.intersectPlane(plane, hit)){ S.hx = hit.x; S.hz = hit.z; } S.hoverT = 1; S.kick && S.kick(); });
  host.addEventListener('pointerleave', () => { S.px = S.py = 0; S.hoverT = 0; });
  return S;
}

// ---------------------------------------------------------------- the scenes
const SCENES = {};

// I · Milan: the Duomo, and a small girl in her berry dress
SCENES.duomo = S => {
  const X = v => (v-160)/100, Y = v => (190-v)/100;
  const spire = (g,x,y,z,h=.26,w=.035) => { g.add(box(w,h*.55,w,MARBLE,x,y,z)); g.add(cone(w*.75,h*.45,MARBLE,x,y+h*.55,z,6)); };
  const f = new THREE.Group();
  f.add(cut([[50,190],[50,112],[100,96],[160,70],[220,96],[270,112],[270,190]].map(([x,y]) => [X(x),Y(y)]), MARBLE, .14));
  f.add(box(X(50)-X(8), Y(124), .14, MARBLE, (X(8)+X(50))/2)); f.add(box(X(312)-X(270), Y(124), .14, MARBLE, (X(270)+X(312))/2));
  [14,25,36,284,295,306].forEach(x => spire(f, X(x), Y(124), 0, .3, .03));
  [[50,112],[90,99],[130,83],[190,83],[230,99],[270,112]].forEach(([x,y]) => { f.add(box(.05,Y(y),.2,'#eadbd2',X(x),0,.02)); spire(f,X(x),Y(y),.02,.32,.045); });
  f.add(box(.2, Y(42)-Y(72), .14, MARBLE, 0, Y(72))); f.add(cone(.12,.1,MARBLE,0,Y(42),0,4)); f.add(box(.05,.26,.05,MARBLE,0,Y(32))); f.add(cone(.04,.12,MARBLE,0,Y(32)+.26,0,6));
  const mad = new THREE.Mesh(new THREE.OctahedronGeometry(.045), new THREE.MeshStandardMaterial({color:GOLD, metalness:.6, roughness:.3, emissive:'#5a3c08'})); mad.position.set(0,Y(6)+.1,0); mad.userData.c = GOLD; f.add(mad);
  [[160,32,.24],[106,16,.16],[214,16,.16],[71,14,.12],[249,14,.12]].forEach(([x,w,h]) => { const a = arch(w/100,h*1.1,'#6b4a3a'); a.position.set(X(x),0,.08); f.add(a); });
  [106,214].forEach(x => { const a = arch(.1,.2,'#7f8ea0'); a.position.set(X(x),Y(152),.08); f.add(a); });
  const rose = new THREE.Mesh(new THREE.TorusGeometry(.09,.018,6,24), mat('#d9c6bb')); rose.position.set(0,Y(120),.08); rose.userData.c = '#d9c6bb'; f.add(rose);
  const body = new THREE.Group(), D = 1.5, W = 2, H = .78; body.add(box(W,H,D,'#eee1d9',0,0,-D/2));
  const rf = cut([[-W/2+.1,0],[W/2-.1,0],[0,.32]],'#e2d3ca',D-.1); rf.position.set(0,H,-D/2); body.add(rf);
  for(let i=0;i<7;i++){ const z = -.12 - i*(D-.25)/6; spire(body,-W/2,H,z,.28); spire(body,W/2,H,z,.28); spire(body,-W/2+.35,H+.1,z,.2,.03); spire(body,W/2-.35,H+.1,z,.2,.03); }
  body.add(box(.36,.42,.36,MARBLE,0,H+.2,-.95)); body.add(cone(.2,.5,MARBLE,0,H+.62,-.95,8));
  S.ground(7, 0, -.25, 2.35, 1.3, ['#f6e6c8','#f1d9cf','#ece3c9','#f4dfd0','#efe6d3','#f3d9c4']);
  for(let i=0;i<9;i++){ const a = -.9 + i*.225; S.flat(.08,.9,Math.sin(a)*.65,.25+Math.cos(a)*.35,-a,'#e3d6c6',.4+i*.02); }
  S.add(art('duomo', 3.5, 'clips/duomo-art.mp4'), 0, -.75, {at:.9});
      const tram = new THREE.Group(); tram.add(box(.9,.3,.3,'#e8913a',0,.04)); tram.add(box(.94,.05,.33,'#f3e3c3',0,.34)); tram.add(box(.9,.04,.3,'#3a2a22'));
  for(let i=0;i<4;i++) tram.add(box(.14,.12,.01,'#5d6c7c',-.31+i*.21,.16,.155)); tram.add(box(.02,.22,.02,'#3a2a22',0,.39));
    S.add(tree(), -2.55, .1, {mode:'grow', near:-2.4}); S.add(tree(.5), 1.65, .35, {mode:'grow', near:.8}); S.add(tree(.4), 2.55, .55, {mode:'grow', near:1.2});
  S.add(lamp(), -.95, .95, {mode:'grow', near:-1.2}); S.add(lamp(), 1.05, .75, {mode:'grow', near:.3});
  const g = S.putGirl({lower:'skirt', bottom:BERRY});
  const path = walker([{x:-2.35,z:1.25,t:.45},{x:.05,z:.02,t:3.85}]); S.walkEnd = 3.85; const dir0 = Math.atan2(2.4,-1.23);
  return {end: 6, update(t){
    const p = path(t), app = clamp((t-.1)/.35);
    g.root.visible = app > 0; g.root.scale.setScalar(.95 * (app < 1 ? .4 + .6*easeBack(app) : 1));
    g.root.position.set(p.x, 0, p.z); S.girlX = p.x;
    g.root.rotation.y = p.dir != null ? p.dir : lerp(dir0, 0, ease(t, 3.85, 4.45));
    g.pose({t, moving:p.moving, look: ease(t,3.9,4.4)*(1-ease(t,4.6,5)), wave: ease(t,4.7,5.1), hop: app < 1 ? Math.sin(app*Math.PI)*.18 : 0});
    mad.rotation.y = t*1.4;
    const k = ease(t,.45,4.6); S.cam(lerp(-.55,0,k) + Math.sin(t*.35)*.12, 2.5, lerp(6.6,6,k), lerp(-.3,0,k), .95, -.6);
  }};
};

// II · The training montage: four campuses, books in her arms, a cap thrown at the end
SCENES.montage = S => {
  const schools = [
    {x:-3.3, l1:'Università Cattolica', l2:'Milan · 2017–2020', b(){ const g = new THREE.Group(), w=1.2, h=.7, d=.5; g.add(box(w,h,d,'#c9805f')); g.add(box(w+.06,.05,d+.06,'#e9d9c2',0,h));
        for(let i=0;i<5;i++){ const a = arch(.13,.22,'#f3e6cf'); a.position.set(-w/2+.15+i*(w-.3)/4,.3,d/2+.01); g.add(a); }
        g.add(box(.3,1.05,.55,'#bf7355')); const rf = cut([[-.18,0],[.18,0],[0,.22]],'#8f4a37',.57); rf.position.y = 1.05; g.add(rf); g.add(box(.13,.22,.01,'#5a3b2c',0,0,.28)); return g; }},
    {x:-1.1, l1:'Boston University', l2:'Boston · summer 2018', b(){ const g = new THREE.Group(), w=1.1, h=.75, d=.45; g.add(box(w,h,d,'#a9503c')); windows(g,w,h,d,2,5,'#f3e6cf');
        g.add(box(w+.06,.05,d+.06,'#efe5d6',0,h)); for(let i=0;i<4;i++) g.add(cyl(.025,h-.15,'#f6efe4',-.2+i*.13,0,d/2+.08,8)); g.add(box(.5,.06,.14,'#efe5d6',0,h-.15,d/2+.07));
        g.add(box(.012,.4,.012,'#3a2a22',.62,0,0)); g.add(box(.16,.1,.01,'#2f4a7a',.69,.3,0)); g.add(box(.16,.02,.012,'#c8303a',.69,.34,0)); return g; }},
    {x:1.1, l1:'MIP Politecnico di Milano', l2:'Master · 2020–2021', b(){ const g = new THREE.Group(), w=1, h=.85, d=.45; g.add(box(w,h,d,'#9fb3c2'));
        for(let r=0;r<3;r++) g.add(box(w+.02,.025,d+.02,'#e9eef0',0,.25+r*.22)); g.add(box(.3,.3,.02,'#3f5566',0,0,d/2+.01));
        const gas = new THREE.Group(); for(let i=0;i<8;i++){ const a = i/8*Math.PI*2; gas.add(box(.02,.9,.02,'#7c8a93',Math.cos(a)*.28,0,Math.sin(a)*.28)); }
        [.3,.6,.88].forEach(y => { const ring = new THREE.Mesh(new THREE.TorusGeometry(.28,.012,4,20), mat('#7c8a93')); ring.rotation.x = Math.PI/2; ring.position.y = y; ring.userData.c = '#7c8a93'; gas.add(ring); });
        gas.position.set(.8,0,-.15); g.add(gas); return g; }},
    {x:3.3, l1:'University of Antwerp', l2:'Antwerp · 2021', b(){ const g = new THREE.Group(); [['#b45f45',0,.75],['#d3a275',-.42,.6],['#9e4d3a',.42,.65]].forEach(([c,x,h]) => { const k = gable(.4,h,c); k.position.x = x; g.add(k); }); return g; }},
  ];
  S.ground(11, 0, -.1, 4.6, 1.1, ['#eef0e2','#f3e3cf','#e6e9dc','#f1dccf','#efe7d2'], 46);
  for(let i=0;i<22;i++) S.flat(.24,.08,-4.2+i*.4,.62+Math.sin(i*.9)*.05,.1*Math.sin(i),'#e8dcc8',.2+i*.02);
  schools.forEach(s => { S.add(s.b(), s.x, -.55, {near:s.x-.3}); S.add(sign(s.l1, s.l2, 1.15, .16), s.x, .2, {near:s.x+.1}); });
  [-4.3,-2.2,0,2.2,4.3].forEach((x,i) => S.add(tree(.45 + (i%2)*.1), x, -.05 + (i%2)*.2, {mode:'grow', near:x}));
  const g = S.putGirl({lower:'skirt', bottom:'#2f3e5c', top:'#e3b04b', legs:'#3a3030', props:['books','backpack','gradcap'], pack:'#c8553d'});
  const keys = [{x:-4.6,z:.7,t:.3}]; let tt = .3;
  schools.forEach(s => { tt += 1.5; keys.push({x:s.x-.1,z:.72,t:tt}); tt += .6; keys.push({x:s.x-.1,z:.72,t:tt}); });
  tt += .6; keys.push({x:3.75,z:.8,t:tt});
  const path = walker(keys), END = tt; S.walkEnd = END;
  return {end: END + 3, update(t){
    const p = path(t);
    g.root.position.set(p.x, 0, p.z); S.girlX = p.x;
    if(p.dir != null) g.root.rotation.y = p.dir;
    else if(t < END) g.root.rotation.y = Math.PI * .85;          // at each door she looks up at the building
    else g.root.rotation.y = lerp(Math.PI/2, 0, ease(t, END, END + .4));
    const toss = clamp((t - END - .4)/1.4);
    g.props.books.visible = t < END + .3; g.props.gradcap.visible = t > END + .3;
    if(toss > 0 && toss < 1){ g.props.gradcap.position.set(0, .1 + Math.sin(toss*Math.PI)*.9, 0); g.props.gradcap.rotation.y = toss*8; }
    else { g.props.gradcap.position.set(0,.1,0); g.props.gradcap.rotation.y = 0; }
    const cheer = t > END + .3 ? ease(t, END + .3, END + .6) * (1 - ease(t, END + 2.2, END + 2.7)) : 0;
    g.pose({t, moving:p.moving, hold: t < END + .3, look: p.dir == null && t < END ? .8 : 0, cheer, hop: toss > 0 && toss < .5 ? Math.sin(toss*2*Math.PI)*.1 : 0});
    const cx = THREE.MathUtils.clamp(p.x, -2.4, 2.4), fin = ease(t, END + .2, END + 2.2);
    S.cam(lerp(cx, 0, fin), lerp(1.9, 2.3, fin), lerp(3.9, 5.9, fin), lerp(cx, 0, fin), .4, -.3);
  }};
};

// III · L'Oréal Brandstorm: the stage, the crown leaving, the rain, then the sun again
SCENES.loreal = S => {
  S.ground(5, 0, -.2, 2.6, 1.2, ['#f6dfe2','#f3e5d3','#f0d4d9','#f5e8de','#ecd9d0']);
  const stg = new THREE.Group(); stg.add(box(2.6,.1,1,'#3a2a22')); stg.add(box(2.7,.03,1.05,'#c9a24a',0,.1));
  const back = new THREE.Group(); back.add(box(2.8,1.35,.06,'#2c2228'));
  const sg = sign('L’Oréal Brandstorm 2021', 'Final 6 · out of 280 teams in Italy', 1.9, 0); sg.position.set(0,.62,.05); back.add(sg);
  for(let i=0;i<8;i++) back.add(ball(.03,'#f3d38c',-1.25+i*.357,1.3,.05));
  const lip = new THREE.Group(); lip.add(cyl(.17,.45,'#d9b45a')); lip.add(cyl(.15,.2,'#e7c879',0,.45)); lip.add(cyl(.11,.28,'#b8203a',0,.65)); lip.add(cyl(.11,.16,'#b8203a',0,.93,0,16,.03));
  S.add(stg, 0, -.45, {mode:'grow', at:.2}); S.add(back, 0, -.92, {at:.35}); S.add(lip, 1.75, -.55, {mode:'grow', at:.7});
  S.add(tree(.45,'#d98b9b'), -2.2, .3, {mode:'grow', at:.9}); S.add(tree(.4,'#d98b9b'), 2.3, .45, {mode:'grow', at:1});
  const spots = [-.55,0,.55].map(x => { const c = new THREE.Mesh(new THREE.ConeGeometry(.32,1.4,20,1,true), new THREE.MeshBasicMaterial({color:'#fff1c2', transparent:true, opacity:0, depthWrite:false, side:THREE.DoubleSide}));
    c.position.set(x,.85,-.4); S.world.add(c); return c; });
  const g = S.putGirl({lower:'skirt', bottom:'#b8203a', top:'#b8203a', lips:'#b8203a'});
  const f1 = person('#1f1f24','#d9b26f'), f2 = person('#3a2a35','#8a4a2a');
  [f1,f2].forEach(f => { f.root.scale.setScalar(.92); S.world.add(f.root); });
  const pg = walker([{x:-2.6,z:.6,t:.6},{x:0,z:-.35,t:2.3}]), p1 = walker([{x:-2.9,z:.4,t:.7},{x:-.5,z:-.45,t:2.3}]), p2 = walker([{x:-3.2,z:.7,t:.8},{x:.5,z:-.4,t:2.5}]);
  const crown = new THREE.Group(); const cm = cut([[-.18,0],[.18,0],[.22,.18],[.11,.08],[0,.22],[-.11,.08],[-.22,.18]],GOLD,.05);
  cm.material = new THREE.MeshStandardMaterial({color:GOLD, metalness:.6, roughness:.3, emissive:'#4a3006'}); crown.add(cm);
  [-.22,0,.22].forEach((x,i) => { const b = new THREE.Mesh(new THREE.SphereGeometry(.025,10,8), new THREE.MeshStandardMaterial({color:'#e0566c', emissive:'#5a1020'})); b.position.set(x,[.18,.22,.18][i],0); crown.add(b); });
  crown.visible = false; S.world.add(crown);
  const cloud = new THREE.Group(); [[0,0,.26],[-.24,-.04,.19],[.25,-.05,.2],[.1,.12,.2],[-.12,.1,.17]].forEach(([x,y,r]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r,16,12), soft('#8f99a6')); b.position.set(x,y,0); b.castShadow = true; cloud.add(b); });
  cloud.scale.set(1,.75,.8); cloud.visible = false; S.world.add(cloud);
  const N = 160, drops = new Float32Array(N*6), seeds = [];
  for(let i=0;i<N;i++) seeds.push([Math.random()*.9-.45, Math.random(), Math.random()*.5-.25]);
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(drops,3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({color:'#6f93b8', transparent:true, opacity:0})); rain.frustumCulled = false; S.world.add(rain);
  const sunG = new THREE.Group(); sunG.add(new THREE.Mesh(new THREE.SphereGeometry(.24,24,16), new THREE.MeshStandardMaterial({color:'#f6c445', emissive:'#b07a10', roughness:.6})));
  const rays = new THREE.Group(); for(let i=0;i<12;i++){ const r = new THREE.Mesh(new THREE.BoxGeometry(.05,.16,.02), new THREE.MeshStandardMaterial({color:'#f6c445', emissive:'#9a6a08'})); const a = i/12*Math.PI*2; r.position.set(Math.cos(a)*.36, Math.sin(a)*.36, 0); r.rotation.z = a - Math.PI/2; rays.add(r); }
  sunG.add(rays); sunG.position.set(-1.6, -.5, -1.3); sunG.visible = false; S.world.add(sunG);
  const rainbow = new THREE.Group(); ['#e0566c','#f2a65a','#f3d38c','#8fc49a','#7fa7d9','#a98bd1'].forEach((c,i) => rainbow.add(new THREE.Mesh(new THREE.TorusGeometry(1.9 - i*.07, .035, 6, 48, Math.PI), new THREE.MeshStandardMaterial({color:c, transparent:true, opacity:0, roughness:.7}))));
  rainbow.position.set(0,0,-1.4); S.world.add(rainbow);
  S.walkEnd = 2.5;
  const T = {crown:2.6, leave:3.6, cloud:4.6, rain:5.1, dry:7.6, sun:7.9, joy:8.6};
  return {end: 11, update(t){
    [[g,pg],[f1,p1],[f2,p2]].forEach(([who,path],i) => { const p = path(t);
      who.root.userData.base = p.z < .1 ? .13 : 0; who.root.position.set(p.x, 0, p.z);
      who.root.rotation.y = p.dir != null ? p.dir : 0; who.root.visible = t > .55 + i*.1;
      const sad = who === g ? ease(t, T.rain, T.rain+.6) * (1 - ease(t, T.dry, T.dry+.5)) : ease(t, T.leave+.3, T.leave+.8)*(1-ease(t,T.sun,T.sun+.5))*.5;
      const joy = ease(t, T.joy, T.joy+.4) * (1 - ease(t, T.joy+2.2, T.joy+2.8));
      who.pose({t: t + i*.3, moving:p.moving, sad, look: who === g ? ease(t, T.sun, T.sun+.5) * (1-joy) : ease(t,T.crown,T.crown+.4)*(1-ease(t,T.leave+.5,T.leave+1)), cheer: joy, hop: joy ? Math.abs(Math.sin((t - T.joy)*6))*.12*joy : 0}); });
    S.girlX = g.root.position.x;
    spots.forEach((s,i) => s.material.opacity = ease(t, 2 + i*.12, 2.5 + i*.12) * .14 * (1 - ease(t, T.cloud, T.rain) * .8) + ease(t, T.sun, T.sun+.6) * .05);
    crown.visible = t > T.crown && t < T.leave + 1.6;
    const down = ease(t, T.crown, T.crown + .7), away = ease(t, T.leave, T.leave + 1.5);
    crown.position.set(lerp(0, 2.6, away), lerp(1.8, 1.05, down) + away*1.4, lerp(-.35, -.6, away)); crown.rotation.set(0, t*2, away*1.4); crown.scale.setScalar(1 - away*.6);
    const cIn = ease(t, T.cloud, T.rain), cOut = ease(t, T.dry, T.dry + .9);
    cloud.visible = cIn > 0 && cOut < 1; cloud.position.set(lerp(-2.8, g.root.position.x, cIn) + cOut*3, 1.25 + Math.sin(t*2)*.03, g.root.position.z);
    const rk = ease(t, T.rain, T.rain+.3) * (1 - ease(t, T.dry - .2, T.dry + .2)); rain.material.opacity = rk * .8; rain.visible = rk > 0;
    if(rk > 0){ for(let i=0;i<N;i++){ const [sx, sy, sz] = seeds[i]; const y = 1.15 - ((sy + t*1.6) % 1) * 1.05, x = cloud.position.x + sx, z = cloud.position.z + sz; drops.set([x, y, z, x - .01, y - .08, z], i*6); }
      rainGeo.attributes.position.needsUpdate = true; }
    const su = ease(t, T.sun, T.sun + 1.2); sunG.visible = su > 0; sunG.position.y = lerp(-.4, 1.75, su); rays.rotation.z = t*.6;
    rainbow.children.forEach((a,i) => a.material.opacity = ease(t, T.sun + .5 + i*.08, T.sun + 1.3 + i*.08) * .85);
    S.hemi.intensity = 1.75 - .55*ease(t, T.cloud, T.rain) * (1 - ease(t, T.dry, T.sun + .5));
    S.cam(Math.sin(t*.3)*.15, 2.1, 4.7, 0, .75, -.55);
  }};
};

// VII · Switzerland: the train, a blazer, a briefcase
SCENES.accenture = S => {
  S.ground(3, 0, -.2, 3.4, 1, ['#e2ecd8','#eef0e2','#dbe7d3','#f0ead6']);
  S.add(mountain(2.6,1.7,'#9fb0bf'), -2.3, -1.3, {at:.1}); S.add(mountain(2.2,1.4,'#8ea2b3'), -.4, -1.4, {at:.2}); S.add(mountain(2.4,1.6,'#a7b6c3'), 1.9, -1.35, {at:.3});
  S.flat(2.4,.7,-2.2,-.45,0,'#8fb7c4',.4);
  for(let i=0;i<26;i++) S.flat(.06,.32,-4+i*.32,.35,0,'#8a6446',.3+i*.01);
  S.flat(8.4,.05,0,.27,0,'#5d5d5d',.5); S.flat(8.4,.05,0,.43,0,'#5d5d5d',.5);
  [['Zurich',-2.4],['Bern',-.2],['Lugano',2]].forEach(([n,x],i) => S.add(sign(n, '', .7, .2), x, .02, {at: .9 + i*.5}));
  const office = new THREE.Group(), w = 1.1, h = 1, d = .5; office.add(box(w,h,d,'#e9e4ea'));
  for(let r=0;r<3;r++) office.add(box(w-.16,.1,.01,'#6b5d86',0,.3+r*.22,d/2+.006)); office.add(box(.26,.28,.02,'#4b3f63',0,0,d/2+.012));
  const osign = sign('Accenture Song', 'Switzerland · from December 2021', 1.05, 0); osign.position.set(0, h+.04, .02); office.add(osign);
  S.add(office, 3.4, -.55, {at:1.6});
  S.add(tree(.45,'#5f8a5c'), 2.6, -.4, {mode:'grow', at:1.8}); S.add(tree(.4,'#5f8a5c'), 4.1, -.3, {mode:'grow', at:1.9});
  const boat = new THREE.Group(); boat.add(cut([[-.22,0],[.22,0],[.16,-.07],[-.16,-.07]],'#c8553d',.08)); boat.add(cut([[0,0],[0,.38],[.2,0]],'#ffffff',.02)); boat.position.y = .07;
  S.add(boat, -2.4, -.45, {mode:'grow', at:1.2, ry:.3});
  const train = new THREE.Group(); [0,1,2].forEach(i => { const c = new THREE.Group(); c.add(box(.8,.3,.28,'#c8303a',0,.04)); c.add(box(.82,.04,.3,'#f6efe4',0,.34));
    for(let j=0;j<3;j++) c.add(box(.14,.1,.01,'#f6efe4',-.25+j*.25,.17,.145)); c.add(box(.8,.04,.24,'#3a2a22')); c.position.x = -i*.86; train.add(c); });
  train.traverse(o => { if(o.isMesh) o.castShadow = true; }); train.position.set(-6, 0, .35); S.world.add(train);
  const g = S.putGirl({lower:'trousers', bottom:'#2b3550', top:'#2b3550', legs:'#2b3550', collar:'#ffffff', props:['briefcase'], shoes:'#1f1f24'});
  const tk = [[-6,0],[-1.6,2],[-1.6,2.5],[.6,3.6],[.6,4.1],[2.8,5.2],[2.8,99]];
  const trainX = t => { for(let i=0;i<tk.length-1;i++){ const [a,ta] = tk[i], [b,tb] = tk[i+1]; if(t <= tb) return lerp(a, b, smooth(clamp((t-ta)/(tb-ta)))); } return 2.8; };
  const path = walker([{x:2.55,z:.62,t:5.6},{x:3.4,z:-.2,t:6.9},{x:3.4,z:-.2,t:7.3}]); S.walkEnd = 6.9;
  return {end: 9.5, update(t){
    train.position.x = trainX(t);
    const on = t > 5.4, p = path(t);
    g.root.visible = on; g.root.position.set(p.x, 0, p.z); S.girlX = on ? p.x : -99;
    g.root.rotation.y = p.dir != null ? p.dir : (t > 6.9 ? lerp(Math.PI, 0, ease(t, 7.3, 7.7)) : .6);
    const enter = ease(t, 8.6, 9.3); g.fade(1 - enter);
    if(t > 8.5){ g.root.rotation.y = Math.PI; g.root.position.z = -.2 - enter*.25; }
    g.pose({t, moving:p.moving, wave: ease(t, 7.7, 8) * (1 - ease(t, 8.3, 8.5))});
    const fx = THREE.MathUtils.clamp(t < 5.4 ? train.position.x : p.x, -2, 2.6);
    S.cam(fx*.6 + Math.sin(t*.3)*.1, 2.2, 5.4, fx*.6, .5, -.45);
  }};
};

// VIII · The Plushy Society: a cabin in the pines, Gulino, and the first members arriving
SCENES.plushy = S => {
  S.ground(17, 0, -.15, 3, 1.15, ['#e6efd9','#f1e6d3','#e0e9d6','#f3e1d8','#ebe4d2']);
  const cabin = new THREE.Group(), w = 1.3, h = .7, d = .6; cabin.add(box(w,h,d,'#a0714f'));
  for(let i=0;i<4;i++) cabin.add(box(w+.02,.02,d+.02,'#7d5539',0,.1+i*.15));
  const rf = cut([[-w/2-.05,0],[w/2+.05,0],[0,.48]],'#5e7b55',d+.08); rf.position.y = h; cabin.add(rf);
  windows(cabin,w,h,d,1,2,'#f6d48f',.28); cabin.add(box(.2,.34,.02,'#4a2f20',0,0,d/2+.012));
  const csign = sign('The Pinewood', '', .7, 0); csign.position.set(0, h+.08, d/2+.06); cabin.add(csign);
  S.add(art('cabin', 2.6, 'clips/cabin-art.mp4'), .2, -.95, {at:.3});
  [-2.4,2.7].forEach((x,i) => S.add(pine(.75 + i*.15), x, -.8, {mode:'grow', at:.5 + i*.08}));
  const mailbox = new THREE.Group(); mailbox.add(box(.03,.28,.03,'#7d5539')); mailbox.add(box(.16,.1,.1,BERRY,0,.28)); mailbox.add(box(.02,.06,.01,'#f3d38c',.09,.33,0));
    S.add(sign('theplushysociety.com', '50 members in the first month', 1.3, .18), -2, .35, {at:1.1, ry:.2});
  const g = S.putGirl({lower:'skirt', bottom:'#c7b4e0', top:'#c7b4e0', legs:'#f3ece4', shoes:'#8a6446'});
  const bear = plushBear('#ffffff', 1.25); S.world.add(bear);
  const path = walker([{x:-3,z:.75,t:.6},{x:.05,z:-.25,t:3.6}]), bpath = walker([{x:-3.35,z:.85,t:.75},{x:.45,z:-.2,t:3.9}]); S.walkEnd = 3.6;
  const env = [0,1,2,3,4].map(() => { const e = new THREE.Group(); e.add(box(.13,.09,.01,'#ffffff')); const h = cut([[0,0],[.025,.025],[.012,.04],[0,.03],[-.012,.04],[-.025,.025]],'#e0566c',.012); h.position.set(0,.03,.008); e.add(h); e.visible = false; S.world.add(e); return e; });
  const pals = ['#f2c1c9','#c9e0f2','#f3dc9b','#c8e6c1','#e0c9f2','#f6d0b0','#bfe3e0','#f0b8a0'];
  const members = pals.map((c,i) => { const b = plushBear(c, .7 + (i%3)*.08); const a = -2.4 + i*.62; b.position.set(a, 0, .55 + Math.sin(i*1.7)*.35); b.rotation.y = -a*.15; b.visible = false; S.world.add(b); return b; });
  const d0 = Math.atan2(3.05,-1), b0 = Math.atan2(3.8,-1.05);
  return {end: 9.5, update(t){
    const p = path(t), q = bpath(t);
    g.root.visible = t > .5; g.root.position.set(p.x, 0, p.z); S.girlX = p.x;
    g.root.rotation.y = p.dir != null ? p.dir : lerp(d0, 0, ease(t, 3.6, 4.2));
    g.pose({t, moving:p.moving, wave: ease(t, 6.4, 6.8) * (1 - ease(t, 7.8, 8.2))});
    bear.visible = false; bear.position.set(q.x, q.moving ? Math.abs(Math.sin(t*12))*.04 : 0, q.z);
    bear.rotation.y = q.dir != null ? q.dir : lerp(b0, -.4, ease(t, 3.9, 4.5)); bear.rotation.z = q.moving ? Math.sin(t*12)*.12 : 0;
    env.forEach((e,i) => { const k = clamp((t - 4 - i*.35)/1.1); e.visible = k > 0 && k < 1;
      e.position.set(lerp(3.6, .9, k), .35 + Math.sin(k*Math.PI)*.9, lerp(.2, -.05, k)); e.rotation.set(k*4, k*2, Math.sin(k*9)*.3); });
    members.forEach((m,i) => { const k = clamp((t - 5.6 - i*.18)/.5); m.visible = false; m.scale.setScalar(k > 0 ? Math.max(.001, easeBack(k)) : .001);
      m.position.y = k >= 1 ? Math.max(0, Math.sin((t - 7 - i*.2)*5))*.04 : 0; });
    S.cam(lerp(-1, 0, ease(t, .6, 4)) + Math.sin(t*.3)*.12, 2.2, 6.2, lerp(-.8, 0, ease(t,.6,4)), 1.05, -.6);
  }};
};

// IX · Barcelona: a summer hat, a badge, and the launch night filling up
SCENES.didit = S => {
  S.ground(23, 0, -.1, 3.4, 1.1, ['#f6e2b8','#f3d6b3','#efe0c0','#f7e8cb','#f1d2bf']);
  S.flat(6.4,.45,0,1.05,0,'#9cc6d4',.2);
  const sag = new THREE.Group(); [[-.38,1.3],[-.13,1.65],[.13,1.65],[.38,1.3]].forEach(([x,h]) => sag.add(cone(.11,h,'#d9c29b',x,.35,0,9))); sag.add(box(1.1,.38,.4,'#e3cfa9'));
  S.add(sag, -2.6, -1.05, {mode:'grow', at:.2});
  const office = new THREE.Group(), w = 1.6, h = .9, d = .5; office.add(box(w,h,d,'#f4f1ea')); windows(office,w,h,d,2,5,'#4b5d73',.4);
  office.add(box(.3,.3,.02,'#3a2a22',0,0,d/2+.012));
  const banner = sign('Launch night', 'Building, Raising & Scaling in the AI Era', 1.3, 0); banner.position.set(0, h+.05, .02); office.add(banner);
  S.add(office, 1, -.95, {at:.4});
  [-3.4,-1.4,3.1].forEach((x,i) => S.add(palm(.75 + (i%2)*.15), x, .45 + (i%2)*.1, {mode:'grow', at:.6 + i*.1}));
  const bulbs = []; for(let i=0;i<14;i++){ const x = -.6 + i*.24, y = 1.2 - Math.sin(i/13*Math.PI)*.18;
    const b = new THREE.Mesh(new THREE.SphereGeometry(.028,10,8), new THREE.MeshStandardMaterial({color:'#f3d38c', emissive:'#000000'})); b.position.set(x, y, -.25); b.visible = false; S.world.add(b); bulbs.push(b); }
  const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bulbs.map(b => b.position.clone().add(new THREE.Vector3(0,.03,0)))), 40, .004, 4), mat('#3a2a22')); wire.visible = false; S.world.add(wire);
  const seats = []; for(let r=0;r<2;r++) for(let c=0;c<5;c++) seats.push([.2 + c*.36, .15 + r*.36]);
  seats.forEach(([x,z],i) => { const ch = new THREE.Group(); ch.add(box(.13,.02,.13,'#3a2a22',0,.11)); ch.add(box(.13,.14,.02,'#3a2a22',0,.11,-.06)); ch.add(box(.015,.11,.015,'#3a2a22',-.05,0,.05)); ch.add(box(.015,.11,.015,'#3a2a22',.05,0,.05));
    S.add(ch, x, z, {mode:'grow', at:1.2 + i*.05, ry:Math.PI}); });
  const tops = ['#2f6bff','#e0566c','#3a2a22','#8fc49a','#f2a65a','#6b5d86','#f3d38c','#9fb3c2','#c8553d','#2b3550'], hairs = ['#3a2318','#d9b26f','#1f1f24','#8a4a2a','#5a3b2c'];
  const guests = seats.map(([x,z],i) => { const p = person(tops[i], hairs[i%5], {lower: i%3 ? 'trousers' : 'skirt', legs: i%3 ? tops[i] : undefined}); p.root.scale.setScalar(.6); p.root.visible = false; S.world.add(p.root);
    return {p, x, z, from: [4.2 + (i%3)*.3, .8 + (i%2)*.2], t0: 3.2 + i*.28}; });
  const g = S.putGirl({lower:'skirt', bottom:'#f6f1e6', top:'#f6f1e6', legs:SKIN, shoes:'#c8a07a', props:['hat','badge','mic']});
  const path = walker([{x:-1.6,z:.75,t:.7},{x:.9,z:-.35,t:2.9}]); S.walkEnd = 2.9; const d0 = Math.atan2(2.5,-1.1);
  return {end: 10.6, update(t){
    const p = path(t);
    g.root.visible = t > .6; g.root.position.set(p.x, 0, p.z); S.girlX = p.x;
    g.root.rotation.y = p.dir != null ? p.dir : lerp(d0, 0, ease(t, 2.9, 3.4));
    g.props.mic.visible = t > 7;
    const cheer = ease(t, 9, 9.3) * (1 - ease(t, 10.2, 10.6));
    g.pose({t, moving:p.moving, wave: ease(t, 3.2, 3.5) * (1 - ease(t, 4.2, 4.5)), cheer});
    if(t > 7 && !cheer) g.arms[1].rotation.set(-1.25, 0, .2);
    guests.forEach(({p:q,x,z,from,t0},i) => { const k = ease(t, t0, t0 + 1.4); q.root.visible = t > t0;
      q.root.userData.base = k >= 1 ? .03 : 0; q.root.position.set(lerp(from[0], x, k), 0, lerp(from[1], z, k)); q.root.rotation.y = k < 1 ? Math.atan2(x-from[0], z-from[1]) : Math.PI;
      q.pose({t: t + i, moving: k > 0 && k < 1, cheer: cheer * (i%2)}); });
    const night = ease(t, 6.2, 7.4);
    S.hemi.intensity = 1.75 - night*.35; S.hemi.color.set('#fff8ee').lerp(new THREE.Color('#f7d6b4'), night); S.sun.intensity = 2.1 - night*.6; S.sun.color.set('#fff3e0').lerp(new THREE.Color('#ffc78f'), night);
    wire.visible = t > 5.8; bulbs.forEach((b,i) => { b.visible = t > 5.8; b.material.emissive.set(night > (i/14)*.8 ? '#f0b040' : '#000000'); });
    S.cam(lerp(-.6, .2, ease(t, .7, 3.5)) + Math.sin(t*.3)*.12, 2, 4.8, lerp(-.5, .2, ease(t,.7,3.5)), .45, -.4);
  }};
};

// Epilogue: a trench coat, a suitcase, the Golden Gate
SCENES.sf = S => {
  S.ground(29, 0, -.1, 3, 1.15, ['#e8ecd6','#f2e2c9','#dfe6d6','#f4dcd2','#e6e6ee']);
      const br = new THREE.Group(), O = '#c8553d';
  [-1.4,1.4].forEach(x => { br.add(box(.11,1.6,.11,O,x-.15)); br.add(box(.11,1.6,.11,O,x+.15)); [.7,1.15,1.52].forEach(y => br.add(box(.42,.06,.08,O,x,y))); });
  br.add(box(5.4,.08,.28,O,0,.6));
  const cp = new THREE.CurvePath(); [[-2.7,.9,-1.4,1.6],[-1.4,1.6,1.4,1.6],[1.4,1.6,2.7,.9]].forEach(([a,b,c,d],i) => cp.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(a,b,0), new THREE.Vector3((a+c)/2, i===1 ? .75 : (b+d)/2-.2, 0), new THREE.Vector3(c,d,0))));
  const cab = new THREE.Mesh(new THREE.TubeGeometry(cp,80,.02,6), mat(O)); cab.userData.c = O; br.add(cab);
  const pts = cp.getPoints(200); for(let x=-2.5;x<=2.5;x+=.25){ if(Math.abs(Math.abs(x)-1.4) < .2) continue; const q = pts.reduce((a,b) => Math.abs(b.x-x) < Math.abs(a.x-x) ? b : a); br.add(box(.012,q.y-.64,.012,O,x,.64)); }
  S.add(art('sf', 3.4, 'clips/sf-art.mp4'), .4, -.8, {at:.3});
    S.add(sign('Next stop: San Francisco', 'the next chapter is unwritten', 1.35, .18), -2.1, .25, {at:1, ry:.25});
  const g = S.putGirl({lower:'coat', bottom:'#c9a77c', top:'#c9a77c', belt:'#8a6446', legs:'#2f2522', props:['suitcase']});
  const plane = new THREE.Group(); const pw = cut([[0,0],[.22,.04],[0,.09]],'#ffffff',.01); pw.rotation.x = Math.PI/2; plane.add(pw);
  const pw2 = cut([[0,0],[.22,.04],[0,-.02]],'#f3ece4',.01); pw2.rotation.x = Math.PI/2 + .5; plane.add(pw2); plane.visible = false; S.world.add(plane);
  const card = new THREE.Group(); card.visible = false; card.traverse(o => { if(o.isMesh) o.castShadow = true; }); S.world.add(card);
  const path = walker([{x:-3.2,z:.85,t:.6},{x:-.1,z:.55,t:4}]); S.walkEnd = 4;
  return {end: 8, update(t){
    const p = path(t);
    g.root.visible = t > .5; g.root.position.set(p.x, 0, p.z); S.girlX = p.x;
    g.root.rotation.y = p.dir != null ? p.dir : lerp(Math.PI/2, 0, ease(t, 4, 4.6));
    g.pose({t, moving:p.moving, wave: ease(t, 4.8, 5.2) * (1 - ease(t, 7, 7.4)), look: ease(t,5.3,5.8)*(1-ease(t,7,7.4))});
    g.props.suitcase.rotation.x = p.moving ? .3 : .05;
    card.visible = false; card.scale.setScalar(Math.max(.001, easeBack(clamp((t-5.6)/.7))));
    card.position.set(g.root.position.x + .32, .62 + Math.sin(t*2)*.03, g.root.position.z + .12); card.rotation.set(-.15, Math.sin(t*1.3)*.15, Math.sin(t*1.7)*.05);
    const k = clamp((t - 5)/2.6); plane.visible = k > 0 && k < 1;
    plane.position.set(lerp(-2.8, 3.2, k), 1.3 + Math.sin(k*Math.PI*2)*.2, lerp(.3, -.4, k)); plane.rotation.set(Math.sin(k*9)*.2, -.3, Math.cos(k*Math.PI*2)*.25);
    S.cam(lerp(-1.2, 0, ease(t, .6, 4.5)) + Math.sin(t*.3)*.12, 2.1, 5.7, lerp(-1, 0, ease(t,.6,4.5)), 1, -.6);
  }};
};

// ---------------------------------------------------------------- wiring to the book
const ready = Promise.all(['600 60px "Cormorant Garamond"','40px Kalam'].map(f => document.fonts ? document.fonts.load(f) : 0)).catch(() => {});
const hosts = [...document.querySelectorAll('#book .pop3d[data-scene]')];
const live = new Map(), starting = new Map();

function start(host){
  if(live.has(host)) return Promise.resolve(live.get(host));
  if(starting.has(host)) return starting.get(host);
  const p = ready.then(() => {
    const S = stage(host); if(!S){ host.classList.add('nogl'); return null; } S.spriteKey = SPRITE_FOR[host.dataset.scene];
    const sc = SCENES[host.dataset.scene](S);
    const L = {S, sc, t:0, playing:false, raf:0, last:0};
    L.draw = () => { S.run(L.t); sc.update(L.t); S.renderer.render(S.scene, S.camera); };
    const size = () => { const w = host.clientWidth, h = host.clientHeight; if(!w || !h) return;
      const k = (host.getBoundingClientRect().width / w) || 1;
      S.renderer.setPixelRatio(Math.min(2.5, (devicePixelRatio || 1) * Math.max(1, k))); S.renderer.setSize(w, h, false);
      S.camera.aspect = w/h; S.camera.fov = w/h > 2.4 ? 26 : 30; S.camera.updateProjectionMatrix(); L.draw(); };
    L.t = STILL ? (parseFloat(Q.get('t')) || sc.end) : (REDUCE ? sc.end : 0);
    new ResizeObserver(size).observe(host); host.classList.add('live'); size();
    live.set(host, L); return L;
  });
  starting.set(host, p); return p;
}
async function play(host){
  const L = await start(host); if(!L) return; L.visible = true;
  if(REDUCE){ L.draw(); return; }
  if(L.playing) return;
  if(L.t >= L.sc.end){ L.t = 0; L.S.reset(); }            // coming back to the page replays it
  L.playing = true; L.last = performance.now();
  const tick = now => { if(!L.playing) return; L.t += Math.min(.1, (now - L.last)/1000); L.last = now; L.draw();
    if(L.t > L.sc.end + 4 && L.S.hoverK < .01 && !L.S.hoverT && ACTIVE === 0) { L.playing = false; return; } L.raf = requestAnimationFrame(tick); };
  L.S.kick = () => { if(!L.playing && !REDUCE && L.visible){ L.playing = true; L.last = performance.now(); L.raf = requestAnimationFrame(tick); } };
  L.raf = requestAnimationFrame(tick);
}
function pause(host){ const L = live.get(host); if(L){ L.visible = false; L.playing = false; cancelAnimationFrame(L.raf); } }
function onVisible(list){ hosts.forEach(h => (list || []).includes(h.closest('section')) ? play(h) : pause(h)); }
addEventListener('pages:visible', e => onVisible(e.detail));
onVisible(window.__visiblePages);
if(STILL) hosts.forEach(play);
