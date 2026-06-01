// Climate Ticker build step. From a single source of truth (index.html +
// src/*) it emits two distributable artifacts:
//
//   1. widget.html        — fully self-contained page; host it and embed via
//                           an <iframe>. One remote dep (the Google Fonts link).
//   2. climate-ticker.js  — the <climate-ticker> Web Component bundle; drop in
//                           a <script> tag and use the custom element anywhere.
//                           Styles are encapsulated in a Shadow DOM.
const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, data) => {
  fs.writeFileSync(path.join(root, rel), data, 'utf8');
  console.log('Built ' + rel + ' (' + data.length + ' bytes)');
};

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap';

// Source files, in load order.
const JS_FILES = [
  'src/constants.js',
  'src/odometer.js',
  'src/units.js',
  'src/projections.js',
  'src/app.js',
];

const indexHtml = read('index.html');
const css = read('src/style.css');

// ---- 1. Standalone widget.html (inline every local CSS/JS reference) --------
let html = indexHtml
  .replace(
    /<link[^>]*href="\.\/(src\/[^"]+\.css)"[^>]*>/g,
    (_m, file) => '<style>\n' + read(file) + '\n</style>'
  )
  .replace(
    /<script[^>]*src="\.\/(src\/[^"]+\.js)"[^>]*><\/script>/g,
    (_m, file) => '<script>\n' + read(file) + '\n</script>'
  );
write('widget.html', html);

// ---- 2. Web Component bundle climate-ticker.js ------------------------------
// The widget markup (everything inside <body> before the scripts) becomes the
// Shadow DOM content. In a shadow tree :root matches nothing, so design tokens
// are moved onto :host (which also lets embedders re-theme from outside).
const markup = indexHtml.match(/<body>\s*([\s\S]*?)\s*<script\b/)[1].trim();
const shadowCss = ':host{display:block}\n' + css.replace(/:root\b/, ':host');

const bundledJs = JS_FILES.map(
  (f) => '// ===== ' + f + ' =====\n' + read(f)
).join('\n\n');

const component =
  '/* Climate Ticker — embeddable Web Component. Defines <climate-ticker>.\n' +
  ' * Usage: <script src="climate-ticker.js"></script> then <climate-ticker></climate-ticker>\n' +
  ' * No external runtime deps; no network calls (all values are computed locally). */\n' +
  '(function () {\n' +
  bundledJs +
  '\n\n' +
  '  var CSS = ' + JSON.stringify(shadowCss) + ';\n' +
  '  var HTML = ' + JSON.stringify(markup) + ';\n' +
  '  var FONT = ' + JSON.stringify(FONT_HREF) + ';\n\n' +
  '  function ensureFont() {\n' +
  '    if (!document.querySelector("link[data-climate-ticker-font]")) {\n' +
  '      var l = document.createElement("link");\n' +
  '      l.rel = "stylesheet";\n' +
  '      l.href = FONT;\n' +
  '      l.setAttribute("data-climate-ticker-font", "");\n' +
  '      document.head.appendChild(l);\n' +
  '    }\n' +
  '  }\n\n' +
  '  class ClimateTicker extends HTMLElement {\n' +
  '    connectedCallback() {\n' +
  '      if (this._mounted) return;\n' +
  '      this._mounted = true;\n' +
  '      ensureFont();\n' +
  '      const shadow = this.attachShadow({ mode: "open" });\n' +
  '      shadow.innerHTML = "<style>" + CSS + "</style>" + HTML;\n' +
  '      window.CS_App.init(shadow);\n' +
  '    }\n' +
  '  }\n' +
  '  if (!customElements.get("climate-ticker")) {\n' +
  '    customElements.define("climate-ticker", ClimateTicker);\n' +
  '  }\n' +
  '})();\n';

write('climate-ticker.js', component);
