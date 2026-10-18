import raw from '@/content/info-pages.json';

/** About / Privacy / Terms / Help text — the same file every app bundles. */
export interface InfoSection {
  id?: string;
  title: string;
  body?: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalPage {
  title: string;
  summary: string[];
  intro: string;
  sections: InfoSection[];
}

export interface InfoContent {
  version: number;
  lastUpdated: string;
  supportEmail: string;
  website: string;
  about: { tagline: string; sections: InfoSection[] };
  privacy: LegalPage;
  terms: LegalPage;
  help: {
    title: string;
    intro: string;
    faqs: { q: string; a: string }[];
    troubleshooting: { title: string; body: string }[];
  };
}

export const INFO: InfoContent = raw as InfoContent;
