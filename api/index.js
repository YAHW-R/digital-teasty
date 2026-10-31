// 1. Forzamos a Vercel a usar la red Edge (Latencia ultra baja)
export const config = {
  runtime: 'edge',
};

// 2. Importamos los datos (Vercel los empaqueta y los sube a la memoria RAM)
import promises from './promises.json';
import catalog from './templates.json';

const { types: TYPES, templates: TEMPLATES, church: CHURCH } = catalog;

/* ------------------------------------------------------------------ *
 * Utilidades
 * ------------------------------------------------------------------ */

const pick = (arr) => arr[(Math.random() * arr.length) | 0];

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

// La NVI llega con comillas desparejas (252 textos abren con «»», otros cierran
// sin haber abierto y otros no cierran). Se normaliza a un único par «…».
const quoted = (text) => {
  let t = text.trim();
  if (t.startsWith('»')) t = `«${t.slice(1)}`;
  else if (!/^[«"“]/.test(t)) t = `«${t}`;
  if (!/[»”"]/.test(t)) t = /[.!?]$/.test(t) ? t.replace(/([.!?])$/, '»$1') : `${t}»`;
  return t;
};

/* ------------------------------------------------------------------ *
 * Hoja de estilos: base mobile-first + una receta visual por plantilla
 * (solo se envía el HTML, cero dependencias externas)
 * ------------------------------------------------------------------ */

const BASE_CSS = `
:root{--sans:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;--serif:ui-serif,Georgia,Cambria,"Times New Roman",serif;--radius:24px}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0;min-height:100vh;min-height:100dvh;
  display:flex;align-items:center;justify-content:center;
  padding:clamp(1rem,5vw,2.5rem);
  padding-top:max(clamp(1rem,5vw,2.5rem),env(safe-area-inset-top));
  padding-bottom:max(clamp(1rem,5vw,2.5rem),env(safe-area-inset-bottom));
  font-family:var(--sans);color:var(--text);
  background:var(--bg);background-image:var(--bg-image,none);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
}
.card{
  position:relative;width:100%;max-width:32rem;
  padding:clamp(1.25rem,6vw,2.25rem);
  background:var(--surface);border:1px solid var(--border);
  border-radius:var(--radius,24px);box-shadow:var(--shadow,none);
  text-align:center;overflow:hidden;
}
.art{display:block;width:100%;max-width:22rem;height:auto;margin:0 auto 1.15rem;border-radius:18px;overflow:hidden}
.kicker{
  margin:0 0 .6rem;font-size:.7rem;font-weight:700;
  letter-spacing:.22em;text-transform:uppercase;color:var(--muted);
  display:inline-flex;align-items:center;gap:.5rem;
}
.title{margin:0 0 1.15rem;font-size:.95rem;font-weight:600;color:var(--muted);text-wrap:balance}
.tags{display:flex;flex-wrap:wrap;gap:.4rem;justify-content:center;margin:0 0 1.35rem}
.tag{
  font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;
  padding:.3rem .6rem;border-radius:999px;
  border:1px solid var(--border);color:var(--muted);
}
.tag.accent{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 45%,transparent)}
.quote{margin:0}
.quote p{
  margin:0;font-family:var(--serif);
  font-size:clamp(1.15rem,5.4vw,1.55rem);line-height:1.5;font-weight:500;
  text-wrap:pretty;overflow-wrap:anywhere;
}
.ref{margin:.9rem 0 0;font-size:.8rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.meaning{margin:.7rem auto 0;max-width:24rem;font-family:var(--serif);font-style:italic;font-size:.88rem;line-height:1.5;color:var(--muted);text-wrap:balance}
.more{margin:.85rem 0 0}
.more summary{
  font-size:.75rem;color:var(--muted);cursor:pointer;list-style:none;
  text-decoration:underline dotted;text-underline-offset:4px;
}
.more summary::-webkit-details-marker{display:none}
.more[open] summary{margin-bottom:.85rem}
.clamp p{display:-webkit-box;-webkit-line-clamp:7;-webkit-box-orient:vertical;overflow:hidden}
.card:has(.more[open]) .clamp p{display:block;-webkit-line-clamp:unset}
.gospel{margin:1.5rem 0 0;padding:1rem .95rem;border-radius:16px;text-align:left;background:var(--gospel-bg);border:1px solid var(--gospel-border)}
.gospel-label{
  display:block;margin-bottom:.4rem;font-size:.6rem;font-weight:700;
  letter-spacing:.2em;text-transform:uppercase;color:var(--accent);
}
.gospel p{margin:0;font-size:.95rem;line-height:1.55;text-wrap:pretty}
.invite{margin:1.15rem 0 0;font-size:.95rem;line-height:1.55;font-weight:600;text-wrap:balance}
.actions{display:flex;flex-direction:column;gap:.6rem;margin:1.5rem 0 0}
.btn{
  display:flex;align-items:center;justify-content:center;
  min-height:50px;padding:0 1.1rem;border-radius:14px;
  font-size:.95rem;font-weight:700;text-decoration:none;
  -webkit-tap-highlight-color:transparent;transition:transform .12s ease;
}
.btn:active{transform:scale(.97)}
.btn.primary{background:var(--accent);color:var(--on-accent)}
.btn.ghost{background:transparent;color:var(--accent);border:1px solid var(--border)}
.church{margin:1.6rem 0 0}
.church-label{display:flex;align-items:center;gap:.7rem;margin:0;font-size:.6rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--accent)}
.church-label::before,.church-label::after{content:"";flex:1;height:1px;background:var(--border)}
.church-name{margin:.8rem 0 0;font-size:.82rem;font-weight:600;line-height:1.5;text-wrap:balance}
.church-address{margin:.35rem auto 0;max-width:22rem;font-size:.72rem;line-height:1.5;color:var(--muted);text-wrap:pretty}
.church-links{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin:.75rem 0 0}
.church-link{
  display:inline-flex;align-items:center;gap:.4rem;min-height:44px;padding:0 .9rem;
  border:1px solid var(--border);border-radius:999px;
  font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  text-decoration:none;color:var(--accent);-webkit-tap-highlight-color:transparent;
  transition:transform .12s ease;
}
.church-link svg{width:15px;height:15px}
.church-link:active{transform:scale(.97)}
.footer{margin:1.35rem 0 0;font-size:.7rem;line-height:1.5;color:var(--muted);text-wrap:pretty}
@media (min-width:26rem){.actions{flex-direction:row}.btn{flex:1}}
@media (prefers-reduced-motion:reduce){.btn,.church-link{transition:none}}
`;

// Cada plantilla aporta su propio fondo, radios, sombra y tipografía.
// Los tokens de color llegan de templates.json (theme), lo de aquí es la forma.
const STYLE_CSS = {
  // Noche profunda con acentos dorados
  nocturne: `
.s-nocturne{--radius:26px;--shadow:0 22px 60px rgba(0,0,0,.5);
  --bg-image:radial-gradient(120% 80% at 50% 0%,#1c2b57 0%,#0a1024 46%,#05070f 100%);
  --gospel-bg:rgba(255,255,255,.05);--gospel-border:rgba(255,255,255,.12)}
.s-nocturne .quote p{font-style:italic}
.s-nocturne .kicker::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 14px var(--accent)}
.s-nocturne .ref{font-variant:small-caps;letter-spacing:.1em}
.s-nocturne .btn.primary{background:linear-gradient(180deg,#f2d9a3,#dfb866);box-shadow:0 12px 28px rgba(230,192,122,.22)}
`,
  // papel de cuaderno, tinta cálida
  paper: `
.s-paper{--radius:8px;
  --bg-image:repeating-linear-gradient(180deg,#f8f2e6 0 30px,#f1eadb 30px 31px);
  --gospel-bg:#f4eddd;--gospel-border:#e2d7c0}
.s-paper .card{text-align:left;box-shadow:0 14px 36px rgba(96,74,40,.14)}
.s-paper .kicker{letter-spacing:.3em;color:#9a8a6c}
.s-paper .title{text-align:left;color:#6b5c42}
.s-paper .tags{justify-content:flex-start}
.s-paper .quote p{border-left:3px solid var(--accent);padding-left:1rem;text-align:left}
.s-paper .ref{text-transform:none;letter-spacing:.02em;font-family:var(--serif);font-style:italic}
.s-paper .gospel-label{font-family:var(--serif);font-style:italic;font-size:.8rem;text-transform:none;letter-spacing:.04em}
.s-paper .btn{border-radius:6px}
.s-paper .btn.primary{background:var(--text);color:var(--on-accent)}
.s-paper .church-label{font-family:var(--serif);font-style:italic;font-weight:400;font-size:.8rem;letter-spacing:.04em;text-transform:none}
.s-paper .church-link{border-radius:5px;letter-spacing:.1em}
`,
  // amanecer, degradado cálido y tipografía marcada
  sunrise: `
.s-sunrise{--radius:28px;--shadow:0 24px 56px rgba(90,25,60,.3);
  --bg-image:linear-gradient(160deg,#ffd9a8 0%,#ff9f7a 36%,#f2698f 68%,#8a63d8 100%);
  --gospel-bg:rgba(255,255,255,.6);--gospel-border:rgba(255,255,255,.75)}
.s-sunrise .kicker{background:var(--accent);color:#fff;padding:.32rem .8rem;border-radius:999px;letter-spacing:.14em}
.s-sunrise .quote p{font-family:var(--sans);font-weight:800;font-size:clamp(1.3rem,6vw,1.85rem);line-height:1.32;letter-spacing:-.015em}
.s-sunrise .btn{border-radius:999px}
.s-sunrise .btn.primary{background:linear-gradient(135deg,#ff7a4d,#ef4f8a);color:#fff;box-shadow:0 12px 26px rgba(239,79,138,.35)}
.s-sunrise .btn.ghost{color:var(--text);border-color:rgba(58,23,48,.22)}
.s-sunrise .tag{border-color:rgba(58,23,48,.18)}
.s-sunrise .meaning{font-family:var(--sans);font-style:normal;font-weight:500}
`,
  // cielo, minimalista con marco interior
  sky: `
.s-sky{--radius:22px;
  --bg-image:radial-gradient(90% 65% at 50% 0%,#fff 0%,#dbe9ff 45%,#c9dcf9 100%);
  --gospel-bg:rgba(255,255,255,.72);--gospel-border:rgba(42,91,215,.18)}
.s-sky .card{backdrop-filter:blur(12px)}
.s-sky .card::before{
  content:"";position:absolute;inset:.9rem;pointer-events:none;
  border:1px solid rgba(42,91,215,.13);border-radius:14px;
}
.s-sky .kicker{font-size:.62rem;letter-spacing:.4em}
.s-sky .title{font-family:var(--serif);font-style:italic;font-weight:400}
.s-sky .ref{font-family:var(--serif);font-variant:small-caps;letter-spacing:.2em}
.s-sky .btn.primary{background:transparent;border:1px solid var(--accent);color:var(--accent)}
.s-sky .gospel{text-align:center}
`,
  // bosque, verde profundo y orgánico
  forest: `
.s-forest{--radius:34px;
  --bg-image:radial-gradient(80% 55% at 12% 8%,#1e5340 0%,transparent 62%),radial-gradient(75% 55% at 100% 100%,#2c7053 0%,transparent 58%),linear-gradient(170deg,#0a1e17,#0f2b21);
  --gospel-bg:rgba(255,255,255,.06);--gospel-border:rgba(255,255,255,.13)}
.s-forest .kicker{color:#9ad9bb}
.s-forest .quote p{line-height:1.6}
.s-forest .ref{letter-spacing:.2em}
.s-forest .gospel{border-radius:22px}
.s-forest .btn{border-radius:999px}
.s-forest .btn.primary{background:linear-gradient(180deg,#9ee0bd,#79cba1);box-shadow:0 12px 28px rgba(10,36,24,.5)}
`,
};

/* ------------------------------------------------------------------ *
 * Ilustración por plantilla: SVG en línea (0 peticiones extra).
 * Solo viaja la del estilo sorteado.
 * ------------------------------------------------------------------ */

const ART = {
  // Luna creciente y campo de estrellas
  nocturne: `<svg class="art" viewBox="0 0 320 140" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="#e6c07a" d="M226 22a34 34 0 1 0 34 34A28 28 0 0 1 226 22z"/><g fill="#e6c07a"><circle cx="44" cy="30" r="2"/><circle cx="92" cy="18" r="1.4"/><circle cx="150" cy="34" r="1.8"/><circle cx="294" cy="26" r="1.4"/><circle cx="196" cy="14" r="1.2"/><circle cx="24" cy="64" r="1.3"/><circle cx="286" cy="76" r="1.2"/><circle cx="118" cy="52" r="1"/><circle cx="70" cy="92" r="1"/></g><path d="M0 112c40-22 74-22 112 0s74 22 112 0 74-22 96-6" fill="none" stroke="#e6c07a" stroke-opacity=".28" stroke-width="2" stroke-linecap="round"/></svg>`,
  // Biblia abierta
  paper: `<svg class="art" viewBox="0 0 320 140" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#9a6b2f"><path d="M160 44v12M154 50h12" stroke-width="3.5" stroke-linecap="round"/><path d="M160 66c-22-10-52-14-90-12v62c38-2 68 2 90 12 22-10 52-14 90-12V54c-38-2-68 2-90 12z" stroke-width="3" stroke-linejoin="round"/><path d="M160 66v62" stroke-width="3" stroke-linecap="round"/><path d="M138 84h-30M138 96h-26M138 108h-30M182 84h30M182 96h26M182 108h30" stroke-width="2.4" stroke-linecap="round" opacity=".5"/></svg>`,
  // Sol naciente sobre las colinas
  sunrise: `<svg class="art" viewBox="0 0 320 140" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M160 16v22M100 32l11 20M220 32l-11 20M64 66l16 16M256 66l-16 16" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="7" stroke-linecap="round"/><circle cx="160" cy="108" r="40" fill="#ffd166"/><path d="M0 140v-22c44-16 74 8 116 0s66-18 104-8 62 20 100 10v20z" fill="#4a2a63" opacity=".26"/></svg>`,
  // Nube y sol entre luces
  sky: `<svg class="art" viewBox="0 0 320 140" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><circle cx="250" cy="42" r="19" fill="#ffd76a"/><path d="M250 6v8M280 18l6 6M286 42h8M280 66l6-6M220 18l-6 6M214 42h-8M220 66l-6-6" fill="none" stroke="#ffd76a" stroke-width="5" stroke-linecap="round"/><g fill="#fff" opacity=".95"><ellipse cx="100" cy="88" rx="40" ry="18"/><ellipse cx="134" cy="76" rx="28" ry="24"/><ellipse cx="68" cy="94" rx="25" ry="14"/><rect x="40" y="90" width="122" height="18" rx="9"/></g><path d="M196 100l-13 13M218 106l-13 13M240 100l-13 13" fill="none" stroke="#2a5bd7" stroke-opacity=".28" stroke-width="3" stroke-linecap="round"/></svg>`,
  // Sierra, pinos y luna
  forest: `<svg class="art" viewBox="0 0 320 140" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><circle cx="256" cy="34" r="16" fill="#9ee0bd" opacity=".5"/><path d="M0 140V94l56-40 38 26 34-42 56 62z" fill="#1e5340" opacity=".7"/><g fill="#0c2a1f" opacity=".9"><path d="M96 140v-46l-20 24h12l-22 22h60l-22-22h12z"/></g><path d="M0 140v-24l70-34 44 28 38-24 60 54z" fill="#2c7053" opacity=".55"/><g fill="#0a2219" opacity=".9"><path d="M238 140v-40l-17 21h10l-20 19h54l-20-19h10z"/><path d="M292 140v-30l-13 16h8l-15 14h40l-15-14h8z"/></g></svg>`,
};

// Glifos de las dos redes: SVG en línea, sin peticiones ni licencias externas
const ICONS = {
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3z"/></svg>`,
};

const themeVars = (theme) =>
  `--bg:${theme.bg};--surface:${theme.surface};--border:${theme.border};` +
  `--text:${theme.text};--muted:${theme.muted};--accent:${theme.accent};--on-accent:${theme.onAccent}`;

/* ------------------------------------------------------------------ *
 * Render
 * ------------------------------------------------------------------ */

export default function handler(request) {
  // Selección O(1) de datos
  const promise = pick(promises);
  const tpl = pick(TEMPLATES);
  const copy = tpl.copy;
  const theme = tpl.theme;

  const type = TYPES[promise.promise_type] ?? TYPES.other;
  const meaning = copy.typeMessage?.[promise.promise_type] ?? type.message;
  const gospel = pick(copy.gospel);

  // NVI tiene 1 verso sin español (Mark 11:26): caemos al inglés, que ya trae sus comillas
  const verse = promise.verse_text_es || promise.verse_text_en;
  const verseText = promise.verse_text_es ? quoted(verse) : verse;
  const verseLang = promise.verse_text_es ? '' : ' lang="en"';
  const longVerse = verse.length > 240;

  // Recarga garantizada al tocar el CTA: la URL cambia, el servidor sortea otra vez
  const nextUrl = `?n=${Math.random().toString(36).slice(2, 8)}`;
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(
    `${verseText.slice(0, 200)}\n\n${promise.reference_es}\n${gospel}`
  )}`;

  const favicon = (
    `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>` +
    `<rect width='64' height='64' rx='16' fill='${theme.accent}'/>` +
    `<path d='M32 15v34M19 32h26' stroke='${theme.onAccent}' stroke-width='7' stroke-linecap='round'/></svg>`
  ).replace(/#/g, '%23');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="${theme.themeColor}">
<meta name="robots" content="noindex">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>${esc(copy.title)}</title>
<link rel="icon" href="${favicon}">
<style>
body{${themeVars(theme)}}
${BASE_CSS}${STYLE_CSS[tpl.style] ?? ''}</style>
</head>
<body class="s-${tpl.style}">
<main class="card">
${ART[tpl.style] ?? ''}
<p class="kicker">${esc(copy.kicker)}</p>
<h1 class="title">${esc(copy.title)}</h1>
<div class="tags">
<span class="tag accent">${esc(type.label)}</span>
${promise.is_conditional ? '<span class="tag">Con condiciones</span>' : ''}
</div>
<blockquote class="quote${longVerse ? ' clamp' : ''}"><p${verseLang}>${esc(verseText)}</p></blockquote>
${longVerse ? '<details class="more"><summary>Leer el texto completo</summary></details>' : ''}
<p class="ref">${esc(promise.reference_es)}</p>
<p class="meaning">${esc(meaning)}</p>
<section class="gospel">
<span class="gospel-label">Para ti hoy</span>
<p>${esc(gospel)}</p>
</section>
<p class="invite">${esc(copy.invitation)}</p>
<nav class="actions">
<a class="btn primary" href="${nextUrl}">${esc(copy.cta)}</a>
<a class="btn ghost" href="${shareUrl}" target="_blank" rel="noopener">${esc(copy.share)}</a>
</nav>
<aside class="church">
<p class="church-label">${esc(CHURCH.label)}</p>
<p class="church-name">${esc(CHURCH.name)}</p>
<p class="church-address">${esc(CHURCH.address)}<br>${esc(CHURCH.city)}</p>
<div class="church-links">
<a class="church-link" href="${esc(CHURCH.instagram)}" target="_blank" rel="noopener" aria-label="Rey de Reyes en Instagram">${ICONS.instagram}Instagram</a>
<a class="church-link" href="${esc(CHURCH.youtube)}" target="_blank" rel="noopener" aria-label="Rey de Reyes en YouTube">${ICONS.youtube}YouTube</a>
</div>
</aside>
<p class="footer">${esc(copy.footer)}</p>
</main>
</body>
</html>`;

  // Respondemos al cliente instruyendo al navegador que NO guarde caché
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
