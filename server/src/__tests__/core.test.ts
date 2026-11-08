import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkAttachment, safeFileName } from '../submissions/attachments.js';
import { csvCell, csvRow, parseCsv } from '../csv.js';
import { parsePageRequest, escapeRegExp } from '../pagination.js';
import { matchesGrade } from '../grades.js';
import { LIMITS } from '../limits.js';
import { MAX_LOGIN_ATTEMPTS } from '../auth/loginAttempts.js';
import { loginOutcomeToHttp, GENERIC_LOGIN_ERROR } from '../auth/loginOutcome.js';
import { COOKIE_SESSION_MARKER, buildSessionCookie, clearSessionCookie, readCookie } from '../auth/cookies.js';
import { createToken, verifyToken } from '../auth/token.js';
import { buildReview, parseCreateQuizRequest, scoreAnswers } from '../quizzes/quizzes.service.js';
import { parseGradeSubmissionRequest } from '../submissions/submissions.service.js';
import { generateDefaultPassword, parseImportStudentsRequest } from '../admin/students.service.js';
import { parseMarkReadRequest } from '../notifications/notifications.service.js';

const quizBody = (extra: Record<string, unknown> = {}) => ({
  title: 'Quiz',
  description: 'Desc',
  gradeLevel: 'Grade 8',
  questions: [{ questionText: 'Q?', options: ['a', 'b', 'c', 'd'], correctAnswerIndex: 1, points: 2 }],
  ...extra,
});

describe('quiz scoring', () => {
  const questions = [
    { correctAnswerIndex: 1, points: 2 },
    { correctAnswerIndex: 0, points: 3 },
  ];
  it('adds up points for correct answers', () => {
    const result = scoreAnswers(questions, [1, 0]);
    assert.equal(result.scoreObtained, 5);
    assert.equal(result.percentageScore, 100);
  });
  it('scores a blank (-1) answer as wrong', () => {
    const result = scoreAnswers(questions, [1, -1]);
    assert.equal(result.scoreObtained, 2);
    assert.equal(result.percentageScore, 40);
  });
  it('builds a review showing what was chosen and earned', () => {
    const review = buildReview(
      [{ questionText: 'Q', options: ['a', 'b', 'c', 'd'], correctAnswerIndex: 2, points: 4 }],
      [0],
    );
    assert.deepEqual(review[0], { questionText: 'Q', options: ['a', 'b', 'c', 'd'], correctAnswerIndex: 2, userAnswer: 0, points: 4, earned: 0 });
  });
});

describe('quiz request parsing', () => {
  it('accepts a valid quiz with settings', () => {
    const parsed = parseCreateQuizRequest(quizBody({ maxAttempts: 2, dueDate: '2030-01-01T00:00:00.000Z', showAnswers: false }));
    assert.ok(parsed);
    assert.equal(parsed.maxAttempts, 2);
    assert.equal(parsed.showAnswers, false);
  });
  it('defaults answer review to on', () => {
    assert.equal(parseCreateQuizRequest(quizBody())?.showAnswers, true);
  });
  it('rejects bad attempt limits, dates and fractional points', () => {
    assert.equal(parseCreateQuizRequest(quizBody({ maxAttempts: 0 })), null);
    assert.equal(parseCreateQuizRequest(quizBody({ maxAttempts: 1.5 })), null);
    assert.equal(parseCreateQuizRequest(quizBody({ dueDate: 'not a date' })), null);
    assert.equal(parseCreateQuizRequest(quizBody({ questions: [{ questionText: 'Q', options: ['a', 'b', 'c', 'd'], correctAnswerIndex: 0, points: 1.5 }] })), null);
  });
});

describe('grading requests', () => {
  it('keeps the version the teacher saw', () => {
    const parsed = parseGradeSubmissionRequest({ grade: 8, expectedSubmittedAt: '2030-01-01T00:00:00.000Z' });
    assert.equal(parsed?.expectedSubmittedAt, '2030-01-01T00:00:00.000Z');
  });
  it('rejects an invalid version stamp and over-long feedback', () => {
    assert.equal(parseGradeSubmissionRequest({ grade: 8, expectedSubmittedAt: 'nope' }), null);
    assert.equal(parseGradeSubmissionRequest({ grade: 8, feedback: 'x'.repeat(LIMITS.feedback + 1) }), null);
  });
});

