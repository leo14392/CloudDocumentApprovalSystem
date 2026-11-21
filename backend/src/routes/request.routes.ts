
import { Router } from "express";

import {
  requireAuth,
  requireRole
} from "../middleware/auth.middleware.js";

import {
  createLoadRevision,
  createShifterApplication,
  createLeaveOfAbsence,
  getRequestsController,
  getRequestDetailsController,
  approveRequestController
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

// Retrieve all accessible requests
router.get(
  "/",
  requireAuth,
  getRequestsController
);

// Retrieve one request using its reference number
router.get(
  "/:referenceNumber",
  requireAuth,
  getRequestDetailsController
);

// Approve the current workflow step
router.post(
  "/:referenceNumber/approve",
  requireAuth,
  requireRole("ADVISER", "CHAIRPERSON", "DEAN", "REGISTRAR"),
  approveRequestController
);

export default router;
