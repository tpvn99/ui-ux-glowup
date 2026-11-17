// Seeded defects and regression traps. Each defect edits the HTML of a clean page and names the rules
// that SHOULD report it (any one is enough). Ground truth by construction: we know what we broke.
const rep = (re, to) => (html) => html.replace(re, to);
const beforeHeadEnd = (s) => (html) => html.replace(/<\/head>/i, `${s}\n</head>`);
const beforeBodyEnd = (s) => (html) => html.replace(/<\/body>/i, `${s}\n</body>`);

export const DEFECTS = {
  "viewport-missing": { area: "responsive", desc: "No viewport meta tag", apply: rep(/<meta name="viewport"[^>]*>\s*/i, ""), expect: ["audit:viewport-meta"] },
  "lang-missing": { area: "accessibility", desc: "No lang attribute on <html>", apply: rep(/(<html\b[^>]*?)\slang="[^"]*"/i, "$1"), expect: ["audit:lang"] },
  "title-missing": { area: "seo", desc: "No <title>", apply: rep(/<title>[\s\S]*?<\/title>\s*/i, ""), expect: ["audit:seo-title"] },
  "description-missing": { area: "seo", desc: "No meta description", apply: rep(/<meta name="description"[^>]*>\s*/i, ""), expect: ["audit:seo-description"] },
  "seo-noindex": { area: "seo", desc: "Page set to noindex", apply: beforeHeadEnd('<meta name="robots" content="noindex">'), expect: ["audit:seo-noindex"] },
  "h1-missing": { area: "hierarchy", desc: "The only H1 turned into an H2", apply: (h) => h.replace(/<h1/g, "<h2").replace(/<\/h1>/g, "</h2>"), expect: ["audit:h1-missing"] },
  "zoom-blocked": { area: "accessibility", desc: "Pinch zoom disabled", apply: rep(/(<meta name="viewport" content="[^"]*)"/i, '$1, maximum-scale=1, user-scalable=no"'), expect: ["audit:zoom-blocked"] },
  "low-contrast": { area: "accessibility", desc: "Light grey text on white", apply: beforeHeadEnd("<style>p,li,dd,td,label,.lead,h3{color:#bdbdbd!important}body,main,section,article,header,footer{background:#fff!important}</style>"), expect: ["audit:contrast"] },
  "focus-removed": { area: "accessibility", desc: "Focus outline removed everywhere", apply: beforeHeadEnd("<style>*:focus,*:focus-visible{outline:none!important;box-shadow:none!important}</style>"), expect: ["audit:focus-invisible"] },
  "tiny-text": { area: "responsive", desc: "Body text at 10px", apply: beforeHeadEnd("<style>p,li,dd,td,.lead{font-size:10px!important}</style>"), expect: ["audit:tiny-text", "audit:mobile-body-size", "audit:body-size", "responsive:text-too-small"] },
  "overflow-block": { area: "responsive", desc: "A 760px block that breaks the phone layout", apply: rep(/(<body\b[^>]*>)/i, '$1<div style="width:760px;height:8px;background:#ccc" aria-hidden="true"></div>'), expect: ["audit:overflow", "responsive:overflow-x", "a11y:reflow-320"] },
  "blocking-heavy-script": { area: "performance", desc: "Synchronous lodash in <head>", apply: beforeHeadEnd('<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>'), expect: ["perf:render-blocking-script", "perf:heavy-library"] },
  "js-error": { area: "functionality", desc: "A script throws on load", apply: beforeBodyEnd("<script>window.__glowupBug.start()</script>"), expect: ["smoke:js-error"] },
  "unnamed-icon-button": { area: "accessibility", desc: "Icon button with no accessible name", apply: beforeBodyEnd('<div style="padding:16px"><button type="button" onclick="void 0"><svg width="20" height="20" viewBox="0 0 20 20"><path d="M3 3h14v14H3z"/></svg></button></div>'), expect: ["audit:accessible-name"] },
  "clickable-div": { area: "accessibility", desc: "A div used as a button", apply: beforeBodyEnd('<div class="cta" onclick="void 0" style="cursor:pointer;padding:12px 16px">Request a quote</div>'), expect: ["audit:clickable-div"] },
  "empty-link": { area: "functionality", desc: "A link that points nowhere", apply: beforeBodyEnd('<p style="padding:16px"><a href="#">Learn more</a></p>'), expect: ["smoke:empty-link", "audit:vague-cta"] },
  "dead-button": { area: "functionality", desc: "A button with no behaviour", apply: beforeBodyEnd('<div style="padding:16px"><button type="button" id="gl-dead">Save changes</button></div>'), expect: ["smoke:dead-control"] },
  "positive-tabindex": { area: "accessibility", desc: "tabindex above 0", apply: rep(/<a /i, '<a tabindex="3" '), expect: ["a11y:positive-tabindex"] },
  "duplicate-id": { area: "accessibility", desc: "Two elements share an id", apply: beforeBodyEnd('<p id="gl-dup" style="padding:0 16px">a</p><p id="gl-dup" style="padding:0 16px">b</p>'), expect: ["a11y:duplicate-id"] },
  "aria-hidden-focusable": { area: "accessibility", desc: "A button inside aria-hidden", apply: beforeBodyEnd('<div aria-hidden="true" style="padding:16px"><button type="button" onclick="void 0">Hidden but tabbable</button></div>'), expect: ["a11y:aria-hidden-focusable"] },
  "keyboard-trap": { area: "accessibility", desc: "A field that swallows Tab", apply: beforeBodyEnd('<div style="padding:16px"><input aria-label="Trap" id="gl-trap" type="text"></div><script>document.getElementById("gl-trap").addEventListener("keydown",function(e){if(e.key==="Tab")e.preventDefault()})</script>'), expect: ["a11y:keyboard-trap"] },
  "img-alt-missing": { area: "accessibility", desc: "An image without alt", apply: rep(/(<img\b[^>]*?)\salt="[^"]+"/i, "$1"), expect: ["audit:img-alt"] },
  "main-removed": { area: "accessibility", desc: "No <main> landmark", apply: (h) => h.replace(/<main\b/i, "<div").replace(/<\/main>/i, "</div>"), expect: ["a11y:no-main-landmark"] },
  "form-label-removed": { area: "accessibility", desc: "A field loses its label", apply: rep(/<label\b[^>]*\bfor="[^"]+"[^>]*>[\s\S]*?<\/label>/i, ""), expect: ["audit:form-labels", "ux:placeholder-as-label"] },
  "lorem": { area: "content", desc: "Placeholder text left in", apply: beforeBodyEnd('<p style="padding:16px;max-width:60ch">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>'), expect: ["audit:lorem"] },
  "broken-image": { area: "visuals", desc: "An image that fails to load", apply: beforeBodyEnd('<div style="padding:16px"><img src="/missing-hero.jpg" width="400" height="200" alt="Team photo"></div>'), expect: ["audit:broken-images"] },
  "lcp-lazy": { area: "performance", desc: "The first image is lazy-loaded", apply: rep(/<img\b(?![^>]*loading=)/i, '<img loading="lazy" '), expect: ["perf:lcp-lazy", "perf:below-fold-not-lazy"] },
};

export const TRAPS = {
  "nav-link-removed": { desc: "A navigation link disappears", apply: rep(/(<nav\b[\s\S]*?)<a\b[^>]*href=[^>]*>[^<]*<\/a>/i, "$1"), expect: ["control-missing", "element-missing"] },
  "heading-removed": { desc: "A section heading disappears", apply: rep(/<h2\b[^>]*>[\s\S]*?<\/h2>/i, ""), expect: ["element-missing"] },
  "validation-removed": { desc: "A required field is no longer required", apply: rep(/\srequired(?=[\s>])/i, ""), expect: ["validation-lost"] },
  "js-handler-broken": { requiresBehaviour: true, desc: "Buttons lose their event handlers", apply: beforeBodyEnd("<script>window.addEventListener('load',function(){setTimeout(function(){document.querySelectorAll('button').forEach(function(b){b.replaceWith(b.cloneNode(true))})},50)})</script>"), expect: ["control-broken", "scenario-regressed"] },
  "new-js-error": { desc: "A new script error appears", apply: beforeBodyEnd("<script>setTimeout(function(){throw new Error('boom')},0)</script>"), expect: ["new-js-error"] },
};
