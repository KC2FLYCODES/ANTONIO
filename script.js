(function () {
  'use strict';

  var FORM_URL = 'https://formspree.io/f/mdayqzrd';
  var STORE_KEY = 'antonio-board-v1';
  var CLIENT_KEY = 'antonio-clients-v1';
  var PHONE = '(336) 458-8379';
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var JOBS = {
    addition: { label: 'Addition', crew: 'Framing', q: 'What are you adding?', scope: ['Master suite', 'Extra bedroom', 'Bathroom', 'Living space', 'In-law suite', 'Second story'] },
    remodel: { label: 'Whole-house remodel', crew: 'Interior', q: 'What needs to change?', scope: ['Whole house', 'Layout changes', 'Windows & doors', 'Flooring', 'Sagging floors', 'Flip or rental'] },
    kitchenbath: { label: 'Kitchen or bath', crew: 'Interior', q: 'Which rooms?', scope: ['Kitchen', 'Primary bath', 'Other bath', 'Moving plumbing', 'Walk-in shower', 'Accessibility'] },
    porch: { label: 'Porch or deck', crew: 'Framing', q: 'What are you picturing?', scope: ['Screened porch', 'New deck', 'Covered porch', 'Fireplace', 'Roof over existing', 'Repair or rebuild'] },
    garage: { label: 'Garage conversion', crew: 'Framing', q: 'What should it become?', scope: ['Studio or rental', 'In-law suite', 'Bedroom', 'Office or gym', 'New garage', 'Carport'] },
    concrete: { label: 'Concrete', crew: 'Concrete', q: 'What are we pouring?', scope: ['Driveway', 'Sidewalk', 'Slab', 'Footings', 'Porch', 'Tear out old concrete'] },
    newhome: { label: 'New home or roof', crew: 'New build', q: 'What are we building?', scope: ['New house', 'I have land', 'I have plans', 'New roof', 'Roof repair', 'Shed or outbuilding'] },
    other: { label: 'Something else', crew: 'Service', q: 'What is going on?', scope: ['Repair', 'Water damage', 'Fire damage', 'Attic', 'Drywall or paint', 'Not sure'] }
  };
  var WHEN = [
    { v: 'urgent', t: 'Urgent', s: 'Leak, damage, or something unsafe', pts: 40 },
    { v: 'month', t: 'Within a month', s: 'Ready to get going', pts: 25 },
    { v: 'quarter', t: 'In 1 to 3 months', s: 'Planning it now', pts: 15 },
    { v: 'later', t: 'Later on', s: 'Just getting ideas', pts: 5 }
  ];
  var BUDGET = [
    { v: 'u10', t: 'Under $10K', mid: 6000, pts: 8 },
    { v: '10-50', t: '$10K to $50K', mid: 30000, pts: 15 },
    { v: '50-150', t: '$50K to $150K', mid: 100000, pts: 25 },
    { v: '150+', t: '$150K or more', mid: 200000, pts: 30 },
    { v: 'unsure', t: 'Not sure yet', mid: 15000, pts: 10 }
  ];
  var WHO = [
    { v: 'owner', t: 'I own the home', pts: 10 },
    { v: 'buying', t: 'I am buying it', pts: 8 },
    { v: 'investor', t: 'Investor or realtor', pts: 15 },
    { v: 'builder', t: 'Builder or GC', pts: 12 }
  ];
  var TOWNS = ['Greensboro', 'Summerfield', 'Winston-Salem', 'High Point', 'Burlington', 'Thomasville', 'Other'];
  var STAGES = [
    { v: 'new', t: 'New' },
    { v: 'visit', t: 'Visit set' },
    { v: 'quoted', t: 'Quoted' },
    { v: 'won', t: 'Won' }
  ];

  function $(id) { return document.getElementById(id); }
  function find(list, v) { return list.filter(function (x) { return x.v === v; })[0]; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function asset(p) { return (window.__ASSETS && window.__ASSETS[p]) || p; }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function money(n) { return n >= 1000000 ? '$' + (n / 1000000).toFixed(1) + 'M' : '$' + Math.round(n / 1000) + 'K'; }
  function load(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v || fallback; } catch (e) { return fallback; }
  }
  function save(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; }
  }

  document.querySelectorAll('[data-asset]').forEach(function (img) { img.src = asset(img.getAttribute('data-asset')); });

  /* Scoring */
  function score(a) {
    var pts = 0, why = [];
    var w = find(WHEN, a.when), b = find(BUDGET, a.budget), o = find(WHO, a.who);
    if (w) { pts += w.pts; if (w.v === 'urgent') why.push('Urgent'); else if (w.v === 'month') why.push('Ready within a month'); }
    if (b) { pts += b.pts; if (b.v === '50-150' || b.v === '150+') why.push(b.t + ' budget'); }
    if (o) { pts += o.pts; if (o.v === 'investor' || o.v === 'builder') why.push('Repeat-work potential'); }
    if (a.photos && a.photos.length) { pts += 5; why.push('Sent photos'); }
    if (a.town && a.town !== 'Other') pts += 10; else why.push('Check the location');
    var pri = (a.when === 'urgent' || pts >= 70) ? 'today' : pts >= 45 ? 'week' : 'later';
    return { pts: pts, pri: pri, why: why };
  }
  var PRI_LABEL = { today: 'Call today', week: 'This week', later: 'Follow up' };

  /* Hero deck */
  var deck = $('deck');
  var cards = Array.prototype.slice.call(deck.querySelectorAll('.card'));
  var n = cards.length;
  var pos = 0, vel = 0, target = 0, raf = null, touched = false;

  function wrap(d) { d = ((d % n) + n) % n; return d > n / 2 ? d - n : d; }
  function paint() {
    var w = cards[0].offsetWidth;
    var gap = Math.min(w * 0.74, window.innerWidth * 0.5);
    cards.forEach(function (c, i) {
      var d = wrap(i - pos), a = Math.abs(d);
      var x = d * gap, s = 1 - Math.min(a, 2) * 0.09, r = d * 4.5;
      c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + (Math.min(a, 2) * 12).toFixed(1) + 'px,0) rotate(' + r.toFixed(2) + 'deg) scale(' + s.toFixed(3) + ')';
      c.style.zIndex = String(100 - Math.round(a * 10));
      c.style.opacity = a > 2.6 ? '0' : '1';
      c.style.visibility = a > 3 ? 'hidden' : 'visible';
      c.setAttribute('aria-hidden', a < 0.5 ? 'false' : 'true');
    });
    $('deckNow').textContent = String(((Math.round(pos) % n) + n) % n + 1);
  }
  function spring() {
    if (calm) { pos = target; vel = 0; paint(); raf = null; return; }
    var f = (target - pos) * 0.11;
    vel = (vel + f) * 0.72;
    pos += vel;
    if (Math.abs(target - pos) < 0.001 && Math.abs(vel) < 0.001) { pos = target; vel = 0; paint(); raf = null; return; }
    paint();
    raf = requestAnimationFrame(spring);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(spring); }
  function goTo(t) { target = t; kick(); }
  function step(d) { touched = true; goTo(Math.round(target) + d); }

  var drag = null;
  deck.addEventListener('pointerdown', function (e) {
    if (e.button) return;
    touched = true;
    drag = { x: e.clientX, y: e.clientY, p: pos, t: e.timeStamp, moved: false, lastX: e.clientX, lastT: e.timeStamp, v: 0, id: e.pointerId, card: e.target.closest ? e.target.closest('.card') : null };
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    vel = 0;
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
      if (Math.abs(dy) > Math.abs(dx)) { goTo(Math.round(pos)); drag = null; return; }
      drag.moved = true;
      deck.classList.add('dragging');
      try { deck.setPointerCapture(e.pointerId); } catch (err) { }
    }
    var w = cards[0].offsetWidth * 0.74;
    pos = drag.p - dx / w;
    var dt = e.timeStamp - drag.lastT;
    if (dt > 0) { drag.v = (e.clientX - drag.lastX) / dt; drag.lastX = e.clientX; drag.lastT = e.timeStamp; }
    paint();
  });
  function endDrag(e) {
    if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.id)) return;
    var d = drag;
    drag = null;
    deck.classList.remove('dragging');
    if (d.moved) {
      var flick = -d.v * 0.9;
      var t = Math.round(pos + Math.max(-1.6, Math.min(1.6, flick)));
      vel = flick * 0.06;
      goTo(t);
    } else if (e.type === 'pointerup' && d.card) {
      var i = cards.indexOf(d.card), off = wrap(i - pos);
      if (Math.abs(off) < 0.5) openIntake(d.card.getAttribute('data-job'));
      else goTo(Math.round(pos + off));
    }
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  $('deckPrev').addEventListener('click', function () { step(-1); });
  $('deckNext').addEventListener('click', function () { step(1); });
  deck.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'Enter') {
      e.preventDefault();
      openIntake(cards[((Math.round(pos) % n) + n) % n].getAttribute('data-job'));
    }
  });
  window.addEventListener('resize', paint);
  paint();
  if (!calm) {
    pos = -0.9; paint(); goTo(0);
    setTimeout(function () {
      if (touched || document.hidden) return;
      target = 0.28; kick();
      setTimeout(function () { if (!touched) goTo(0); }, 650);
    }, 2400);
  }

  /* Ticker doubled for a seamless loop */
  var ticker = $('ticker');
  ticker.innerHTML += ticker.innerHTML;

  /* Reveal and sticky */
  if ('IntersectionObserver' in window) {
    var rv = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } });
    }, { threshold: 0.15 });
    document.querySelectorAll('[data-rv]').forEach(function (el) { rv.observe(el); });
    var stickyIO = new IntersectionObserver(function (es) {
      $('sticky').classList.toggle('on', !es[0].isIntersecting);
    }, { threshold: 0.2 });
    stickyIO.observe(deck);
  } else {
    document.querySelectorAll('[data-rv]').forEach(function (el) { el.classList.add('in'); });
    $('sticky').classList.add('on');
  }

  /* Intake */
  var intake = $('intake'), track = $('inTrack'), nextBtn = $('inNext'), errEl = $('inErr');
  var a, cur = 0, sending = false, lastFocus = null;
  var ORDER = ['job', 'scope', 'when', 'budget', 'site', 'contact', 'done'];

  function fresh(job) { return { job: job || '', scope: [], details: '', when: '', budget: '', who: '', town: '', photos: [], name: '', phone: '', email: '', address: '', best: '', website: '' }; }

  function optBtn(key, v, t, s, on, cls) {
    return '<button type="button" class="opt' + (cls ? ' ' + cls : '') + '" data-k="' + key + '" data-v="' + esc(v) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(t) + (s ? '<small>' + esc(s) + '</small>' : '') + '</button>';
  }
  function stepHTML(name) {
    var J = JOBS[a.job] || JOBS.other, h = '';
    if (name === 'job') {
      h = '<h2>What are we building?</h2><p class="in-sub">Pick the closest. You can explain the rest.</p><div class="opts">';
      Object.keys(JOBS).forEach(function (k) { h += optBtn('job', k, JOBS[k].label, '', a.job === k); });
      return h + '</div>';
    }
    if (name === 'scope') {
      h = '<h2>' + esc(J.q) + '</h2><p class="in-sub">' + esc(J.label) + '. Tap all that fit.</p><div class="opts two">';
      J.scope.forEach(function (s) { h += optBtn('scope', s, s, '', a.scope.indexOf(s) > -1); });
      return h + '</div><label class="field" style="margin-top:1rem">Anything else? <span>Optional</span><textarea data-f="details" rows="3">' + esc(a.details) + '</textarea></label>';
    }
    if (name === 'when') {
      h = '<h2>When do you need it?</h2><p class="in-sub">This is how we decide who gets called first.</p><div class="opts">';
      WHEN.forEach(function (w) { h += optBtn('when', w.v, w.t, w.s, a.when === w.v, w.v === 'urgent' ? 'urgent' : ''); });
      return h + '</div>';
    }
    if (name === 'budget') {
      h = '<h2>Rough budget?</h2><p class="in-sub">No commitment. It helps us bring the right ideas.</p><div class="opts">';
      BUDGET.forEach(function (b) { h += optBtn('budget', b.v, b.t, '', a.budget === b.v); });
      return h + '</div>';
    }
    if (name === 'site') {
      h = '<h2>Where is it?</h2><p class="in-sub">Photos are optional, but they help us come ready.</p><div class="opts two" style="margin-bottom:1rem">';
      WHO.forEach(function (o) { h += optBtn('who', o.v, o.t, '', a.who === o.v); });
      h += '</div><label class="field">Town<select data-f="town"><option value="">Choose</option>';
      TOWNS.forEach(function (t) { h += '<option' + (a.town === t ? ' selected' : '') + '>' + esc(t) + '</option>'; });
      h += '</select></label><div class="photos" id="photoRow"><label class="photo-add">Add photos<input type="file" id="photoIn" accept="image/*" multiple></label>';
      a.photos.forEach(function (p) { h += '<img src="' + p + '" alt="Your photo">'; });
      return h + '</div>';
    }
    if (name === 'contact') {
      return '<h2>Who do we call?</h2><p class="in-sub">Last step. We only use this for your project.</p>' +
        '<label class="field">Name<input data-f="name" autocomplete="name" value="' + esc(a.name) + '"></label>' +
        '<label class="field">Phone<input data-f="phone" type="tel" inputmode="tel" autocomplete="tel" value="' + esc(a.phone) + '"></label>' +
        '<label class="field">Email <span>Optional</span><input data-f="email" type="email" autocomplete="email" value="' + esc(a.email) + '"></label>' +
        '<label class="field">Job address <span>Optional</span><input data-f="address" autocomplete="street-address" value="' + esc(a.address) + '"></label>' +
        '<label class="field">Best time to call <span>Optional</span><select data-f="best"><option value="">Any time</option><option' + (a.best === 'Mornings' ? ' selected' : '') + '>Mornings</option><option' + (a.best === 'Afternoons' ? ' selected' : '') + '>Afternoons</option><option' + (a.best === 'Evenings' ? ' selected' : '') + '>Evenings</option></select></label>' +
        '<input data-f="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">';
    }
    return '<div class="done" id="doneBox"></div>';
  }
  function renderSteps() {
    track.innerHTML = ORDER.map(function (s, i) { return '<div class="in-step" data-step="' + s + '" ' + (i === cur ? '' : 'inert') + '><div>' + stepHTML(s) + '</div></div>'; }).join('');
  }
  function refreshStep(name) {
    var el = track.querySelector('[data-step="' + name + '"] > div');
    if (el) el.innerHTML = stepHTML(name);
  }
  function show(i, instant) {
    cur = i;
    if (instant) track.classList.add('dragging');
    track.style.transform = 'translate3d(' + (-i * 100) + '%,0,0)';
    if (instant) { void track.offsetWidth; track.classList.remove('dragging'); }
    track.querySelectorAll('.in-step').forEach(function (s, k) {
      if (k === i) { s.removeAttribute('inert'); s.scrollTop = 0; } else s.setAttribute('inert', '');
    });
    var name = ORDER[i];
    $('tapeFill').style.width = (name === 'done' ? 100 : ((i + 1) / (ORDER.length - 1)) * 92) + '%';
    $('inBack').disabled = i === 0 || name === 'done';
    errEl.textContent = '';
    nextBtn.parentElement.classList.toggle('gone', name === 'done');
    nextBtn.textContent = name === 'contact' ? 'Send my job' : (name === 'scope' || name === 'site') ? 'Next' : 'Next';
  }
  function collect() {
    track.querySelectorAll('[data-f]').forEach(function (f) { a[f.getAttribute('data-f')] = f.value.trim(); });
  }
  function valid(name) {
    if (name === 'job' && !a.job) return 'Pick the closest job.';
    if (name === 'when' && !a.when) return 'Choose a timeframe.';
    if (name === 'budget' && !a.budget) return 'Choose a range, or "Not sure yet".';
    if (name === 'site' && !a.who) return 'Tell us who you are on this project.';
    if (name === 'site' && !a.town) return 'Choose a town.';
    if (name === 'contact') {
      if (a.name.length < 2) return 'We need a name.';
      if (digits(a.phone).length < 10) return 'We need a 10-digit phone number.';
      if (a.email && !/^\S+@\S+\.\S+$/.test(a.email)) return 'That email looks off.';
    }
    return '';
  }
  function next() {
    collect();
    var name = ORDER[cur], err = valid(name);
    if (err) {
      errEl.textContent = err;
      var bad = name === 'contact' ? track.querySelector('[data-f="' + (a.name.length < 2 ? 'name' : digits(a.phone).length < 10 ? 'phone' : 'email') + '"]') : null;
      if (bad) { bad.classList.add('bad'); bad.focus(); }
      return;
    }
    if (name === 'contact') { submit(); return; }
    if (name === 'job') refreshStep('scope');
    show(cur + 1);
  }
  function back() { collect(); if (cur > 0 && ORDER[cur] !== 'done') show(cur - 1); }

  function openIntake(job) {
    a = fresh(job);
    cur = job ? 1 : 0;
    sending = false;
    lastFocus = document.activeElement;
    renderSteps();
    intake.hidden = false;
    document.body.classList.add('locked');
    show(cur, true);
    nextBtn.disabled = false;
    $('inClose').focus();
    intakeTouched = true;
    if (history.pushState) history.pushState({ intake: 1 }, '', location.pathname + location.search + '#start');
  }
  function closeIntake(fromPop) {
    if (intake.hidden) return;
    intake.hidden = true;
    document.body.classList.remove('locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    if (!fromPop && location.hash === '#start') history.back();
  }
  document.querySelectorAll('[data-start]').forEach(function (b) { b.addEventListener('click', function () { openIntake(''); }); });
  $('inClose').addEventListener('click', function () { closeIntake(); });
  $('inBack').addEventListener('click', back);
  nextBtn.addEventListener('click', next);
  intake.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeIntake();
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'file') { e.preventDefault(); next(); }
    if (e.key === 'Tab') {
      var f = Array.prototype.filter.call(intake.querySelectorAll('button,input,select,textarea,a[href]'), function (el) {
        return !el.disabled && !el.closest('[inert]') && el.getAttribute('tabindex') !== '-1' && el.offsetParent !== null;
      });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  track.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.opt') : null;
    if (!b) return;
    var k = b.getAttribute('data-k'), v = b.getAttribute('data-v');
    if (k === 'scope') {
      var at = a.scope.indexOf(v);
      if (at > -1) a.scope.splice(at, 1); else a.scope.push(v);
      b.setAttribute('aria-pressed', at > -1 ? 'false' : 'true');
      return;
    }
    a[k] = v;
    b.parentElement.querySelectorAll('.opt').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
    if (k !== 'who') setTimeout(next, calm ? 0 : 190);
  });
  track.addEventListener('change', function (e) {
    if (e.target.id === 'photoIn') addPhotos(e.target.files);
  });
  track.addEventListener('input', function (e) { if (e.target.classList) e.target.classList.remove('bad'); });

  function addPhotos(files) {
    var list = Array.prototype.slice.call(files || []).slice(0, Math.max(0, 6 - a.photos.length));
    var row = $('photoRow');
    list.forEach(function (f) {
      var url = URL.createObjectURL(f), im = new Image();
      im.onload = function () {
        var s = Math.min(1, 360 / Math.max(im.width, im.height));
        var c = document.createElement('canvas');
        c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        var data = c.toDataURL('image/jpeg', 0.62);
        a.photos.push(data);
        var t = document.createElement('img');
        t.src = data; t.alt = 'Your photo';
        row.appendChild(t);
        URL.revokeObjectURL(url);
      };
      im.onerror = function () { URL.revokeObjectURL(url); errEl.textContent = 'One photo could not be read.'; };
      im.src = url;
    });
  }

  /* Swipe between intake steps */
  var sw = null;
  track.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    sw = { x: e.clientX, y: e.clientY, id: e.pointerId, live: false };
  });
  track.addEventListener('pointermove', function (e) {
    if (!sw || e.pointerId !== sw.id) return;
    var dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (!sw.live) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
      sw.live = true;
      track.classList.add('dragging');
    }
    var edge = (cur === 0 && dx > 0) || (ORDER[cur] === 'contact' && dx < 0) || ORDER[cur] === 'done';
    var off = edge ? dx * 0.2 : dx;
    track.style.transform = 'translate3d(calc(' + (-cur * 100) + '% + ' + off + 'px),0,0)';
  });
  function swEnd(e) {
    if (!sw || e.pointerId !== sw.id) return;
    var s = sw; sw = null;
    if (!s.live) return;
    track.classList.remove('dragging');
    var dx = e.clientX - s.x;
    if (dx < -60 && ORDER[cur] !== 'contact' && ORDER[cur] !== 'done') { next(); if (errEl.textContent) show(cur); return; }
    if (dx > 60 && cur > 0 && ORDER[cur] !== 'done') { back(); return; }
    var msg = errEl.textContent;
    show(cur);
    errEl.textContent = msg;
  }
  track.addEventListener('pointerup', swEnd);
  track.addEventListener('pointercancel', swEnd);

  /* Submit */
  function post(payload) {
    return fetch(FORM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r; });
  }
  function submit() {
    if (sending) return;
    if (a.website) { show(ORDER.indexOf('done')); return; }
    sending = true;
    nextBtn.disabled = true;
    nextBtn.textContent = 'Sending…';
    var s = score(a), J = JOBS[a.job] || JOBS.other, b = find(BUDGET, a.budget), w = find(WHEN, a.when), o = find(WHO, a.who);
    var id = 'A-' + String(Date.now()).slice(-4);
    var job = {
      id: id, ts: Date.now(), stage: 'new', parked: false, job: a.job, scope: a.scope, details: a.details, when: a.when, budget: a.budget, who: a.who, town: a.town,
      photos: a.photos, name: a.name, phone: a.phone, email: a.email, address: a.address, best: a.best, score: s.pts, pri: s.pri, why: s.why, notes: ''
    };
    var jobs = loadJobs();
    jobs.unshift(job);
    if (!save(STORE_KEY, jobs)) { job.photos = []; save(STORE_KEY, jobs); }
    if (!boardView.hidden) renderBoard();
    post({
      _subject: '[DEMO · ANTONIO] [' + PRI_LABEL[s.pri] + '] ' + J.label + ', ' + a.town,
      ticket: id, priority: PRI_LABEL[s.pri], score: s.pts, reasons: s.why.join('; '), job: J.label, scope: a.scope.join(', '), details: a.details,
      timing: w ? w.t : '', budget: b ? b.t : '', customer_type: o ? o.t : '', town: a.town, photos_attached: a.photos.length,
      name: a.name, phone: a.phone, email: a.email, address: a.address, best_time: a.best
    }).then(function () { finish(id, true); }).catch(function () { finish(id, false); });
  }
  function finish(id, ok) {
    sending = false;
    var box = $('doneBox');
    box.innerHTML = '<span class="dim">Job ' + esc(id) + '</span><h2>Got it. <em>You\'re on the board.</em></h2>' +
      '<p>We have the job, the timing and your number. Expect a call from ' + PHONE + '.</p>' +
      (ok ? '' : '<p class="done-note">Our inbox did not answer just now, so your job may not have reached us. Please call ' + PHONE + ' so it doesn\'t get lost.</p>') +
      '<a class="btn btn-primary" href="tel:+13364588379">Call us now</a>' +
      '<a class="btn btn-quiet" id="doneBoard" href="#board">Demo: see this job on the owner\'s board</a>' +
      '<button class="btn btn-quiet" type="button" id="doneClose">Back to the site</button>';
    show(ORDER.indexOf('done'));
    $('doneClose').addEventListener('click', function () { closeIntake(); });
    $('doneBoard').addEventListener('click', function () { intake.hidden = true; document.body.classList.remove('locked'); });
  }

  /* Exit intent (desktop only, once per visit) */
  var exitDlg = $('exitDlg'), intakeTouched = false, exitSeen = false;
  try { exitSeen = sessionStorage.getItem('antonio-exit') === '1'; } catch (e) { }
  document.addEventListener('mouseout', function (e) {
    if (e.relatedTarget || e.clientY > 8 || exitSeen || intakeTouched || !boardView.hidden || !exitDlg.showModal) return;
    if (window.innerWidth < 1000) return;
    exitSeen = true;
    try { sessionStorage.setItem('antonio-exit', '1'); } catch (err) { }
    exitDlg.showModal();
  });
  $('exitNo').addEventListener('click', function () { exitDlg.close(); });
  $('exitForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, send = $('exitSend');
    if (digits(f.phone.value).length < 10) { $('exitErr').textContent = 'We need a 10-digit phone number.'; return; }
    send.disabled = true; send.textContent = 'Sending…';
    post({ _subject: '[DEMO · ANTONIO] Callback request', name: f.name.value.trim(), phone: f.phone.value.trim() })
      .then(function () { f.innerHTML = '<h2>We\'ll call you.</h2><p>Thanks. You can close this.</p><button class="btn btn-primary" type="button" id="exitOk">Close</button>'; $('exitOk').addEventListener('click', function () { exitDlg.close(); }); })
      .catch(function () { send.disabled = false; send.textContent = 'Call me'; $('exitErr').textContent = 'That did not send. Please call ' + PHONE + '.'; });
  });

  /* Board */
  var boardView = $('boardView'), filter = 'all', stageTab = 'new', undoT = null;
  var HOUR = 3600000;
  function seed() {
    var now = Date.now();
    function mk(id, h, stage, job, scope, when, budget, who, town, name, tail, details) {
      var j = { id: id, ts: now - h * HOUR, stage: stage, parked: false, job: job, scope: scope, details: details || '', when: when, budget: budget, who: who, town: town, photos: [], name: name, phone: '(336) 555-01' + tail, email: '', address: '', best: '', notes: '', sample: true };
      var s = score(j); j.score = s.pts; j.pri = s.pri; j.why = s.why;
      return j;
    }
    return [
      mk('A-1042', 2, 'new', 'other', ['Water damage'], 'urgent', 'unsure', 'owner', 'Greensboro', 'Sample: Dana R.', '42', 'Ceiling is stained and dripping in the back bedroom.'),
      mk('A-1041', 5, 'new', 'addition', ['Master suite', 'Bathroom'], 'month', '50-150', 'owner', 'Summerfield', 'Sample: Marcus T.', '41', 'About 24 x 36 off the back of the house.'),
      mk('A-1040', 9, 'new', 'remodel', ['Flip or rental', 'Whole house'], 'quarter', '150+', 'investor', 'Greensboro', 'Sample: Lena W.', '40'),
      mk('A-1039', 26, 'new', 'concrete', ['Driveway', 'Tear out old concrete'], 'quarter', '10-50', 'owner', 'High Point', 'Sample: Greg P.', '39'),
      mk('A-1038', 30, 'new', 'kitchenbath', ['Primary bath', 'Walk-in shower'], 'later', 'u10', 'owner', 'Other', 'Sample: Ruth A.', '38'),
      mk('A-1035', 54, 'visit', 'porch', ['Screened porch', 'Fireplace'], 'month', '50-150', 'owner', 'Summerfield', 'Sample: Paul H.', '35'),
      mk('A-1033', 76, 'visit', 'garage', ['In-law suite'], 'quarter', '50-150', 'owner', 'Thomasville', 'Sample: Nia B.', '33'),
      mk('A-1029', 140, 'quoted', 'newhome', ['New roof'], 'month', '10-50', 'owner', 'Burlington', 'Sample: Carl D.', '29'),
      mk('A-1021', 300, 'won', 'addition', ['In-law suite'], 'month', '50-150', 'owner', 'Greensboro', 'Sample: Tasha J.', '21')
    ];
  }
  function loadJobs() { var j = load(STORE_KEY, null); if (!j) { j = seed(); save(STORE_KEY, j); } return j; }
  function ago(ts) {
    var h = (Date.now() - ts) / HOUR;
    if (h < 1) return Math.max(1, Math.round(h * 60)) + ' min ago';
    if (h < 24) return Math.round(h) + ' hr ago';
    return Math.round(h / 24) + ' d ago';
  }
  function visible(j) { return !j.parked && (filter === 'all' || (JOBS[j.job] || JOBS.other).crew === filter); }

  function renderBoard() {
    var jobs = loadJobs();
    var open = jobs.filter(function (j) { return !j.parked && j.stage !== 'won'; });
    var today = open.filter(function (j) { return j.pri === 'today' && j.stage === 'new'; }).length;
    var pipeline = open.reduce(function (t, j) { var b = find(BUDGET, j.budget); return t + (b ? b.mid : 0); }, 0);
    var won = jobs.filter(function (j) { return !j.parked && j.stage === 'won'; }).length;
    $('bKpis').innerHTML = '<div class="b-kpi hot"><b>' + today + '</b><span>Call today</span></div><div class="b-kpi"><b>' + open.length + '</b><span>Open jobs</span></div><div class="b-kpi"><b>' + money(pipeline) + '</b><span>Rough pipeline, from budget ranges</span></div><div class="b-kpi"><b>' + won + '</b><span>Won</span></div>';

    var crews = ['all'];
    Object.keys(JOBS).forEach(function (k) { if (crews.indexOf(JOBS[k].crew) < 0) crews.push(JOBS[k].crew); });
    $('bFilters').innerHTML = crews.map(function (c) { return '<button type="button" data-filter="' + esc(c) + '" aria-pressed="' + (filter === c) + '">' + (c === 'all' ? 'Everyone' : esc(c)) + '</button>'; }).join('');

    $('bStageTabs').innerHTML = STAGES.map(function (s) {
      var c = jobs.filter(function (j) { return j.stage === s.v && visible(j); }).length;
      return '<button type="button" role="tab" data-stage="' + s.v + '" aria-selected="' + (stageTab === s.v) + '"><b>' + c + '</b>' + s.t + '</button>';
    }).join('');

    $('bCols').innerHTML = STAGES.map(function (s) {
      var list = jobs.filter(function (j) { return j.stage === s.v && visible(j); }).sort(function (x, y) { return s.v === 'new' ? y.score - x.score : y.ts - x.ts; });
      var body = list.length ? list.map(jobHTML).join('') : '<p class="b-empty">Nothing here.</p>';
      return '<section class="b-col' + (stageTab === s.v ? ' show' : '') + '" data-col="' + s.v + '"><h2><span>' + s.t + '</span><span>' + list.length + '</span></h2>' + body + '</section>';
    }).join('');
  }
  function jobHTML(j) {
    var J = JOBS[j.job] || JOBS.other, b = find(BUDGET, j.budget), w = find(WHEN, j.when);
    var si = STAGES.map(function (s) { return s.v; }).indexOf(j.stage);
    var nextStage = STAGES[si + 1];
    return '<article class="job" data-id="' + esc(j.id) + '" data-pri="' + j.pri + '">' +
      '<div class="job-under"><span class="r">' + (nextStage ? esc(nextStage.t) + ' →' : '') + '</span><span class="l">← Park</span></div>' +
      '<div class="job-card" role="button" tabindex="0" aria-label="Open ' + esc(j.name) + ', ' + esc(J.label) + '">' +
      '<span class="job-tag">' + PRI_LABEL[j.pri] + ' · ' + esc(j.id) + ' · ' + ago(j.ts) + '</span>' +
      '<h3>' + esc(J.label) + '</h3>' +
      '<p class="job-meta">' + esc(j.name) + ' · ' + esc(j.town) + '</p>' +
      '<p class="job-why">' + esc((w ? w.t : '') + (b ? ' · ' + b.t : '') + ' · ' + J.crew + (j.photos && j.photos.length ? ' · ' + j.photos.length + ' photos' : '')) + '</p>' +
      '</div></article>';
  }
  function update(id, fn) {
    var jobs = loadJobs();
    jobs.forEach(function (j) { if (j.id === id) fn(j); });
    save(STORE_KEY, jobs);
    renderBoard();
  }
  function toast(msg, undo) {
    var t = $('toast');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button type="button" id="toastUndo">Undo</button>' : '');
    t.hidden = false;
    if (undo) $('toastUndo').addEventListener('click', function () { undo(); t.hidden = true; });
    clearTimeout(undoT);
    undoT = setTimeout(function () { t.hidden = true; }, 4500);
  }
  function advance(id) {
    var prev;
    update(id, function (j) {
      prev = j.stage;
      var i = STAGES.map(function (s) { return s.v; }).indexOf(j.stage);
      if (STAGES[i + 1]) j.stage = STAGES[i + 1].v;
    });
    var st = find(STAGES, loadJobs().filter(function (j) { return j.id === id; })[0].stage);
    toast('Moved to ' + st.t, function () { update(id, function (j) { j.stage = prev; }); });
  }
  function park(id) {
    update(id, function (j) { j.parked = true; });
    toast('Parked', function () { update(id, function (j) { j.parked = false; }); });
  }
  function openDrawer(id) {
    var j = loadJobs().filter(function (x) { return x.id === id; })[0];
    if (!j) return;
    var J = JOBS[j.job] || JOBS.other, b = find(BUDGET, j.budget), w = find(WHEN, j.when), o = find(WHO, j.who), tel = digits(j.phone);
    var row = function (k, v) { return v ? '<dt>' + k + '</dt><dd>' + esc(v) + '</dd>' : ''; };
    var dr = $('drawer');
    dr.innerHTML = '<button type="button" class="d-close" id="dClose" aria-label="Close">✕</button>' +
      '<span class="job-tag">' + PRI_LABEL[j.pri] + ' · score ' + j.score + '</span><h2>' + esc(J.label) + '</h2>' +
      '<p class="job-meta">' + esc(j.name) + ' · ' + esc(j.town) + '</p>' +
      '<div class="d-acts"><a class="btn btn-primary" href="tel:+1' + tel + '">Call</a><a class="btn btn-quiet" href="sms:+1' + tel + '">Text</a>' +
      '<button type="button" class="btn btn-quiet" id="dPark">Park</button></div>' +
      '<dl class="d-grid">' + row('WHY', (j.why || []).join(', ')) + row('NEEDS', (j.scope || []).join(', ')) + row('NOTES FROM CLIENT', j.details) + row('TIMING', w && w.t) + row('BUDGET', b && b.t) + row('WHO', o && o.t) + row('CREW', J.crew) + row('PHONE', j.phone) + row('EMAIL', j.email) + row('ADDRESS', j.address) + row('BEST TIME', j.best) + '</dl>' +
      (j.photos && j.photos.length ? '<div class="d-photos">' + j.photos.map(function (p) { return '<img src="' + p + '" alt="Client photo">'; }).join('') + '</div>' : '') +
      '<label class="field">Stage<select id="dStage">' + STAGES.map(function (s) { return '<option value="' + s.v + '"' + (j.stage === s.v ? ' selected' : '') + '>' + s.t + '</option>'; }).join('') + '</select></label>' +
      '<label class="field">Your notes<textarea id="dNotes" rows="3">' + esc(j.notes) + '</textarea></label>';
    dr.hidden = false;
    $('dClose').focus();
    $('dClose').addEventListener('click', function () { dr.hidden = true; });
    $('dPark').addEventListener('click', function () { dr.hidden = true; park(id); });
    $('dStage').addEventListener('change', function (e) { var v = e.target.value; update(id, function (x) { x.stage = v; }); });
    $('dNotes').addEventListener('input', function (e) { var v = e.target.value; var jobs = loadJobs(); jobs.forEach(function (x) { if (x.id === id) x.notes = v; }); save(STORE_KEY, jobs); });
  }

  $('bFilters').addEventListener('click', function (e) { var f = e.target.getAttribute('data-filter'); if (f) { filter = f; renderBoard(); } });
  $('bStageTabs').addEventListener('click', function (e) { var b = e.target.closest('[data-stage]'); if (b) { stageTab = b.getAttribute('data-stage'); renderBoard(); } });
  $('bReset').addEventListener('click', function () {
    localStorage.removeItem(STORE_KEY); localStorage.removeItem(CLIENT_KEY);
    filter = 'all'; stageTab = 'new'; $('csvMsg').textContent = '';
    renderBoard(); renderClients(); toast('Demo reset');
  });

  /* Swipe a job card */
  var js = null;
  var cols = $('bCols');
  cols.addEventListener('pointerdown', function (e) {
    var c = e.target.closest('.job-card');
    if (!c || e.button) return;
    js = { el: c, wrap: c.parentElement, x: e.clientX, y: e.clientY, id: e.pointerId, live: false };
  });
  window.addEventListener('pointermove', function (e) {
    if (!js || e.pointerId !== js.id) return;
    var dx = e.clientX - js.x, dy = e.clientY - js.y;
    if (!js.live) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { js = null; return; }
      js.live = true;
      js.el.classList.add('drag');
      try { js.el.setPointerCapture(e.pointerId); } catch (err) { }
    }
    js.el.style.transform = 'translate3d(' + dx + 'px,0,0) rotate(' + (dx / 70).toFixed(2) + 'deg)';
    js.wrap.classList.toggle('go-r', dx > 0);
    js.wrap.classList.toggle('go-l', dx < 0);
  });
  function jsEnd(e) {
    if (!js || e.pointerId !== js.id) return;
    var s = js; js = null;
    var id = s.wrap.getAttribute('data-id');
    if (!s.live) { if (e.type === 'pointerup') openDrawer(id); return; }
    s.el.classList.remove('drag');
    var dx = e.clientX - s.x, W = s.wrap.offsetWidth, limit = Math.min(110, W * 0.33);
    var stage = loadJobs().filter(function (j) { return j.id === id; })[0].stage;
    if (dx > limit && stage !== 'won') {
      s.el.style.transform = 'translate3d(' + (W + 40) + 'px,0,0) rotate(6deg)';
      setTimeout(function () { advance(id); }, calm ? 0 : 210);
    } else if (dx < -limit) {
      s.el.style.transform = 'translate3d(' + (-W - 40) + 'px,0,0) rotate(-6deg)';
      setTimeout(function () { park(id); }, calm ? 0 : 210);
    } else {
      s.el.style.transform = '';
    }
  }
  window.addEventListener('pointerup', jsEnd);
  window.addEventListener('pointercancel', jsEnd);
  cols.addEventListener('keydown', function (e) {
    var c = e.target.closest ? e.target.closest('.job-card') : null;
    if (!c) return;
    var id = c.parentElement.getAttribute('data-id');
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer(id); }
    if (e.key === 'ArrowRight') { e.preventDefault(); advance(id); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); park(id); }
  });

  /* Board tabs and CSV import */
  document.querySelectorAll('[data-btab]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-btab');
      document.querySelectorAll('[data-btab]').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      $('bJobs').hidden = t !== 'jobs';
      $('bClients').hidden = t !== 'clients';
      if (t === 'clients') renderClients();
    });
  });
  function parseCSV(text) {
    var rows = [], row = [], f = '', q = false;
    text = text.replace(/^﻿/, '');
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { f += '"'; i++; }
        else if (c === '"') q = false;
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(f); f = '';
        if (row.join('').trim()) rows.push(row);
        row = [];
      } else f += c;
    }
    row.push(f);
    if (row.join('').trim()) rows.push(row);
    return rows;
  }
  function pick(head, words, not) {
    for (var i = 0; i < head.length; i++) {
      var h = head[i].toLowerCase();
      if (not && not.test(h)) continue;
      if (words.some(function (w) { return h.indexOf(w) > -1; })) return i;
    }
    return -1;
  }
  function importCSV(text) {
    var rows = parseCSV(text);
    if (rows.length < 2) throw new Error('empty');
    var head = rows[0];
    var first = pick(head, ['first name', 'firstname']), last = pick(head, ['last name', 'lastname']);
    var name = pick(head, ['display name', 'client name', 'company name', 'name'], /first|last/);
    var phone = pick(head, ['phone', 'mobile', 'cell']), email = pick(head, ['email', 'e-mail']);
    var street = pick(head, ['street', 'address'], /email/), city = pick(head, ['city', 'town']);
    if (first < 0 && name < 0) throw new Error('nocols');
    return rows.slice(1).map(function (r) {
      var nm = first > -1 ? ((r[first] || '') + ' ' + (last > -1 ? r[last] || '' : '')).trim() : '';
      if (!nm && name > -1) nm = (r[name] || '').trim();
      return { name: nm, phone: phone > -1 ? r[phone] || '' : '', email: email > -1 ? r[email] || '' : '', street: street > -1 ? r[street] || '' : '', city: city > -1 ? r[city] || '' : '' };
    }).filter(function (c) { return c.name; });
  }
  function renderClients() {
    var list = load(CLIENT_KEY, []);
    $('clientTable').innerHTML = list.length ? '<thead><tr><th>NAME</th><th>PHONE</th><th>EMAIL</th><th>STREET</th><th>CITY</th></tr></thead><tbody>' + list.map(function (c) {
      return '<tr><td>' + esc(c.name) + '</td><td>' + esc(c.phone) + '</td><td>' + esc(c.email) + '</td><td>' + esc(c.street) + '</td><td>' + esc(c.city) + '</td></tr>';
    }).join('') + '</tbody>' : '';
  }
  $('csvIn').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var list = importCSV(String(rd.result));
        save(CLIENT_KEY, list);
        $('csvMsg').textContent = list.length + ' clients imported.';
        renderClients();
      } catch (err) {
        $('csvMsg').textContent = 'That file did not look like a client list. Check that it has a name column.';
      }
      e.target.value = '';
    };
    rd.onerror = function () { $('csvMsg').textContent = 'Could not read that file.'; };
    rd.readAsText(file);
  });

  /* Hash routing */
  function route() {
    var h = location.hash;
    var board = h === '#board';
    boardView.hidden = !board;
    $('site').style.display = board ? 'none' : '';
    document.body.classList.toggle('locked', board || !intake.hidden);
    if (board) { renderBoard(); boardView.scrollTop = 0; }
    if (h !== '#start' && !intake.hidden) closeIntake(true);
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', function () { if (location.hash !== '#start' && !intake.hidden) closeIntake(true); });
  if (location.hash === '#start') { history.replaceState(null, '', location.pathname + location.search); }
  route();
  if (location.search.indexOf('start=1') > -1) openIntake('');

  /* Triple tap on the footer mark opens the board */
  var taps = 0, tapT = null;
  $('footMark').addEventListener('click', function () {
    taps++;
    clearTimeout(tapT);
    tapT = setTimeout(function () { taps = 0; }, 600);
    if (taps >= 3) { taps = 0; location.hash = 'board'; }
  });
}());
