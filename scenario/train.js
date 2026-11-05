// The story train: one train for the whole book. Every time a page turns it runs along the bottom
// of the open book, from the left edge, across the gutter between the pages, and out the right edge.
// She rides inside, dressed for the chapter you are on.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { makeTrain, artTex } from './pop3d.js?v=train3';

const AT = parseFloat(new URLSearchParams(location.search).get('trainat'));   // test hook: freeze the train part-way
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && (!new URLSearchParams(location.search).has('still') || AT >= 0)) {
  const book = document.getElementById('book');
  const cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;pointer-events:none;z-index:40;opacity:0;transition:opacity .4s';
  document.body.appendChild(cv);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas: cv, antialias: true, alpha: true}); } catch (e) { renderer = null; }
  if (renderer) {
    renderer.setClearColor(0, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#fff8ee', '#cdb89c', 1.9));
    const sun = new THREE.DirectionalLight('#fff3e0', 1.8); sun.position.set(-3, 6, 6); scene.add(sun);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 60);
    const T = makeTrain('milan'); scene.add(T.g);
    // the rails run the whole width of the open book, across the gutter
    const rails = new THREE.Group(), rm = new THREE.MeshStandardMaterial({color:'#8b7b6e'}), sm = new THREE.MeshStandardMaterial({color:'#c9b49a'});
    [-.13,.13].forEach(dz => { const r = new THREE.Mesh(new THREE.BoxGeometry(60,.02,.025), rm); r.position.set(0,.01,dz); rails.add(r); });
    for(let i=0;i<200;i++){ const s = new THREE.Mesh(new THREE.BoxGeometry(.07,.012,.38), sm); s.position.set(-30+i*.3,0,0); rails.add(s); }
    scene.add(rails);
    T.g.rotation.y = 0;
    const OUTFIT = run => /Plushy/.test(run) ? 'plushy' : /Didit/.test(run) ? 'summer' : /Side quest/.test(run) ? 'summer'
      : /Epilogue/.test(run) ? 'travel' : /Accenture|Tell-Me|SLB/.test(run) ? 'work' : /training|lipstick|Creative/.test(run) ? 'student' : 'milan';
    let key = 'milan', t0 = 0, raf = 0, W = 0, H = 0, rect = null;
    const PX = Math.max(40, Math.min(62, innerWidth / 22));                      // world unit in CSS pixels: the train is ~50px tall
    const LEN = 5.2;                    // train length in world units, engine first
    function setOutfit(k){ if (k === key) return; key = k; const {t} = artTex('girl-' + k); T.rider.material.map = t; T.rider.material.needsUpdate = true; }
    function place(){
      rect = book.getBoundingClientRect(); W = rect.width; H = Math.round(PX * 1.85);
      Object.assign(cv.style, {left: rect.left + 'px', top: (rect.bottom - H - 6) + 'px', width: W + 'px', height: H + 'px'});
      renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(W, H, false);
      const w = W / PX / 2, h = H / PX / 2;
      Object.assign(cam, {left: -w, right: w, top: h, bottom: -h}); cam.updateProjectionMatrix();
      cam.position.set(0, .85 + 2.2, 12); cam.lookAt(0, .85, 0);   // a little from above, like the pop-ups
    }
    function frame(now){
      const w = W / PX / 2, dur = (2 * w + LEN + 1.5) / 2.3;   // ~2.3 units a second
      const t = AT >= 0 ? AT * dur : (now - t0) / 1000, k = t / dur;
      // in from the left edge, a little slower over the gutter, out the right edge
      const x = -w - 2.2 + (2 * w + LEN + 1.5) * (k - Math.sin(k * Math.PI * 2) * .05);
      T.g.position.set(x, Math.abs(Math.sin(t * 14)) * .01, 0);
      T.tick(t, true); T.open(0); T.ride(0, 0, 0, 0, t);
      T.rider.position.y = .4 + Math.abs(Math.sin(t * 5)) * .02;
      renderer.render(scene, cam);
      if (AT >= 0) return;
      if (k < 1) raf = requestAnimationFrame(frame); else { cv.style.opacity = 0; raf = 0; }
    }
    function run(list){
      if (!list || !list.length || document.getElementById('hero')) return;
      setOutfit(OUTFIT(list[list.length - 1].getAttribute('data-run') || ''));
      place();
      if (raf) return;                  // already crossing: it just keeps going
      cv.style.opacity = 1; t0 = performance.now(); raf = requestAnimationFrame(frame);
    }
    addEventListener('pages:visible', e => setTimeout(() => run(e.detail), 250));
    addEventListener('resize', () => { if (raf || AT >= 0) { place(); if (AT >= 0) frame(0); } });
    setTimeout(() => run(window.__visiblePages), 600);
  }
}
