// ============================================================
// Build step for the ON FOOD ERP.
//
// The app is written as separate .jsx files loaded straight into the
// browser, with Babel Standalone compiling them at page load. That is a
// pleasant way to develop — no build, just refresh — but it means every
// visitor downloads a 3 MB compiler and waits for ~4,800 lines of JSX to
// be compiled before anything appears.
//
// This does that compilation once, here, and writes a version of the app
// that needs no compiler and no CDN:
//
//   app/dist/index.html   the page, with local scripts
//   app/dist/app.js       every .jsx file compiled and joined
//   app/dist/vendor/*.js  React, ReactDOM, Supabase and xlsx
//
// Nothing in app/ is modified. The source files stay exactly as they are
// and can still be opened directly with ERP Preview.html while working.
//
//   npm install && npm run build
//
// One thing worth knowing if you edit this: the .jsx files are *joined*,
// not bundled as modules. Loaded as plain scripts they all share one
// global scope, which is how proposed.jsx can see Icons and useAppState
// without importing them. Joining preserves that; turning them into
// modules would not.
// ============================================================

import * as esbuild from 'esbuild';
import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const APP  = path.join(import.meta.dirname, 'app');
const DIST = path.join(APP, 'dist');
const SRC  = path.join(APP, 'ERP Preview.html');

// `eager: false` means the file is copied into vendor/ but not linked from
// the page — something loads it on demand instead.
const VENDOR = [
  ['react/umd/react.production.min.js',                    'react.js',        true],
  ['react-dom/umd/react-dom.production.min.js',            'react-dom.js',    true],
  ['@supabase/supabase-js/dist/umd/supabase.js',           'supabase.js',     true],
  // The Supabase UMD build is code-split and loads this chunk at runtime,
  // so it has to sit beside the main file or the client never appears.
  ['@supabase/supabase-js/dist/umd/591.supabase.js',       '591.supabase.js', false],
  // 861 KB, and only needed when somebody exports a spreadsheet. Fetched
  // on first use by the shim below rather than by every page load.
  ['xlsx/dist/xlsx.full.min.js',                           'xlsx.js',         false],
];

// Loads vendor/xlsx.js the first time an export is asked for, then calls
// through to the real exporter. ERPExport already refuses politely when
// XLSX is missing, so nothing downstream needed changing.
const LAZY_XLSX = `
// ---------- lazy loader for the spreadsheet library ----------
(function () {
  var pending = null;
  function loadXLSX() {
    if (typeof XLSX !== 'undefined') return Promise.resolve();
    if (pending) return pending;                 // a second click waits, it does not fetch again
    pending = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'vendor/xlsx.js';
      s.onload = resolve;
      s.onerror = function () { pending = null; reject(new Error('could not be downloaded')); };
      document.head.appendChild(s);
    });
    return pending;
  }
  var real = window.ERPExport;
  if (!real) return;
  var wrapped = {};
  Object.keys(real).forEach(function (k) {
    if (typeof real[k] !== 'function') { wrapped[k] = real[k]; return; }
    wrapped[k] = function () {
      var args = arguments;
      return loadXLSX()
        .then(function () { return real[k].apply(real, args); })
        .catch(function (e) { window.alert('The export library ' + e.message + '. Check your connection and try again.'); });
    };
  });
  window.ERPExport = wrapped;
})();
`;

const ASSETS = ['styles.css'];

// Self-hosted fonts. The page previously pulled these from Google, which
// is one more host that has to be reachable — and on a network where it
// is not, the request hangs rather than failing fast. Only the latin
// subset and the weights the stylesheet actually asks for are copied.
const FONTS = [
  ['@fontsource/inter/files/inter-latin-400-normal.woff2',                 'Inter', 400],
  ['@fontsource/inter/files/inter-latin-500-normal.woff2',                 'Inter', 500],
  ['@fontsource/inter/files/inter-latin-600-normal.woff2',                 'Inter', 600],
  ['@fontsource/inter/files/inter-latin-700-normal.woff2',                 'Inter', 700],
  ['@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2','JetBrains Mono', 400],
  ['@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2','JetBrains Mono', 500],
];

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0).padStart(5) + ' KB';

