// Enchanted photographs: the polaroid stays a still photo, a spell of golden dust sweeps over it,
// it comes alive for a few seconds, then a second sparkle turns it back into a still photo.
(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CLIPS = {
    'cover.jpg': 'clips/portrait-travel.mp4',
    'lugano-afterwork.jpg': 'clips/lugano-magic.mp4',
    'zurich.jpg': 'clips/zurich.mp4',
    'bcn-terrace.jpg': 'clips/bcn.mp4'
  };
  var css = document.createElement('style');
  css.textContent = '.mp-video,.mp-dust{position:absolute;pointer-events:none}.mp-video{opacity:0;transition:opacity .9s ease;object-fit:cover}' +
    '.mp-on{animation:mpglow 5.4s ease-in-out}@keyframes mpglow{0%,100%{filter:none}15%,85%{filter:drop-shadow(0 0 14px rgba(240,190,90,.75)) saturate(1.08)}}';
  document.head.appendChild(css);

  function Magic(img, src){
    this.img = img; this.src = src; this.busy = false;
    var host = img.parentElement; if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var v = document.createElement('video'); v.className = 'mp-video'; v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'none'; v.src = src;
    v.setAttribute('aria-hidden', 'true');
    var c = document.createElement('canvas'); c.className = 'mp-dust'; c.setAttribute('aria-hidden', 'true');
    img.insertAdjacentElement('afterend', c); img.insertAdjacentElement('afterend', v);
    this.v = v; this.c = c; this.host = host;
  }
  Magic.prototype.place = function(){
    var img = this.img, s = getComputedStyle(img);
    [this.v, this.c].forEach(function(el){
      el.style.left = img.offsetLeft + 'px'; el.style.top = img.offsetTop + 'px';
      el.style.width = img.offsetWidth + 'px'; el.style.height = img.offsetHeight + 'px'; el.style.borderRadius = s.borderRadius;
    });
    this.v.style.objectPosition = s.objectPosition;
    this.c.width = img.offsetWidth * 2; this.c.height = img.offsetHeight * 2;
  };
  // a diagonal sweep of glowing golden dust
  Magic.prototype.dust = function(dur){
    var c = this.c, x = c.getContext('2d'), W = c.width, H = c.height, P = [], t0 = performance.now();
    for (var i = 0; i < 140; i++) P.push({u: Math.random(), v: Math.random(), r: 1 + Math.random() * 3.2, d: Math.random() * .35, tw: Math.random() * 6});
    (function frame(now){
      var k = (now - t0) / dur; x.clearRect(0, 0, W, H);
      if (k > 1.15) return;
      var front = -0.3 + k * 1.6; // the spell line moves from top-left to bottom-right
      x.globalCompositeOperation = 'lighter';
      var gr = x.createLinearGradient(0, 0, W, H); var f = Math.max(0, Math.min(1, front));
      gr.addColorStop(Math.max(0, f - .12), 'rgba(255,215,130,0)'); gr.addColorStop(f, 'rgba(255,220,140,.32)'); gr.addColorStop(Math.min(1, f + .12), 'rgba(255,215,130,0)');
      x.fillStyle = gr; x.fillRect(0, 0, W, H);
      P.forEach(function(p){
        var along = (p.u + p.v) / 2, a = Math.max(0, 1 - Math.abs(along - front + p.d * .2) * 6);
        if (a <= 0) return;
        var px = p.u * W + Math.sin(now / 300 + p.tw) * 6, py = p.v * H - k * 30;
        var g = x.createRadialGradient(px, py, 0, px, py, p.r * 5);
        g.addColorStop(0, 'rgba(255,240,190,' + a + ')'); g.addColorStop(.35, 'rgba(255,200,90,' + (a * .6) + ')'); g.addColorStop(1, 'rgba(255,180,60,0)');
        x.fillStyle = g; x.beginPath(); x.arc(px, py, p.r * 5, 0, 6.3); x.fill();
      });
      requestAnimationFrame(frame);
    })(t0);
  };
  Magic.prototype.cast = function(){
    if (this.busy || reduce) return; var self = this, v = this.v; this.busy = true;
    if (this.img.classList.contains('kb')) { this.img.style.animation = 'none'; this.img.style.transform = 'none'; }
    this.place(); this.dust(1300);
    v.preload = 'auto';
    setTimeout(function(){
      if (!self.busy) return;
      v.currentTime = 0; var p = v.play(); if (p && p.catch) p.catch(function(){});
      v.style.opacity = 1; self.host.classList.add('mp-on');
    }, 650);
    v.onended = function(){ self.dust(1300); setTimeout(function(){ v.style.opacity = 0; }, 350); setTimeout(function(){ self.host.classList.remove('mp-on'); self.busy = false; self.done = true; }, 1400); };
  };
  Magic.prototype.stop = function(){ this.busy = false; this.v.pause(); this.v.style.opacity = 0; this.host.classList.remove('mp-on'); };

  var all = [];
  document.querySelectorAll('#book img').forEach(function(img){
    var name = (img.getAttribute('src') || '').split('/').pop();
    if (CLIPS[name]) all.push(new Magic(img, CLIPS[name]));
  });
  function onVisible(list){
    all.forEach(function(m){
      var sec = m.img.closest('section');
      if ((list || []).indexOf(sec) > -1) { if (!m.busy) setTimeout(function(){ m.cast(); }, 1100); }
      else m.stop();
    });
  }
  addEventListener('pages:visible', function(e){ onVisible(e.detail); });
  addEventListener('resize', function(){ all.forEach(function(m){ if (m.busy) m.place(); }); });
  onVisible(window.__visiblePages);
})();
