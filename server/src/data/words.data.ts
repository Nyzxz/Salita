import type { WordItem } from '../../../shared/src/types.js';

/**
 * Curated vocabulary set. This is intentionally hand-written rather than
 * exhaustive: each entry was picked because its history teaches the
 * learner something about the Philippines, not just its dictionary
 * definition. Ids are stable strings so quiz.data.ts and
 * milestones.data.ts can reference them.
 */
export const WORDS: WordItem[] = [
  // ---- Greetings -----------------------------------------------------
  {
    id: 'greet-salamat',
    word: 'Salamat',
    translation: 'Thank you',
    phonetic: 'sah-lah-MAT',
    category: 'greetings',
    historicalContext:
      'Most Filipino words for everyday courtesy come from Spanish, but "salamat" does not. ' +
      'It likely entered Tagalog through Malay trade contact centuries before Spanish colonization, ' +
      'making it one of the clearest surviving traces of the archipelago\'s pre-colonial trading world.',
    etymologyOrigin: 'Arabic "salāmah" (safety/peace), via Malay',
  },
  {
    id: 'greet-kumusta',
    word: 'Kumusta',
    translation: 'Hello / How are you',
    phonetic: 'koo-moos-TAH',
    category: 'greetings',
    historicalContext:
      'Borrowed directly from the Spanish greeting "¿Cómo está?", this word is now so fully ' +
      'Filipino that most speakers never register it as foreign. It works as both a greeting ' +
      'and a genuine question about someone\'s wellbeing.',
    etymologyOrigin: 'Spanish "¿Cómo está?"',
  },
  {
    id: 'greet-mabuhay',
    word: 'Mabuhay',
    translation: 'Long live / Welcome',
    phonetic: 'mah-BOO-hai',
    category: 'greetings',
    historicalContext:
      'Built from "buhay" (life), this word was used as a rallying cry during the revolution ' +
      'against Spain and later adopted as the nation\'s ceremonial greeting, printed on airport ' +
      'arrival banners and used to open speeches.',
    etymologyOrigin: 'Native Tagalog root "buhay" (life)',
  },
  {
    id: 'greet-magandang-umaga',
    word: 'Magandang Umaga',
    translation: 'Good morning',
    phonetic: 'mah-gan-DANG oo-MAH-gah',
    category: 'greetings',
    historicalContext:
      'Literally "beautiful morning," not "good morning." Filipino time-of-day greetings are built ' +
      'from "maganda" (beautiful) rather than a word for "good," a small grammatical habit that ' +
      'reflects an aesthetic rather than moral framing of the everyday.',
  },
  {
    id: 'greet-paalam',
    word: 'Paalam',
    translation: 'Goodbye',
    phonetic: 'pah-AH-lam',
    category: 'greetings',
    historicalContext:
      'Rooted in "alam" (to know), a formal farewell that carries a sense of leaving with mutual ' +
      'understanding. In casual speech it is largely replaced today by "bye" or "ingat" — this ' +
      'more formal word now mostly appears in writing, speeches, or emotional goodbyes.',
    etymologyOrigin: 'Native Tagalog root "alam" (to know)',
  },
  {
    id: 'greet-po-opo',
    word: 'Po / Opo',
    translation: 'Respect particle / Yes (respectful)',
    phonetic: 'poh / OH-poh',
    category: 'greetings',
    historicalContext:
      'Added to sentences when addressing elders, strangers, or superiors, "po" has no direct ' +
      'English translation — it signals respect the way a change in tone might in other ' +
      'languages. Its exact origin is debated among linguists, but its use is one of the first ' +
      'things Filipino children are taught, and dropping it in the wrong context can sound rude.',
  },

  // ---- Food & Dining ---------------------------------------------------
  {
    id: 'food-kain-tayo',
    word: 'Kain Tayo',
    translation: "Let's eat",
    phonetic: 'kah-IN tah-YOH',
    category: 'food',
    historicalContext:
      'Said reflexively to invite anyone nearby to join a meal — a coworker, a delivery rider, ' +
      'even a stranger who happens to be standing there — whether or not there is truly enough ' +
      'food to share. Declining the invitation is expected and not considered rude; the offer ' +
      'itself is the point.',
  },
  {
    id: 'food-adobo',
    word: 'Adobo',
    translation: 'Meat braised in vinegar, soy sauce, and garlic',
    phonetic: 'ah-DOH-boh',
    category: 'food',
    historicalContext:
      'The vinegar-based cooking method predates the Spanish, who simply gave it a name after ' +
      'their own word for marinating. What is often called the Philippines\' unofficial national ' +
      'dish is therefore a native technique wearing a colonial label.',
    etymologyOrigin: 'Spanish "adobar" (to marinate)',
  },
  {
    id: 'food-merienda',
    word: 'Merienda',
    translation: 'Afternoon snack',
    phonetic: 'meh-ree-EN-dah',
    category: 'food',
    historicalContext:
      'A Spanish-era import that became a institution rather than a habit: many schools and ' +
      'offices still schedule a formal merienda break, and refusing one can seem like refusing ' +
      'hospitality itself.',
    etymologyOrigin: 'Spanish "merienda" (afternoon snack)',
  },
  {
    id: 'food-sinigang',
    word: 'Sinigang',
    translation: 'Sour tamarind-based soup',
    phonetic: 'see-NEE-gang',
    category: 'food',
    historicalContext:
      'A native dish with no colonial-era name change, sinigang varies by region depending on ' +
      'which local souring agent is available — tamarind, guava, or unripe mango — making it a ' +
      'map of local geography as much as a recipe.',
    etymologyOrigin: 'Native Tagalog root "sigang" (to stew)',
  },
  {
    id: 'food-kamayan',
    word: 'Kamayan',
    translation: 'Eating with the hands',
    phonetic: 'kah-MAH-yan',
    category: 'food',
    historicalContext:
      'From "kamay" (hand), this pre-colonial style of communal eating off banana leaves was once ' +
      'quietly discouraged as "unrefined" during the colonial period. It has since been reclaimed ' +
      'and is now celebrated at large family gatherings and in restaurants as a proud tradition.',
    etymologyOrigin: 'Native Tagalog root "kamay" (hand)',
  },

  // ---- Cultural Values --------------------------------------------------
  {
    id: 'value-bayanihan',
    word: 'Bayanihan',
    translation: 'Communal spirit of cooperation',
    phonetic: 'bah-yah-NEE-han',
    category: 'values',
    historicalContext:
      'From "bayani" (hero), this word\'s classic image is neighbors literally lifting a nipa hut ' +
      'onto their shoulders to carry it to a new location for a family in need. Today it describes ' +
      'any grassroots volunteer effort, especially disaster relief.',
    etymologyOrigin: 'Native Tagalog root "bayani" (hero)',
  },
  {
    id: 'value-utang-na-loob',
    word: 'Utang na Loob',
    translation: 'Debt of gratitude',
    phonetic: 'OO-tang nah loh-OB',
    category: 'values',
    historicalContext:
      'Literally a "debt of one\'s inner self," this is a social debt incurred when someone helps ' +
      'you, expected to be repaid not with money but with loyalty over time. It shapes long-term ' +
      'obligations between families, employers, and even political patrons.',
  },
  {
    id: 'value-bahala-na',
    word: 'Bahala Na',
    translation: 'Come what may / leave it to fate',
    phonetic: 'bah-HAH-lah nah',
    category: 'values',
    historicalContext:
      'Widely believed to derive from "Bathala," the supreme deity of pre-colonial Tagalog belief, ' +
      'this phrase expresses resilience in uncertainty rather than passive resignation — it is ' +
      'most often said right before taking a risk, not instead of taking one.',
    etymologyOrigin: 'Possibly from "Bathala," pre-colonial supreme deity',
  },
  {
    id: 'value-pakikisama',
    word: 'Pakikisama',
    translation: 'Smooth interpersonal relations',
    phonetic: 'pah-kee-kee-SAH-mah',
    category: 'values',
    historicalContext:
      'Built from "sama" (to go along with), this value prizes group harmony, sometimes meaning ' +
      'a person will set aside their own preference — where to eat, what plan to follow — rather ' +
      'than cause visible friction within the group.',
    etymologyOrigin: 'Native Tagalog root "sama" (to accompany)',
  },
  {
    id: 'value-hiya',
    word: 'Hiya',
    translation: 'Sense of social propriety / shame',
    phonetic: 'HEE-yah',
    category: 'values',
    historicalContext:
      'Not simple embarrassment but a social regulator: the fear of causing shame to oneself or ' +
      'one\'s family in public. It quietly shapes decisions about everything from job offers to ' +
      'family disputes long before any words are exchanged.',
  },
  {
    id: 'value-diwata',
    word: 'Diwata',
    translation: 'Nature spirit / deity',
    phonetic: 'dee-WAH-tah',
    category: 'values',
    historicalContext:
      'A pre-colonial belief in nature spirits that predates both Islam and Christianity in the ' +
      'islands, "diwata" survives today mostly in folklore, place names, and fantasy fiction — a ' +
      'linguistic fossil of the archipelago\'s animist past.',
    etymologyOrigin: 'Sanskrit "devata" (deity), via early trade contact',
  },

  // ---- Everyday Phrases ---------------------------------------------------
  {
    id: 'phrase-ingat',
    word: 'Ingat',
    translation: 'Take care',
    phonetic: 'EE-ngat',
    category: 'phrases',
    historicalContext:
      'A farewell said to nearly anyone leaving — a friend heading home, a relative boarding a ' +
      'plane, a delivery rider driving off — carrying a small, genuine wish for safety rather ' +
      'than functioning as an empty pleasantry.',
  },
  {
    id: 'phrase-tara-na',
    word: 'Tara Na',
    translation: "Let's go",
    phonetic: 'TAH-rah nah',
    category: 'phrases',
    historicalContext:
      'Purely colloquial and almost always spontaneous — used to spin up a plan on the spot ' +
      'rather than to confirm one that was already scheduled. Hearing it is usually the first ' +
      'sign that an outing has just been decided.',
  },
  {
    id: 'phrase-diskarte',
    word: 'Diskarte',
    translation: 'Resourcefulness / street smarts',
    phonetic: 'dees-KAR-teh',
    category: 'phrases',
    historicalContext:
      'From a Spanish card-game term for discarding, "diskarte" now describes the prized ability ' +
      'to improvise a working solution with whatever is on hand — a trait treated as a genuine ' +
      'life skill, not a shortcut.',
    etymologyOrigin: 'Spanish "descarte" (discard)',
  },
  {
    id: 'phrase-sayang',
    word: 'Sayang',
    translation: 'What a waste / what a pity',
    phonetic: 'SAH-yang',
    category: 'phrases',
    historicalContext:
      'Used as often for a missed opportunity — a near-win, a good idea not followed through — as ' +
      'for wasted food or money, revealing how closely the culture links waste of things with ' +
      'waste of potential.',
  },
  {
    id: 'phrase-kuya',
    word: 'Kuya',
    translation: 'Older brother / respectful term for an older male',
    phonetic: 'KOO-yah',
    category: 'phrases',
    historicalContext:
      'Used for an actual older brother, but just as often for an older male stranger — a jeepney ' +
      'driver, a security guard, a store clerk — as a default term of polite address, no ' +
      'family relation required.',
    etymologyOrigin: 'Chinese (Hokkien) loanword, from a term for elder brother',
  },
  {
    id: 'phrase-ate',
    word: 'Ate',
    translation: 'Older sister / respectful term for an older female',
    phonetic: 'AH-teh',
    category: 'phrases',
    historicalContext:
      'The female counterpart to "kuya," used the same way for both family and strangers. Both ' +
      'words entered Tagalog through centuries of trade with Chinese merchants, long before ' +
      'Spanish colonization began.',
    etymologyOrigin: 'Chinese (Hokkien) loanword, from a term for elder sister',
  },
  {
    id: 'phrase-petmalu',
    word: 'Petmalu',
    translation: 'Awesome / extremely cool (slang)',
    phonetic: 'pet-MAH-loo',
    category: 'phrases',
    historicalContext:
      'Coined by reversing the syllables of "malupit" (literally "cruel," used slangily to mean ' +
      '"intense" or "awesome"). Popularized by teenagers in the 2010s, it is a small living example ' +
      'of how Filipino slang keeps inventing itself.',
    etymologyOrigin: 'Modern slang, syllable reversal of "malupit"',
  },
];
