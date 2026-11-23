// Builds the public web pages for the Privacy Policy and Terms from
// content/legal.json (the same text the app shows), into docs/ for GitHub Pages.
// Run with:  npm run legal:web
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const legal = JSON.parse(readFileSync(join(root, 'content/legal.json'), 'utf8'));
const { details } = legal;
const outDir = join(root, 'docs');
/** The website address the pages are published at (GitHub Pages custom domain). */
const SITE_DOMAIN = 'my-cultivate.com';

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fill = (s) =>
  s
    .replace(/\{operator\}/g, details.operator)
    .replace(/\{email\}/g, details.email)
    .replace(/\{canton\}/g, details.canton)
    .replace(/\{minimumAge\}/g, String(details.minimumAge));

// Escaped text, with the contact email turned into a tappable link.
const text = (s) => {
  const out = escape(fill(s));
  const email = escape(details.email);
  return email.includes('@') ? out.split(email).join(`<a href="mailto:${email}">${email}</a>`) : out;
};

const styles = `
  :root { --bg:#FBF4E9; --text:#2E1A06; --soft:#6B4532; --line:#D9C4A8; --accent:#B85E00; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#261505; --text:#FBF4E9; --soft:#E6D5BE; --line:#6B4532; --accent:#D9781F; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--soft); font-family:'DM Sans', system-ui, sans-serif;
         font-size:17px; line-height:1.6; }
  main { max-width:720px; margin:0 auto; padding:32px 16px 64px; }
  .logo { font-family:'Bagel Fat One', system-ui, sans-serif; font-size:40px; color:var(--text);
          text-decoration:none; }
  .logo span { color:var(--accent); }
  nav { margin:8px 0 32px; padding-bottom:12px; border-bottom:1px solid var(--line); }
  nav a { color:var(--soft); margin-right:20px; }
  h1 { color:var(--text); font-size:30px; line-height:1.2; margin:0 0 16px; }
  h2 { color:var(--text); font-size:20px; margin:32px 0 8px; }
  a { color:var(--accent); }
  ul { padding-left:22px; }
  li { margin-bottom:6px; }
  .date { margin-top:40px; font-size:15px; }
`;

function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} · Cultivate.</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=DM+Sans:wght@400;700&display=swap" rel="stylesheet">
<style>${styles}</style>
</head>
<body>
<main>
<a class="logo" href="index.html">Cultivate<span>.</span></a>
<nav><a href="privacy.html">Privacy Policy</a><a href="terms.html">Terms of Use</a></nav>
${body}
</main>
</body>
</html>
`;
}

function documentPage(doc) {
  const sections = doc.sections
    .map((s) => {
      const blocks = s.blocks
        .map((b) =>
          b.ul ? `<ul>${b.ul.map((i) => `<li>${text(i)}</li>`).join('')}</ul>` : `<p>${text(b.p)}</p>`,
        )
        .join('\n');
      return `<h2>${escape(s.heading)}</h2>\n${blocks}`;
    })
    .join('\n');
  return page(
    doc.title,
    `<h1>${escape(doc.title)}</h1>
<p>${text(doc.intro)}</p>
${sections}
<p class="date">Last updated: ${escape(details.effectiveDate)}</p>`,
  );
}

const home = page(
  'Home',
  `<h1>Your cosy shelf of books, movies and series.</h1>
<p>Cultivate. is an iPhone app for keeping one personal library of what you have read and watched, or want to, with private notes on each one.</p>
<p>Contact: ${text('{email}')}</p>`,
);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), home);
writeFileSync(join(outDir, 'privacy.html'), documentPage(legal.privacy));
writeFileSync(join(outDir, 'terms.html'), documentPage(legal.terms));
// Tell GitHub Pages to serve the files as they are.
writeFileSync(join(outDir, '.nojekyll'), '');
// Serve the pages on our own domain (DNS for it points at GitHub Pages).
writeFileSync(join(outDir, 'CNAME'), `${SITE_DOMAIN}\n`);
console.log('Wrote docs/index.html, docs/privacy.html and docs/terms.html');
