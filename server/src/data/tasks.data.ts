import type { ActivityTask } from '../../../shared/src/types.js';

/** Mock activities and performance tasks. Read-only list — no admin editor yet. */
export const TASKS: ActivityTask[] = [
  {
    id: 'task-act-1',
    type: 'ACTIVITY',
    title: 'Write 5 sentences using "po" and "opo"',
    description:
      'Using what you learned in the Greetings lecture, write five short sentences that correctly ' +
      'use "po" or "opo" to show respect. Include an English translation under each one.',
    totalPoints: 20,
    dueDate: '2026-10-10T23:59:00.000Z',
  },
  {
    id: 'task-act-2',
    type: 'ACTIVITY',
    title: 'Vocabulary reflection: Bahala Na',
    description:
      'In 3-4 sentences, describe a time you (or someone you know) showed the "bahala na" mindset — ' +
      'taking a risk and trusting things would work out. Use the word at least once.',
    totalPoints: 10,
    dueDate: '2026-10-05T23:59:00.000Z',
  },
  {
    id: 'task-perf-1',
    type: 'PERFORMANCE_TASK',
    title: 'Record a 1-minute self-introduction',
    description:
      'Write a short self-introduction script in Filipino (name, where you are learning from, one ' +
      'thing you like) using at least three words from the Greetings or Phrases categories. Submit ' +
      'the script text here; recording it aloud is optional practice.',
    totalPoints: 50,
    dueDate: '2026-10-20T23:59:00.000Z',
  },
  {
    id: 'task-perf-2',
    type: 'PERFORMANCE_TASK',
    title: 'Cultural values mini-essay',
    description:
      'Pick two Cultural Values words from the Explore tab and write a short essay (150-250 words) ' +
      'comparing them to a similar concept, or the lack of one, in your own culture.',
    totalPoints: 50,
    dueDate: '2026-11-01T23:59:00.000Z',
  },
];
