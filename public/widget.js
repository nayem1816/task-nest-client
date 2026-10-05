/*
 * TaskNest website chat loader.
 *
 *   <script src="https://YOUR-TASKNEST-APP/widget.js" data-key="wk_..." async></script>
 *
 * Adds one iframe to the page. Everything else (the launcher, the chat, the
 * connection) runs inside it, so the site's styles and scripts cannot touch
 * the chat and the chat cannot touch the site.
 */
(function () {
  var script = document.currentScript;
  if (!script || window.__tasknestWidget) return;
  window.__tasknestWidget = true;

  var key = script.getAttribute('data-key');
  if (!key) {
    console.warn('TaskNest chat: add data-key="wk_..." to the widget script tag.');
    return;
  }

  var appOrigin = new URL(script.src).origin;
  var frame = document.createElement('iframe');
  frame.src =
    appOrigin +
    '/widget/' +
    encodeURIComponent(key) +
    '?origin=' +
    encodeURIComponent(window.location.origin);
  frame.title = 'Chat with us';
  frame.setAttribute('aria-label', 'Chat with us');

  var style = frame.style;
  style.position = 'fixed';
  style.right = '0';
  style.bottom = '0';
  style.border = '0';
  style.background = 'transparent';
  style.colorScheme = 'normal';
  style.zIndex = '2147483000';
  style.maxWidth = '100%';
  style.maxHeight = '100%';

  // Hidden until the chat says it loaded, so a wrong key or an unlisted site
  // leaves no empty box on the page.
  var state = 'hidden';

  // The chat switches to its full-screen layout below 440px of iframe width,
  // so the desktop iframe is exactly that wide and phones get the whole screen.
  function applySize() {
    var phone = window.innerWidth < 480;
    if (state === 'open') {
      style.width = phone ? '100%' : '440px';
      style.height = phone ? '100%' : Math.min(720, window.innerHeight) + 'px';
    } else if (state === 'closed') {
      style.width = '96px';
      style.height = '96px';
    } else {
      style.width = '0';
      style.height = '0';
    }
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== appOrigin || event.source !== frame.contentWindow) return;
    var data = event.data;
    if (!data || data.source !== 'tasknest-widget') return;
    if (data.type === 'state') {
      state = data.state;
      applySize();
    } else if (data.type === 'unavailable') {
      console.warn('TaskNest chat: ' + data.message);
    }
  });
  window.addEventListener('resize', applySize);

  applySize();
  function mount() {
    document.body.appendChild(frame);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
