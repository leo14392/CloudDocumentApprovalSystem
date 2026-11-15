
import type { Request, Response } from "express";
import { z } from "zod";

import {
  createLoadRevisionRequest,
  createShifterApplicationRequest,
  createLeaveOfAbsenceRequest
} from "../services/request.service.js";

const subjectSchema = z.object({
  course: z.string().trim().min(1, "Course number and section are required.").max(50),
  title: z.string().trim().min(1, "Course title is required.").max(150),
  units: z.number().finite().positive().max(99.99),
  closed: z.boolean().optional()
});

const loadRevisionSchema = z.object({
  term: z.enum([
    "1st Semester",
    "2nd Semester",
    "Summer Term"
  ]),
  schoolYear: z.string().trim().min(1).max(15),
  permitDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "A valid permit date is required."
  ).refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value;
  }, "The permit date is invalid."),
  withdraw: z.array(subjectSchema).max(50),
  add: z.array(subjectSchema).max(50),
  loadBeforeUnits: z.number().finite().min(0).max(9999.99),
  loadBeforeHours: z.number().finite().min(0).max(9999.99),
  loadAfterUnits: z.number().finite().min(0).max(9999.99),
  loadAfterHours: z.number().finite().min(0).max(9999.99),
  conflict: z.boolean(),
  dissolved: z.boolean(),
  otherReason: z.string().trim().max(5000)
}).refine(
  (data) =>
    data.conflict ||
    data.dissolved ||
    data.otherReason.length > 0,
  {
    message: "Select at least one reason for the load revision.",
    path: ["otherReason"]
  }
).refine(
  (data) =>
    data.withdraw.every((subject) => !subject.closed),
  {
    message: "Withdrawn subjects cannot be marked as closed subjects.",
    path: ["withdraw"]
  }
);

// Shifter's Application validation.
const shifterApplicationSchema = z.object({
  intendedProgram: z.string()
    .trim()
    .min(1, "Intended program is required.")
    .max(120),
  reason: z.string()
    .trim()
    .min(1, "Reason for shifting is required.")
    .max(5000)
});

// Leave of Absence validation.
const leaveOfAbsenceSchema = z.object({
  currentAcademicYear: z.string()
    .trim()
    .min(1, "Current academic year is required.")
    .max(60),

  semester: z.string()
    .trim()
    .min(1, "Semester is required.")
    .max(60),

  reason: z.string()
    .trim()
    .min(1, "Reason for absence is required.")
    .max(5000)
});

export async function createLoadRevision(
  req: Request,
  res: Response
) {
  const authenticatedUser = req.session.user;

  if (!authenticatedUser) {
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }

  if (!authenticatedUser.roles.includes("STUDENT")) {
    return res.status(403).json({
      success: false,
      message: "Only students can submit document requests."
    });
  }

  const validation = loadRevisionSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Please check the submitted permit information.",
      errors: validation.error.flatten()
    });
  }

  try {
    const request = await createLoadRevisionRequest(
      authenticatedUser.id,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Academic Load Revision Permit submitted successfully.",
      request
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        "An active student profile is required to submit this request."
      ) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (
        error.message ===
        "The Academic Load Revision Permit document type is unavailable."
      ) {
        console.error("Load Revision document type is unavailable.");

        return res.status(503).json({
          success: false,
          message: "This document type is temporarily unavailable."
        });
      }
    }

    console.error("Load Revision submission failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit the permit. Please try again."
    });
  }
}

// Submit Shifter's Application.
export async function createShifterApplication(
  req: Request,
  res: Response
) {
  const authenticatedUser = req.session.user;

  if (!authenticatedUser) {
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }

  if (!authenticatedUser.roles.includes("STUDENT")) {
    return res.status(403).json({
      success: false,
      message: "Only students can submit document requests."
    });
  }

  const validation = shifterApplicationSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Please check the submitted Shifter's Application information.",
      errors: validation.error.flatten()
    });
  }

  try {
    const request = await createShifterApplicationRequest(
      authenticatedUser.id,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Shifter's Application Form submitted successfully.",
      request
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        "An active student profile is required to submit this request."
      ) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (
        error.message ===
        "Your current program is missing from your student profile."
      ) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (
        error.message ===
        "Your intended program must be different from your current program."
      ) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (
        error.message ===
        "The Shifter's Application Form document type is unavailable."
      ) {
        console.error("Shifter Application document type is unavailable.");

        return res.status(503).json({
          success: false,
          message: "This document type is temporarily unavailable."
        });
      }
    }

    console.error("Shifter Application submission failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit the Shifter's Application. Please try again."
    });
  }
}

// Submit Leave of Absence Form.
export async function createLeaveOfAbsence(
  req: Request,
  res: Response
) {
  const authenticatedUser = req.session.user;

  if (!authenticatedUser) {
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }

  if (!authenticatedUser.roles.includes("STUDENT")) {
    return res.status(403).json({
      success: false,
      message: "Only students can submit document requests."
    });
  }

  const validation = leaveOfAbsenceSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Please check the submitted Leave of Absence information.",
      errors: validation.error.flatten()
    });
  }

  try {
    const request = await createLeaveOfAbsenceRequest(
      authenticatedUser.id,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Leave of Absence Form submitted successfully.",
      request
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        "An active student profile is required to submit this request."
      ) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (
        error.message ===
        "The Leave of Absence Form document type is unavailable."
      ) {
        console.error("Leave of Absence document type is unavailable.");

        return res.status(503).json({
          success: false,
          message: "This document type is temporarily unavailable."
        });
      }
    }

    console.error("Leave of Absence submission failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit the Leave of Absence Form. Please try again."
    });
  }
}