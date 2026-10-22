/* poster-layout.js — the editor layout of the Tamil Poster Maker (loaded last).
 * Left rail (desktop) / bottom bar (phone) chooses what the side panel shows: templates, blank page, elements, text effects,
 * photo tools, arrange, size, shop footer, AI, download. On a phone the side panel and the "selected item" panel are bottom
 * sheets over the canvas, so the poster always stays big and easy to edit.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var PRO = { el: 1, tx: 1, ph: 1, ar: 1, ai: 1 };
  var phone = function () { return window.matchMedia('(max-width: 899px)').matches; };
  var cur = 'tpl';

  function refit() { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }
  function openPane(p, fromUser) {
    cur = p;
    document.querySelectorAll('#rail button').forEach(function (b) { b.classList.toggle('on', b.dataset.p === p); });
    var pane = PRO[p] ? 'pro' : p;
    document.querySelectorAll('#side .pane').forEach(function (x) { x.classList.toggle('on', x.dataset.pane === pane); });
    if (PRO[p] && window.__posterPro) window.__posterPro.showTab(p);
    var side = $('side');
    if (phone()) { if (fromUser) { side.classList.add('open'); $('propCard').classList.remove('has'); } }
    side.scrollTop = 0;
  }
  function closeSide() { $('side').classList.remove('open'); document.querySelectorAll('#rail button').forEach(function (b) { b.classList.remove('on'); }); }

  function start() {
    var P = window.__poster; if (!P || !P.canvas) { setTimeout(start, 60); return; }
    var C = P.canvas;
    document.querySelectorAll('#rail button').forEach(function (b) {
      b.addEventListener('click', function () {
        if (phone() && $('side').classList.contains('open') && cur === b.dataset.p) { closeSide(); return; }
        openPane(b.dataset.p, true);
      });
    });
    document.querySelectorAll('[data-close]').forEach(function (x) {
      x.addEventListener('click', function () { if (x.dataset.close === 'side') closeSide(); else { $('propCard').classList.remove('has'); $('propCard').dataset.dismissed = '1'; } });
    });
    $('topDl').addEventListener('click', function () { openPane('dl', true); if (!phone()) $('xPng').focus(); });
    // picking a design on a phone closes the sheet so the poster is visible
    document.addEventListener('poster-picked', function () { if (phone()) closeSide(); });

    // "selected item" panel: shown while something is selected (always visible on big screens)
    var props = $('propCard');
    // on a phone, tapping an item ON the poster closes the tool sheet and shows its settings; an item just added FROM the
    // sheet keeps the sheet open (so you can go on styling it there)
    var lastTap = 0;
    C.on('mouse:down', function () { lastTap = Date.now(); });
    var onSel = function () { props.dataset.dismissed = ''; props.classList.add('has'); if (phone() && Date.now() - lastTap < 800) closeSide(); };
    C.on('selection:created', onSel); C.on('selection:updated', onSel);
    C.on('selection:cleared', function () { props.classList.remove('has'); });

    // blank pages
    var BL = [['#ffffff', 'வெள்ளை', '#111'], ['#000000', 'கருப்பு', '#fff'], ['#fff6e5', 'Cream', '#6b4a00'], ['#14213d', 'Navy', '#fff'],
      [[[0, '#ff9933'], [1, '#ffd166']], 'காவி', '#5a2a00'], [[[0, '#7c2d9a'], [1, '#b5179e']], 'ஊதா', '#fff'], [[[0, '#0b7a3e'], [1, '#2ecc71']], 'பச்சை', '#fff'], [[[0, '#1e3a8a'], [1, '#38bdf8']], 'நீலம்', '#fff']];
    var box = $('blanks');
    BL.forEach(function (x) {
      var b = document.createElement('button'); b.type = 'button';
      b.style.background = Array.isArray(x[0]) ? 'linear-gradient(180deg,' + x[0][0][1] + ',' + x[0][1][1] + ')' : x[0];
      b.style.color = x[2]; b.textContent = x[1];
      b.addEventListener('click', function () { blank(x[0]); });
      box.appendChild(b);
    });
    $('blankGo').addEventListener('click', function () { blank($('blankColor').value); });
    async function blank(bg) {
      window.__posterBlankBg = bg;
      await P.applyTemplate('blank');
      if (!Array.isArray(bg)) { try { $('bgColor').value = bg; } catch (e) {} }
      P.toast('காலி பக்கம் தயார் — ➕ எழுத்து, 🖼️ படம், 🧩 Elements சேருங்கள்');
      if (phone()) closeSide();
    }
    openPane('tpl', false);
    if (phone()) closeSide();
    setTimeout(refit, 50);
    window.matchMedia('(max-width: 899px)').addEventListener('change', function () { closeSide(); refit(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
