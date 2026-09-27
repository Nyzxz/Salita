import type { QuizQuestion } from '../../../shared/src/types.js';

/**
 * Hand-authored quiz questions rather than randomly generated ones, so the
 * wrong-answer choices are plausible instead of nonsensical, and every
 * question teaches something in its explanation even when missed.
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'quiz-01',
    wordId: 'greet-salamat',
    prompt: 'Salamat',
    choices: ['Thank you', 'Goodbye', 'Welcome', 'Take care'],
    correctAnswer: 'Thank you',
    explanation:
      'Unlike most Filipino courtesy words, "salamat" traces to Arabic via Malay traders, not Spanish.',
  },
  {
    id: 'quiz-02',
    wordId: 'greet-kumusta',
    prompt: 'Kumusta',
    choices: ['Hello / How are you', 'Good morning', 'Thank you', "Let's go"],
    correctAnswer: 'Hello / How are you',
    explanation: 'Borrowed from Spanish "¿Cómo está?", it now feels fully native to Filipino ears.',
  },
  {
    id: 'quiz-03',
    wordId: 'food-adobo',
    prompt: 'Adobo',
    choices: [
      'Meat braised in vinegar, soy sauce, and garlic',
      'Afternoon snack',
      'Sour tamarind soup',
      'Eating with the hands',
    ],
    correctAnswer: 'Meat braised in vinegar, soy sauce, and garlic',
    explanation: "The vinegar-based cooking method is native; only the dish's Spanish name isn't.",
  },
  {
    id: 'quiz-04',
    wordId: 'value-bayanihan',
    prompt: 'Bayanihan',
    choices: [
      'Communal spirit of cooperation',
      'Debt of gratitude',
      'Sense of shame',
      'Come what may',
    ],
    correctAnswer: 'Communal spirit of cooperation',
    explanation:
      'Named after the tradition of neighbors literally carrying a house to its new location together.',
  },
  {
    id: 'quiz-05',
    wordId: 'value-bahala-na',
    prompt: 'Bahala Na',
    choices: [
      'Come what may / leave it to fate',
      'Debt of gratitude',
      'Smooth interpersonal relations',
      'Nature spirit',
    ],
    correctAnswer: 'Come what may / leave it to fate',
    explanation:
      'Believed to derive from Bathala, the pre-colonial supreme deity — said before taking a risk, not instead of one.',
  },
  {
    id: 'quiz-06',
    wordId: 'phrase-kuya',
    prompt: 'Kuya',
    choices: [
      'Older brother / respectful term for an older male',
      'Older sister / respectful term for an older female',
      "Let's go",
      'Take care',
    ],
    correctAnswer: 'Older brother / respectful term for an older male',
    explanation: 'Entered Tagalog through Chinese trade contact long before Spanish colonization.',
  },
  {
    id: 'quiz-07',
    wordId: 'value-utang-na-loob',
    prompt: 'Utang na Loob',
    choices: ['Debt of gratitude', 'What a waste / pity', 'Resourcefulness', 'Long live'],
    correctAnswer: 'Debt of gratitude',
    explanation: "Literally a debt of one's inner self, repaid with loyalty rather than money.",
  },
  {
    id: 'quiz-08',
    wordId: 'greet-mabuhay',
    prompt: 'Mabuhay',
    choices: ['Long live / Welcome', 'Goodbye', 'Good morning', 'Awesome'],
    correctAnswer: 'Long live / Welcome',
    explanation:
      'Built from "buhay" (life); used as a revolutionary rallying cry and now a ceremonial greeting.',
  },
  {
    id: 'quiz-09',
    wordId: 'food-kamayan',
    prompt: 'Kamayan',
    choices: ['Eating with the hands', 'Afternoon snack', 'Sour soup', "Let's eat"],
    correctAnswer: 'Eating with the hands',
    explanation: 'From "kamay" (hand) — once discouraged as unrefined, now proudly reclaimed.',
  },
  {
    id: 'quiz-10',
    wordId: 'phrase-petmalu',
    prompt: 'Petmalu',
    choices: ['Awesome / extremely cool (slang)', 'Take care', 'Resourcefulness', 'What a waste'],
    correctAnswer: 'Awesome / extremely cool (slang)',
    explanation:
      'Coined by reversing the syllables of "malupit" — proof the language keeps inventing itself.',
  },
];