describe('login', () => {
  it('answers every credential failure the same way', () => {
    const result = loginOutcomeToHttp({ status: 'invalid_credentials' });
    assert.equal(result.status, 401);
    assert.equal(result.body.error, GENERIC_LOGIN_ERROR);
  });
  it('rate limits with a retry time', () => {
    const result = loginOutcomeToHttp({ status: 'rate_limited', retryAfterSeconds: 30 });
    assert.equal(result.status, 429);
    assert.equal(result.retryAfterSeconds, 30);
  });
  it('keeps the token out of the body and in a cookie', () => {
    const result = loginOutcomeToHttp({
      status: 'success',
      session: { token: 'real-token', expiresAt: new Date(Date.now() + 3_600_000).toISOString(), user: { id: '1', name: 'A', username: 'a', role: 'STUDENT' } },
    });
    assert.equal(result.status, 200);
    assert.ok(result.setCookie?.includes('real-token'));
    assert.ok(!JSON.stringify(result.body).includes('real-token'));
    assert.equal((result.body.data as { token: string }).token, COOKIE_SESSION_MARKER);
  });
  it('locks after three attempts', () => assert.equal(MAX_LOGIN_ATTEMPTS, 3));
});

describe('session cookie', () => {
  it('is httpOnly and same-site strict', () => {
    const cookie = buildSessionCookie('abc', 60);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Max-Age=60/);
  });
  it('clears with Max-Age=0', () => assert.match(clearSessionCookie(), /Max-Age=0/));
  it('reads a cookie out of a header', () => {
    assert.equal(readCookie({ cookie: 'a=1; salita_session=tok%20en; b=2' }, 'salita_session'), 'tok en');
    assert.equal(readCookie({}, 'salita_session'), undefined);
  });
});

describe('tokens', () => {
  it('round-trips and rejects tampering', () => {
    process.env.AUTH_SECRET = 'test-secret-test-secret-test-secret';
    const token = createToken({ sub: 'u1', role: 'STUDENT', exp: Math.floor(Date.now() / 1000) + 600 });
    assert.equal(verifyToken(token)?.sub, 'u1');
    assert.equal(verifyToken(`${token}x`), null);
  });
});

describe('attachments', () => {
  const pdf = Buffer.from('%PDF-1.4 hello');
  it('accepts a real PDF', () => assert.deepEqual(checkAttachment('work.pdf', 'application/pdf', pdf), { contentType: 'application/pdf' }));
  it('rejects a script renamed to .pdf', () => assert.ok('error' in checkAttachment('x.pdf', 'application/pdf', Buffer.from('#!/bin/sh\nrm -rf /'))));
  it('rejects disallowed types and big files', () => {
    assert.ok('error' in checkAttachment('x.exe', 'application/octet-stream', pdf));
    assert.ok('error' in checkAttachment('x.pdf', 'application/pdf', Buffer.concat([pdf, Buffer.alloc(1024 * 1024)])));
  });
  it('cleans file names', () => assert.equal(safeFileName('../../etc/passwd'), 'passwd'));
});

describe('csv', () => {
  it('neutralises spreadsheet formulas', () => {
    assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
    assert.equal(csvCell('-5'), '-5');
  });
  it('quotes commas', () => assert.equal(csvRow(['a,b', 'c']), '"a,b",c'));
  it('parses quoted cells and CRLF', () => assert.deepEqual(parseCsv('a,"b,""c"""\r\nd,e\r\n'), [['a', 'b,"c"'], ['d', 'e']]));
});

describe('pagination', () => {
  it('clamps page and limit', () => {
    assert.deepEqual(parsePageRequest({ page: '3', limit: '20' }), { page: 3, limit: 20, skip: 40 });
    assert.equal(parsePageRequest({ limit: '99999' }).limit, 200);
    assert.deepEqual(parsePageRequest({ page: '-4', limit: 'x' }), { page: 1, limit: 50, skip: 0 });
  });
  it('escapes regex characters in searches', () => assert.equal(escapeRegExp('a.b(c)'), 'a\\.b\\(c\\)'));
});

describe('grades', () => {
  it('matches a student to their grade only', () => {
    assert.ok(matchesGrade('Grade 7', 'Grade 7'));
    assert.ok(matchesGrade('ALL', 'Grade 12'));
    assert.ok(!matchesGrade('Grade 1', 'Grade 10'));
  });
});

describe('student import', () => {
  it('generates a 6-digit default password', () => assert.match(generateDefaultPassword('ana.reyes'), /^Salita-anareyes-\d{6}$/));
  it('accepts at most 10 rows', () => {
    const row = { fullName: 'A', username: 'a', email: 'a@b.co', section: 'Grade 7' };
    assert.equal(parseImportStudentsRequest({ students: Array(11).fill(row) }), null);
    assert.equal(parseImportStudentsRequest({ students: [row] })?.length, 1);
  });
});

describe('notifications', () => {
  it('parses mark-read bodies', () => {
    assert.equal(parseMarkReadRequest({ all: true }), 'all');
    assert.deepEqual(parseMarkReadRequest({ ids: ['a'] }), ['a']);
    assert.equal(parseMarkReadRequest({ ids: [] }), null);
  });
});
