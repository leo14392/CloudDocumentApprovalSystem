
import { randomUUID } from "node:crypto";
import { pool } from "../config/database.js";

export interface SubjectSubmission {
  course: string;
  title: string;
  units: number;
  closed?: boolean;
}

export interface LoadRevisionSubmission {
  term: "1st Semester" | "2nd Semester" | "Summer Term";
  schoolYear: string;
  permitDate: string;
  withdraw: SubjectSubmission[];
  add: SubjectSubmission[];
  loadBeforeUnits: number;
  loadBeforeHours: number;
  loadAfterUnits: number;
  loadAfterHours: number;
  conflict: boolean;
  dissolved: boolean;
  otherReason: string;
}

export interface ShifterApplicationSubmission {
  intendedProgram: string;
  reason: string;
}

export interface LeaveOfAbsenceSubmission {
  currentAcademicYear: string;
  semester: string;
  reason: string;
}

export async function createLoadRevisionRequest(
  studentUserId: string,
  data: LoadRevisionSubmission
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Confirm that the account has an active student profile.
    const studentResult = await client.query(
      `
      SELECT
        u.user_id,
        u.given_name,
        u.middle_name,
        u.family_name,
        sp.student_number,
        sp.college,
        sp.department,
        sp.program,
        sp.year_level
      FROM public.app_users u
      JOIN public.student_profiles sp
        ON sp.user_id = u.user_id
      WHERE u.user_id = $1
        AND u.is_active = TRUE
      FOR SHARE OF u, sp
      `,
      [studentUserId]
    );

    if (studentResult.rowCount !== 1) {
      throw new Error(
        "An active student profile is required to submit this request."
      );
    }

    const student = studentResult.rows[0];

    // Find the correct active document type.
    const documentTypeResult = await client.query(
      `
      SELECT document_type_id
      FROM public.document_types
      WHERE document_code = $1
        AND is_active = TRUE
      `,
      ["LOAD_REVISION"]
    );

    if (documentTypeResult.rowCount !== 1) {
      throw new Error(
        "The Academic Load Revision Permit document type is unavailable."
      );
    }

    // Generate a unique reference number.
    const year = new Date().getUTCFullYear();
    const referenceNumber =
      `IIT-${year}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const studentName = [
      student.given_name,
      student.middle_name,
      student.family_name
    ]
      .filter(Boolean)
      .join(" ");

    // Create the main request.
    const requestResult = await client.query(
      `
      INSERT INTO public.document_requests (
        reference_number,
        document_type_id,
        student_user_id,
        status,
        submitted_at
      )
      VALUES ($1, $2, $3, 'Pending', NOW())
      RETURNING
        request_id,
        reference_number,
        status,
        submitted_at
      `,
      [
        referenceNumber,
        documentTypeResult.rows[0].document_type_id,
        studentUserId
      ]
    );

    const request = requestResult.rows[0];

    // Save the permit details.
    await client.query(
      `
      INSERT INTO public.load_revision_details (
        request_id,
        academic_term,
        school_year,
        family_name,
        given_name,
        middle_name,
        student_number,
        permit_date,
        college,
        department,
        course_year,
        load_before_units,
        load_before_hours,
        load_after_units,
        load_after_hours,
        conflict_of_schedule,
        subjects_dissolved,
        other_reason,
        student_signature_name
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
      `,
      [
        request.request_id,
        data.term,
        data.schoolYear,
        student.family_name,
        student.given_name,
        student.middle_name,
        student.student_number,
        data.permitDate,
        student.college ?? "",
        student.department ?? "",
        `${student.program ?? "Program not specified"} – Year ${student.year_level ?? "N/A"}`,
        data.loadBeforeUnits,
        data.loadBeforeHours,
        data.loadAfterUnits,
        data.loadAfterHours,
        data.conflict,
        data.dissolved,
        data.otherReason.trim() || null,
        studentName
      ]
    );

    // Save withdrawn subjects.
    for (const subject of data.withdraw) {
      await client.query(
        `
        INSERT INTO public.load_revision_subjects (
          request_id,
          revision_action,
          course_number_section,
          course_title,
          units,
          is_closed_subject
        )
        VALUES ($1, 'WITHDRAW', $2, $3, $4, FALSE)
        `,
        [
          request.request_id,
          subject.course.trim(),
          subject.title.trim(),
          subject.units
        ]
      );
    }

    // Save added subjects.
    for (const subject of data.add) {
      await client.query(
        `
        INSERT INTO public.load_revision_subjects (
          request_id,
          revision_action,
          course_number_section,
          course_title,
          units,
          is_closed_subject
        )
        VALUES ($1, 'ADD', $2, $3, $4, $5)
        `,
        [
          request.request_id,
          subject.course.trim(),
          subject.title.trim(),
          subject.units,
          subject.closed ?? false
        ]
      );
    }

    await client.query("COMMIT");

    return {
      id: request.request_id.toString(),
      referenceNumber: request.reference_number,
      status: request.status,
      submittedAt: request.submitted_at,
      student: studentName
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createShifterApplicationRequest(
  studentUserId: string,
  data: ShifterApplicationSubmission
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Retrieve the authenticated student's profile.
    const studentResult = await client.query(
      `
      SELECT
        u.user_id,
        u.given_name,
        u.middle_name,
        u.family_name,
        sp.program
      FROM public.app_users u
      JOIN public.student_profiles sp
        ON sp.user_id = u.user_id
      WHERE u.user_id = $1
        AND u.is_active = TRUE
      FOR SHARE OF u, sp
      `,
      [studentUserId]
    );

    if (studentResult.rowCount !== 1) {
      throw new Error(
        "An active student profile is required to submit this request."
      );
    }

    const student = studentResult.rows[0];

    // The student's current program must exist in their profile.
    if (!student.program?.trim()) {
      throw new Error(
        "Your current program is missing from your student profile."
      );
    }

    const intendedProgram = data.intendedProgram.trim();
    const reason = data.reason.trim();

    if (!intendedProgram || !reason) {
      throw new Error(
        "Intended program and reason for shifting are required."
      );
    }

    if (
      student.program.trim().toLowerCase() ===
      intendedProgram.toLowerCase()
    ) {
      throw new Error(
        "Your intended program must be different from your current program."
      );
    }

    // Find the active Shifter's Application document type.
    const documentTypeResult = await client.query(
      `
      SELECT document_type_id
      FROM public.document_types
      WHERE document_code = $1
        AND is_active = TRUE
      `,
      ["SHIFT_APPLICATION"]
    );

    if (documentTypeResult.rowCount !== 1) {
      throw new Error(
        "The Shifter's Application Form document type is unavailable."
      );
    }

    // Generate a unique reference number.
    const year = new Date().getUTCFullYear();
    const referenceNumber =
      `IIT-${year}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const studentName = [
      student.given_name,
      student.middle_name,
      student.family_name
    ]
      .filter(Boolean)
      .join(" ");

    // Create the main document request.
    const requestResult = await client.query(
      `
      INSERT INTO public.document_requests (
        reference_number,
        document_type_id,
        student_user_id,
        status,
        submitted_at
      )
      VALUES ($1, $2, $3, 'Pending', NOW())
      RETURNING
        request_id,
        reference_number,
        status,
        submitted_at
      `,
      [
        referenceNumber,
        documentTypeResult.rows[0].document_type_id,
        studentUserId
      ]
    );

    const request = requestResult.rows[0];

    // Save the Shifter's Application details.
    await client.query(
      `
      INSERT INTO public.shifter_application_details (
        request_id,
        current_program,
        intended_program,
        reason_for_shifting
      )
      VALUES ($1, $2, $3, $4)
      `,
      [
        request.request_id,
        student.program.trim(),
        intendedProgram,
        reason
      ]
    );

    await client.query("COMMIT");

    return {
      id: request.request_id.toString(),
      referenceNumber: request.reference_number,
      status: request.status,
      submittedAt: request.submitted_at,
      student: studentName
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createLeaveOfAbsenceRequest(
  studentUserId: string,
  data: LeaveOfAbsenceSubmission
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Retrieve the authenticated student's profile.
    const studentResult = await client.query(
      `
      SELECT
        u.user_id,
        u.given_name,
        u.middle_name,
        u.family_name
      FROM public.app_users u
      JOIN public.student_profiles sp
        ON sp.user_id = u.user_id
      WHERE u.user_id = $1
        AND u.is_active = TRUE
      FOR SHARE OF u, sp
      `,
      [studentUserId]
    );

    if (studentResult.rowCount !== 1) {
      throw new Error(
        "An active student profile is required to submit this request."
      );
    }

    const student = studentResult.rows[0];

    // Validate the submitted information.
    const currentAcademicYear = data.currentAcademicYear.trim();
    const semester = data.semester.trim();
    const reason = data.reason.trim();

    if (!currentAcademicYear || !semester || !reason) {
      throw new Error(
        "Academic year, semester, and reason for absence are required."
      );
    }

    if (currentAcademicYear.length > 60) {
      throw new Error("Academic year must not exceed 60 characters.");
    }

    if (semester.length > 60) {
      throw new Error("Semester must not exceed 60 characters.");
    }

    // Find the active Leave of Absence document type.
    const documentTypeResult = await client.query(
      `
      SELECT document_type_id
      FROM public.document_types
      WHERE document_code = $1
        AND is_active = TRUE
      `,
      ["LEAVE_ABSENCE"]
    );

    if (documentTypeResult.rowCount !== 1) {
      throw new Error(
        "The Leave of Absence Form document type is unavailable."
      );
    }

    // Generate a unique reference number.
    const year = new Date().getUTCFullYear();
    const referenceNumber =
      `IIT-${year}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const studentName = [
      student.given_name,
      student.middle_name,
      student.family_name
    ]
      .filter(Boolean)
      .join(" ");

    // Create the main document request.
    const requestResult = await client.query(
      `
      INSERT INTO public.document_requests (
        reference_number,
        document_type_id,
        student_user_id,
        status,
        submitted_at
      )
      VALUES ($1, $2, $3, 'Pending', NOW())
      RETURNING
        request_id,
        reference_number,
        status,
        submitted_at
      `,
      [
        referenceNumber,
        documentTypeResult.rows[0].document_type_id,
        studentUserId
      ]
    );

    const request = requestResult.rows[0];

    // Save the Leave of Absence details.
    await client.query(
      `
      INSERT INTO public.leave_of_absence_details (
        request_id,
        current_academic_year,
        semester,
        reason_of_absence
      )
      VALUES ($1, $2, $3, $4)
      `,
      [
        request.request_id,
        currentAcademicYear,
        semester,
        reason
      ]
    );

    await client.query("COMMIT");

    return {
      id: request.request_id.toString(),
      referenceNumber: request.reference_number,
      status: request.status,
      submittedAt: request.submitted_at,
      student: studentName
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getRequests(userId: string, isStudent: boolean) {
  const result = await pool.query(
    `
    SELECT
      dr.request_id,
      dr.reference_number,
      dr.status,
      dr.submitted_at,
      dt.document_name,
      u.given_name,
      u.middle_name,
      u.family_name,
      sp.student_number
    FROM public.document_requests dr
    JOIN public.document_types dt
      ON dt.document_type_id = dr.document_type_id
    JOIN public.app_users u
      ON u.user_id = dr.student_user_id
    LEFT JOIN public.student_profiles sp
      ON sp.user_id = u.user_id
    WHERE dr.submitted_at IS NOT NULL
      AND dr.status <> 'Draft'
      AND (
        $2::boolean = FALSE
        OR dr.student_user_id = $1
      )
    ORDER BY dr.submitted_at DESC
    `,
    [userId, isStudent]
  );

  return result.rows.map((row) => ({
    id: row.reference_number,
    type: row.document_name,
    student: [
      row.given_name,
      row.middle_name,
      row.family_name
    ].filter(Boolean).join(" "),
    date: row.submitted_at
      ? new Date(row.submitted_at).toLocaleDateString()
      : "",
    stage: "Awaiting review",
    status: row.status
  }));
}

export async function getRequestDetails(
  referenceNumber: string,
  userId: string,
  isStudent: boolean
) {
  // Retrieve the main request and verify ownership for students.
  const requestResult = await pool.query(
    `
    SELECT
      dr.request_id,
      dr.reference_number,
      dr.status,
      dr.submitted_at,
      dr.completed_at,
      dt.document_code,
      dt.document_name,
      dr.student_user_id,
      u.given_name,
      u.middle_name,
      u.family_name,
      u.email,
      sp.student_number,
      sp.college AS profile_college,
      sp.department AS profile_department,
      sp.program AS profile_program,
      sp.year_level
    FROM public.document_requests dr
    JOIN public.document_types dt
      ON dt.document_type_id = dr.document_type_id
    JOIN public.app_users u
      ON u.user_id = dr.student_user_id
    LEFT JOIN public.student_profiles sp
      ON sp.user_id = u.user_id
    WHERE dr.reference_number = $1
      AND (
        $3::boolean = FALSE
        OR dr.student_user_id = $2
      )
    `,
    [referenceNumber, userId, isStudent]
  );

  if (requestResult.rowCount !== 1) {
    return null;
  }

  const request = requestResult.rows[0];

  let details: Record<string, unknown> | null = null;

  // Retrieve the details belonging to the document type.
  switch (request.document_code) {
    case "LOAD_REVISION": {
      const detailsResult = await pool.query(
        `
        SELECT
          academic_term,
          school_year,
          family_name,
          given_name,
          middle_name,
          student_number,
          permit_date,
          college,
          department,
          course_year,
          load_before_units,
          load_before_hours,
          load_after_units,
          load_after_hours,
          conflict_of_schedule,
          subjects_dissolved,
          other_reason,
          student_signature_name
        FROM public.load_revision_details
        WHERE request_id = $1
        `,
        [request.request_id]
      );

      const subjectsResult = await pool.query(
        `
        SELECT
          subject_id,
          revision_action,
          course_number_section,
          course_title,
          units,
          is_closed_subject
        FROM public.load_revision_subjects
        WHERE request_id = $1
        ORDER BY subject_id ASC
        `,
        [request.request_id]
      );

      details = {
        ...(detailsResult.rows[0] ?? {}),
        subjects: subjectsResult.rows
      };

      break;
    }

    case "SHIFT_APPLICATION": {
      const detailsResult = await pool.query(
        `
        SELECT
          current_program,
          intended_program,
          reason_for_shifting
        FROM public.shifter_application_details
        WHERE request_id = $1
        `,
        [request.request_id]
      );

      details = detailsResult.rows[0] ?? null;
      break;
    }

    case "LEAVE_ABSENCE": {
      const detailsResult = await pool.query(
        `
        SELECT
          current_academic_year,
          semester,
          reason_of_absence
        FROM public.leave_of_absence_details
        WHERE request_id = $1
        `,
        [request.request_id]
      );

      details = detailsResult.rows[0] ?? null;
      break;
    }

    default:
      throw new Error(
        `Unsupported document type: ${request.document_code}`
      );
  }

  return {
    id: request.request_id.toString(),
    referenceNumber: request.reference_number,
    documentCode: request.document_code,
    documentName: request.document_name,
    status: request.status,
    submittedAt: request.submitted_at,
    completedAt: request.completed_at,

    student: {
      userId: request.student_user_id,
      givenName: request.given_name,
      middleName: request.middle_name,
      familyName: request.family_name,
      fullName: [
        request.given_name,
        request.middle_name,
        request.family_name
      ].filter(Boolean).join(" "),
      email: request.email,
      studentNumber: request.student_number,
      college: request.profile_college,
      department: request.profile_department,
      program: request.profile_program,
      yearLevel: request.year_level
    },

    details
  };
}