async function build() {
  const html = await readFile(SRC, 'utf8');

  // The order these load in matters: proposed.jsx refers to things
  // icons.jsx and proposed-store.jsx define, so read the order off the
  // page rather than hard-coding it here and letting the two drift.
  const files = [...html.matchAll(/<script\s+type="text\/babel"\s+src="([^"]+)"><\/script>/g)]
    .map((m) => m[1]);
  if (!files.length) throw new Error('No <script type="text/babel" src="..."> tags found.');

  // The main app lives inline in the page, after those files.
  const inline = html.match(/<script\s+type="text\/babel"\s+data-presets="[^"]*">([\s\S]*?)<\/script>/);
  if (!inline) throw new Error('Could not find the inline application script.');

  console.log('Compiling:');
  const parts = [];
  for (const f of [...files, null]) {
    const name = f ?? '(inline app script)';
    const code = f ? await readFile(path.join(APP, f), 'utf8') : inline[1];
    const out = await esbuild.transform(code, {
      loader: 'jsx',
      // Browsers that run the current app run this too; no need to
      // down-level syntax and grow the output.
      target: ['es2020'],
      sourcefile: name,
    });
    for (const w of out.warnings) console.log(`  ! ${name}: ${w.text}`);
    parts.push(`\n// ---------- ${name} ----------\n${out.code}`);
    console.log(`  ${kb(code)}  ${name}`);
  }

  // Joined, not bundled — see the note at the top of this file.
  // The lazy loader goes last: it wraps window.ERPExport, so it has to run
  // after proposed-export.jsx has defined it.
  const appJs = `(function () {\n'use strict';\n${parts.join('\n')}\n${LAZY_XLSX}\n})();\n`;

  await rm(DIST, { recursive: true, force: true });
  await mkdir(path.join(DIST, 'vendor'), { recursive: true });
  await writeFile(path.join(DIST, 'app.js'), appJs);

  for (const [from, to] of VENDOR) {
    const src = path.join(import.meta.dirname, 'node_modules', from);
    if (!existsSync(src)) throw new Error(`Missing ${from}. Run: npm install`);
    await copyFile(src, path.join(DIST, 'vendor', to));
  }
  for (const a of ASSETS) {
    if (existsSync(path.join(APP, a))) await copyFile(path.join(APP, a), path.join(DIST, a));
  }

  await mkdir(path.join(DIST, 'fonts'), { recursive: true });
  const faces = [];
  for (const [from, family, weight] of FONTS) {
    const src = path.join(import.meta.dirname, 'node_modules', from);
    if (!existsSync(src)) throw new Error(`Missing font ${from}. Run: npm install`);
    const file = path.basename(from);
    await copyFile(src, path.join(DIST, 'fonts', file));
    faces.push(
      `@font-face {\n  font-family: '${family}';\n  font-style: normal;\n` +
      `  font-weight: ${weight};\n  font-display: swap;\n` +
      `  src: url('fonts/${file}') format('woff2');\n}`
    );
  }
  await writeFile(path.join(DIST, 'fonts.css'), faces.join('\n') + '\n');

  // Rewrite the page: local libraries, one compiled script, no compiler.
  //
  // Position matters and is easy to get wrong. The inline bootstrap in the
  // <head> calls supabase.createClient the moment it runs, so the library
  // has to already be there. Moving the libraries to the end of <body>
  // leaves that bootstrap finding nothing — the app still renders, but
  // falls into offline mode and never reaches the database. So the local
  // libraries go exactly where the CDN tags were, and the compiled script
  // goes exactly where the inline application script was.
  let out = html;

  const cdnTags = [...out.matchAll(/[ \t]*<script[^>]*src="https?:\/\/[^"]+"[^>]*><\/script>\r?\n?/g)];
  if (!cdnTags.length) throw new Error('No CDN script tags found to replace.');

  const vendorTags = [
    '  <!-- Compiled by build.mjs — do not edit app/dist by hand. -->',
    ...VENDOR.filter(([, , eager]) => eager)
             .map(([, to]) => `  <script src="vendor/${to}"></script>`),
  ].join('\n') + '\n';

  // First CDN tag becomes the whole local block; the rest are dropped.
  out = out.replace(cdnTags[0][0], vendorTags);
  out = out.replace(/[ \t]*<script[^>]*src="https?:\/\/[^"]+"[^>]*><\/script>\r?\n?/g, '');

  // Google Fonts: preconnect hints and the stylesheet all go, replaced by
  // the local @font-face file written above.
  out = out.replace(/[ \t]*<link[^>]*fonts\.gstatic\.com[^>]*>\r?\n?/g, '');
  out = out.replace(/[ \t]*<link[^>]*fonts\.googleapis\.com[^>]*>\r?\n?/g,
                    '  <link rel="stylesheet" href="fonts.css">\n');

  // The per-file Babel tags are no longer needed; their code is in app.js.
  out = out.replace(/[ \t]*<script\s+type="text\/babel"\s+src="[^"]+"><\/script>\r?\n?/g, '');

  // The compiled bundle takes the inline script's place, preserving order.
  out = out.replace(/[ \t]*<script\s+type="text\/babel"\s+data-presets="[^"]*">[\s\S]*?<\/script>/,
                    '  <script src="app.js"></script>');

  if (!out.includes('app.js')) throw new Error('Could not place the compiled script.');
  if (/src="https?:\/\/[^"]*\.js"/.test(out)) throw new Error('A CDN script survived the rewrite.');
  if (out.includes('text/babel')) throw new Error('A Babel script tag survived the rewrite.');
  if (/https?:\/\/fonts\./.test(out)) throw new Error('A Google Fonts reference survived the rewrite.');

  await writeFile(path.join(DIST, 'index.html'), out);

  console.log('\nWrote app/dist:');
  console.log(`  ${kb(out)}  index.html`);
  console.log(`  ${kb(appJs)}  app.js  (was 3 MB of Babel plus this, compiled on every load)`);
  console.log('\n  npx serve app/dist');
}

build().catch((e) => { console.error('\nBuild failed:', e.message); process.exit(1); });
