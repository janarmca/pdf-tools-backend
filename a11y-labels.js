/* Links each form control to the <label> written just before it, so screen readers
   announce it and tapping the label focuses the field. Also covers fields added later. */
(function () {
  'use strict';
  var n = 0;
  function fix(root) {
    var ctl = (root || document).querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),select,textarea');
    for (var i = 0; i < ctl.length; i++) {
      var c = ctl[i];
      if ((c.labels && c.labels.length) || c.getAttribute('aria-label') || c.getAttribute('aria-labelledby')) continue;
      var lab = c.previousElementSibling;
      if (!(lab && lab.tagName === 'LABEL' && !lab.htmlFor)) {
        lab = c.parentElement && c.parentElement.querySelector(':scope > label:not([for])');
      }
      if (lab && lab.textContent.trim()) {
        if (!c.id) c.id = 'a11y-f' + (++n);
        if (!lab.htmlFor) lab.htmlFor = c.id; else c.setAttribute('aria-label', lab.textContent.trim());
      } else if (c.placeholder || c.title) {
        c.setAttribute('aria-label', c.placeholder || c.title);
      }
    }
  }
  function start() {
    fix();
    if (window.MutationObserver) {
      var t; new MutationObserver(function () { clearTimeout(t); t = setTimeout(fix, 150); })
        .observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
