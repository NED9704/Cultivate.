// The Privacy Policy and Terms live in content/legal.json, so the app pages and
// the web pages (scripts/build-legal-pages.mjs → docs/) always say the same thing.
// To fill in your name, email or canton, edit "details" at the top of that file.
import legal from '../../content/legal.json';

export type LegalBlock = { p: string } | { ul: string[] };
export type LegalSection = { heading: string; blocks: LegalBlock[] };
export type LegalDocument = {
  title: string;
  intro: string;
  sections: LegalSection[];
  effectiveDate: string;
};

const details = legal.details;

/** Replaces {operator}, {email}, {canton} and {minimumAge} with the real details. */
function fill(text: string): string {
  return text
    .replace(/\{operator\}/g, details.operator)
    .replace(/\{email\}/g, details.email)
    .replace(/\{canton\}/g, details.canton)
    .replace(/\{minimumAge\}/g, String(details.minimumAge));
}

function build(doc: { title: string; intro: string; sections: LegalSection[] }): LegalDocument {
  return {
    title: doc.title,
    intro: fill(doc.intro),
    effectiveDate: details.effectiveDate,
    sections: doc.sections.map((s) => ({
      heading: s.heading,
      blocks: s.blocks.map((b) => ('ul' in b ? { ul: b.ul.map(fill) } : { p: fill(b.p) })),
    })),
  };
}

export const privacyPolicy = build(legal.privacy as { title: string; intro: string; sections: LegalSection[] });
export const termsOfUse = build(legal.terms as { title: string; intro: string; sections: LegalSection[] });
