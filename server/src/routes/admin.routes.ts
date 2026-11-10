import { Router } from 'express';
import type { ApiResponse, ImportStudentResult, StudentAccount, SubmissionRecord } from '../../../shared/src/types.js';
import {
  addStudent,
  buildGradebookCsv,
  editStudent,
  getAllStudents,
  importStudents,
  parseCreateStudentRequest,
  parseImportStudentsRequest,
  parseUpdateStudentRequest,
  removeStudent,
} from '../admin/students.service.js';
import { createSection, deleteSection, listSections, parseCreateSectionRequest } from '../admin/sections.service.js';
import { isGradeLevel } from '../grades.js';
import { parsePageRequest, queryString } from '../pagination.js';
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

/**
 * Class sections within a grade, served on the students URL (same shape as the Vercel function):
 * GET /api/admin/students?resource=sections, POST (same URL) { grade, name }, DELETE ...&id=
 */
adminRouter.all('/students', async (req, res, next) => {
  if (req.query.resource !== 'sections') {
    next();
    return;
  }
  try {
    if (req.method === 'GET') {
      res.json({ success: true, data: await listSections() });
      return;
    }
    if (req.method === 'POST') {
      const request = parseCreateSectionRequest(req.body);
      if (!request) throw new ApiError(400, 'Choose a grade and give the section a name (up to 40 characters).');
      const result = await createSection(request);
      if (!result.ok) throw new ApiError(result.status, result.error);
      res.status(201).json({ success: true, data: result.data });
      return;
    }
    if (req.method === 'DELETE') {
      const result = await deleteSection(queryString(req.query, 'id', 40) ?? '');
      if (!result.ok) throw new ApiError(result.status, result.error);
      res.json({ success: true, data: result.data });
      return;
    }
    throw new ApiError(405, `Method ${req.method} not allowed.`);
  } catch (err) {
    next(err);
  }
});

/** GET /api/admin/students?page=&limit=&q=&section=&status=  — or ?export=gradebook for a CSV */
adminRouter.get('/students', async (req, res, next) => {
  try {
    if (req.query.export === 'gradebook') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="salita-gradebook.csv"');
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(await buildGradebookCsv());
      return;
    }
    const paging = parsePageRequest(req.query);
    const section = queryString(req.query, 'section', 20);
    const classSection = queryString(req.query, 'classSection', 40);
    const status = queryString(req.query, 'status', 10);
    const { items, total } = await getAllStudents({
      skip: paging.skip,
      limit: paging.limit,
      q: queryString(req.query, 'q', 80),
      ...(section && isGradeLevel(section) ? { section } : {}),
      ...(classSection ? { classSection } : {}),
      ...(status === 'ACTIVE' || status === 'INACTIVE' ? { status } : {}),
    });
    const body: ApiResponse<StudentAccount[]> = {
      success: true,
      data: items,
      meta: { total, page: paging.page, limit: paging.limit },
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/** POST /api/admin/students?action=import  { students: [...] } — up to 10 rows per request. */
adminRouter.post('/students', async (req, res, next) => {
  if (req.query.action !== 'import') {
    next();
    return;
  }
  try {
    const rows = parseImportStudentsRequest(req.body);
    if (!rows) throw new ApiError(400, 'Send between 1 and 10 students per import request.');
    const body: ApiResponse<ImportStudentResult[]> = { success: true, data: await importStudents(rows) };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/** GET /api/admin/submissions?page=&limit=&status=&taskType=&taskId= */
adminRouter.get('/submissions', async (req, res, next) => {
  try {
    const paging = parsePageRequest(req.query);
    const status = queryString(req.query, 'status');
    const taskType = queryString(req.query, 'taskType');
    const { items, total } = await getAllSubmissions({
      skip: paging.skip,
      limit: paging.limit,
      ...(status === 'PENDING' || status === 'GRADED' ? { status } : {}),
      ...(taskType === 'ACTIVITY' || taskType === 'PERFORMANCE_TASK' ? { taskType } : {}),
      taskId: queryString(req.query, 'taskId', 60),
    });
    const body: ApiResponse<SubmissionRecord[]> = {
      success: true,
      data: items,
      meta: { total, page: paging.page, limit: paging.limit },
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/** PUT /api/admin/submissions/:id */
adminRouter.put('/submissions/:id', async (req, res, next) => {
  try {
    const request = parseGradeSubmissionRequest(req.body);
    if (!request) {
      throw new ApiError(400, 'Enter a valid grade and optional feedback before saving.');
    }

    const result = await gradeSubmission(req.params.id, request);
    if (!result.ok) throw new ApiError(result.status, result.error);

    const body: ApiResponse<SubmissionRecord> = { success: true, data: result.data };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

/** POST /api/admin/students */
adminRouter.post('/students', async (req, res, next) => {
  try {
    const request = parseCreateStudentRequest(req.body);
    if (!request) {
      throw new ApiError(400, 'Fill in full name, username, email, and password, and choose a grade from Grade 7 to Grade 12.');
    }
    const result = await addStudent(request);
    if (!result.ok) throw new ApiError(result.status, result.error);

    const body: ApiResponse<StudentAccount> = { success: true, data: result.data };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
});

/** PUT /api/admin/students/:id — partial update: edit details, reset password, or (de)activate. */
adminRouter.put('/students/:id', async (req, res, next) => {
  try {
    const patch = parseUpdateStudentRequest(req.body);
    if (!patch) {
      throw new ApiError(400, 'Send at least one field to update.');
    }
    const result = await editStudent(req.params.id, patch);
    if (!result.ok) throw new ApiError(result.status, result.error);

    const body: ApiResponse<StudentAccount> = { success: true, data: result.data };
    res.json(body);
  } catch (err) {
    next(err);
  }
});


/** DELETE /api/admin/students/:id — permanently remove a student and their records. */
adminRouter.delete('/students/:id', async (req, res, next) => {
  try {
    const result = await removeStudent(req.params.id);
    if (!result.ok) throw new ApiError(result.status, result.error);
    const body: ApiResponse<{ id: string }> = { success: true, data: result.data };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
