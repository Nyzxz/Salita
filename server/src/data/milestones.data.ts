import type { LanguageMilestone } from '../../../shared/src/types.js';

/**
 * Five broad eras used to tell the story of how modern Filipino formed.
 * Dates are intentionally approximate ("Before 1521" rather than a single
 * year) since language change does not happen on a single date — each
 * description calls out the historical event that anchors the era.
 */
export const MILESTONES: LanguageMilestone[] = [
  {
    id: 'era-precolonial',
    era: 'Before 1521',
    title: 'Baybayin and the pre-colonial languages',
    description:
      'Long before any European contact, communities across the islands wrote using Baybayin, ' +
      'a syllabic script (an abugida) etched onto bamboo and leaves, mainly for poetry and personal ' +
      'messages rather than official record-keeping. Centuries of trade with Malay, Chinese, and ' +
      'Indian merchants had already folded Sanskrit- and Arabic-derived words into everyday speech, ' +
      'including words for the divine, for numbers, and for common courtesies.',
    keyWordsIntroduced: ['greet-salamat', 'value-diwata', 'value-bahala-na'],
  },
  {
    id: 'era-spanish',
    era: '1565 – 1898',
    title: '333 years of Spanish rule',
    description:
      'From Miguel López de Legazpi\'s 1565 settlement until the 1898 Treaty of Paris, Spanish ' +
      'colonization introduced Catholicism, the Latin alphabet, and thousands of loanwords covering ' +
      'religion, food, numbers, and household life. Many of these words are now so fully absorbed ' +
      'that most speakers no longer perceive them as foreign at all.',
    keyWordsIntroduced: ['greet-kumusta', 'food-adobo', 'food-merienda', 'phrase-diskarte'],
  },
  {
    id: 'era-american',
    era: '1898 – 1946',
    title: 'The American period',
    description:
      'After the Treaty of Paris ceded the islands to the United States and the Philippine–American ' +
      'War ended, American colonial administrators built a public school system taught in English. ' +
      'That policy embedded English deeply alongside Spanish-influenced Tagalog, laying the ' +
      'groundwork for the English–Tagalog code-switching so common in the Philippines today.',
    keyWordsIntroduced: [],
  },
  {
    id: 'era-independence',
    era: '1946 – 1987',
    title: 'Independence and a national language',
    description:
      'Philippine independence in 1946 accelerated a decades-long push for a national language ' +
      'built on Tagalog. The 1987 Constitution formally named Filipino, alongside English, as an ' +
      'official language — codifying a language already shaped by Malay, Sanskrit, Arabic, ' +
      'Chinese, Spanish, and American influence.',
    keyWordsIntroduced: ['greet-mabuhay'],
  },
  {
    id: 'era-modern',
    era: '1990s – Today',
    title: 'Taglish and digital-age slang',
    description:
      'Contemporary Filipino speech mixes Tagalog and English fluidly — a style widely called ' +
      '"Taglish" — while continuously generating new slang, including syllable reversals and ' +
      'terms born on social media. The language keeps absorbing influence exactly as it always ' +
      'has, just faster.',
    keyWordsIntroduced: ['phrase-petmalu', 'phrase-tara-na'],
  },
];
