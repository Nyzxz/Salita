import { Router } from 'express';
import type { ApiResponse, StudentAccount, SubmissionRecord } from '../../../shared/src/types.js';
import { addStudent, editStudent, getAllStudents, parseCreateStudentRequest, parseUpdateStudentRequest } from '../admin/students.service.js';
import { ApiError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  getAllSubmissions,
  gradeSubmission,
  parseGradeSubmissionRequest,
} from '../submissions/submissions.service.js';

export const adminRouter = Router();

// Every route below requires a signed-in teacher.
adminRouter.use(requireAuth('TEACHER'));

/** GET /api/admin/students */
adminRouter.get('/students', (_req, res) => {
  const body: ApiResponse<StudentAccount[]> = { success: true, data: getAllStudents() };
  res.json(body);
});

/** GET /api/admin/submissions */
adminRouter.get('/submissions', (_req, res) => {
  const body: ApiResponse<SubmissionRecord[]> = { success: true, data: getAllSubmissions() };
  res.json(body);
});

/** PUT /api/admin/submissions/:id */
adminRouter.put('/submissions/:id', (req, res, next) => {
  try {
    const request = parseGradeSubmissionRequest(req.body);
    if (!request) {
      throw new ApiError(400, 'Enter a valid grade and optional feedback before saving.');
    }

    const result = gradeSubmission(req.params.id, request);
    if (!result.ok) throw new ApiError(result.status, result.error);

    const body: ApiResponse<SubmissionRecord> = { success: true, data: result.data };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/** POST /api/admin/students */
adminRouter.post('/students', (req, res, next) => {
  try {
    const request = parseCreateStudentRequest(req.body);
    if (!request) {
      throw new ApiError(400, 'Fill in full name, username, email, password, and section.');
    }
    const result = addStudent(request);
    if (!result.ok) throw new ApiError(result.status, result.error);

    const body: ApiResponse<StudentAccount> = { success: true, data: result.data };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
});

/** PUT /api/admin/students/:id — partial update: edit details, reset password, or (de)activate. */
adminRouter.put('/students/:id', (req, res, next) => {
  try {
    const patch = parseUpdateStudentRequest(req.body);
    if (!patch) {
      throw new ApiError(400, 'Send at least one field to update.');
    }
    const result = editStudent(req.params.id, patch);
    if (!result.ok) throw new ApiError(result.status, result.error);

    const body: ApiResponse<StudentAccount> = { success: true, data: result.data };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
