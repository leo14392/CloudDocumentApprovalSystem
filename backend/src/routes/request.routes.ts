import { Router } from "express";

import {
  requireAuth,
  requireRole
} from "../middleware/auth.middleware.js";

import {
  createLoadRevision,
  createShifterApplication,
  createLeaveOfAbsence
} from "../controllers/request.controller.js";

const router = Router();

// Academic Load Revision Permit
router.post(
  "/load-revision",
  requireAuth,
  requireRole("STUDENT"),
  createLoadRevision
);

// Shifter's Application Form
router.post(
  "/shifter-application",
  requireAuth,
  requireRole("STUDENT"),
  createShifterApplication
);

// Leave of Absence Form
router.post(
  "/leave-of-absence",
  requireAuth,
  requireRole("STUDENT"),
  createLeaveOfAbsence
);

export default router;