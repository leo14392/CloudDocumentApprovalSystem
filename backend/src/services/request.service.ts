
import { randomUUID } from "node:crypto";
import { pool } from "../config/database.js";
import type { PoolClient } from "pg";


// Create the initial approval assignment for a newly submitted request.
async function createInitialApprovalWorkflow(
  client: PoolClient,
  data: {
    requestId: string | number;
    studentUserId: string;
    documentTypeId: number;
    referenceNumber: string;
    documentName: string;
    studentName: string;
  }
) {
  const assignmentResult = await client.query(
    `
      SELECT
        aw.workflow_id,
        aws.workflow_step_id,
        sp.adviser_user_id,
        adviser.email AS adviser_email
      FROM public.student_profiles sp
      JOIN public.app_users adviser
        ON adviser.user_id = sp.adviser_user_id
       AND adviser.is_active = TRUE
      JOIN public.user_roles ur
        ON ur.user_id = adviser.user_id
      JOIN public.roles assigned_role
        ON assigned_role.role_id = ur.role_id
       AND assigned_role.role_code = 'ADVISER'
      JOIN public.approval_workflows aw
        ON aw.document_type_id = $2
       AND aw.college_name = sp.college
       AND aw.is_active = TRUE
      JOIN public.approval_workflow_steps aws
        ON aws.workflow_id = aw.workflow_id
       AND aws.step_order = 1
       AND aws.is_active = TRUE
      JOIN public.roles step_role
        ON step_role.role_id = aws.role_id
       AND step_role.role_code = 'ADVISER'
      WHERE sp.user_id = $1
      FOR SHARE OF sp, adviser
    `,
    [data.studentUserId, data.documentTypeId]
  );

  if (assignmentResult.rowCount !== 1) {
    throw new Error(
      "The initial Academic Adviser assignment could not be resolved. Verify the student's assigned adviser and the active college workflow."
    );
  }

  const assignment = assignmentResult.rows[0];

  const instanceResult = await client.query(
    `
      INSERT INTO public.document_approval_instances (
        request_id,
        workflow_id,
        current_step_id,
        cycle_number,
        status
      )
      VALUES ($1, $2, $3, 1, 'In Progress')
      RETURNING instance_id
    `,
    [
      data.requestId,
      assignment.workflow_id,
      assignment.workflow_step_id
    ]
  );

  const instanceId = instanceResult.rows[0].instance_id;

  const approvalResult = await client.query(
    `
      INSERT INTO public.document_approvals (
        instance_id,
        workflow_step_id,
        cycle_number,
        assigned_approver_user_id,
        status
      )
      VALUES ($1, $2, 1, $3, 'Pending')
      RETURNING approval_id
    `,
    [
      instanceId,
      assignment.workflow_step_id,
      assignment.adviser_user_id
    ]
  );

  const approvalId = approvalResult.rows[0].approval_id;

  await client.query(
    `
      INSERT INTO public.document_approval_history (
        instance_id,
        approval_id,
        actor_user_id,
        action,
        from_step_id,
        to_step_id,
        cycle_number,
        remarks
      )
      VALUES ($1, NULL, $2, 'Submitted', NULL, $3, 1, $4)
    `,
    [
      instanceId,
      data.studentUserId,
      assignment.workflow_step_id,
      `${data.documentName} (${data.referenceNumber}) was submitted.`
    ]
  );

  await client.query(
    `
      INSERT INTO public.document_approval_history (
        instance_id,
        approval_id,
        actor_user_id,
        action,
        from_step_id,
        to_step_id,
        cycle_number,
        remarks
      )
      VALUES ($1, $2, NULL, 'Assigned', NULL, $3, 1, $4)
    `,
    [
      instanceId,
      approvalId,
      assignment.workflow_step_id,
      `Assigned to the student's Academic Adviser (${assignment.adviser_email}).`
    ]
  );

  await client.query(
    `
      INSERT INTO public.notifications (
        user_id,
        request_id,
        notification_type,
        title,
        message
      )
      VALUES (
        $1,
        $2,
        'new_request',
        'New document awaiting your review',
        $3
      )
    `,
    [
      assignment.adviser_user_id,
      data.requestId,
      `${data.studentName} submitted ${data.documentName} (${data.referenceNumber}). It is awaiting your review.`
    ]
  );
}

// Notify the student that their submission was received.
async function createSubmissionNotifications(
  client: PoolClient,
  data: {
    requestId: string | number;
    studentUserId: string;
    referenceNumber: string;
    documentName: string;
  }
) {
  await client.query(
    `
      INSERT INTO public.notifications (
        user_id,
        request_id,
        notification_type,
        title,
        message
      )
      VALUES (
        $1,
        $2,
        'submission_confirmation',
        'Document submitted successfully',
        $3
      )
    `,
    [
      data.studentUserId,
      data.requestId,
      `${data.documentName} (${data.referenceNumber}) was submitted successfully and is awaiting review.`
    ]
  );
}

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

    await createInitialApprovalWorkflow(client, {
      requestId: request.request_id,
      studentUserId,
      documentTypeId: documentTypeResult.rows[0].document_type_id,
      referenceNumber: request.reference_number,
      documentName: "Academic Load Revision Permit",
      studentName
    });

    await createSubmissionNotifications(client, {
      requestId: request.request_id,
      studentUserId,
      referenceNumber: request.reference_number,
      documentName: "Academic Load Revision Permit"
    });

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

    await createInitialApprovalWorkflow(client, {
      requestId: request.request_id,
      studentUserId,
      documentTypeId: documentTypeResult.rows[0].document_type_id,
      referenceNumber: request.reference_number,
      documentName: "Shifter's Application Form",
      studentName
    });

    await createSubmissionNotifications(client, {
      requestId: request.request_id,
      studentUserId,
      referenceNumber: request.reference_number,
      documentName: "Shifter's Application Form"
    });

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

    await createInitialApprovalWorkflow(client, {
      requestId: request.request_id,
      studentUserId,
      documentTypeId: documentTypeResult.rows[0].document_type_id,
      referenceNumber: request.reference_number,
      documentName: "Leave of Absence Form",
      studentName
    });

    await createSubmissionNotifications(client, {
      requestId: request.request_id,
      studentUserId,
      referenceNumber: request.reference_number,
      documentName: "Leave of Absence Form"
    });

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

export async function approveRequest(
  referenceNumber: string,
  approverUserId: string
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the request, workflow instance, and current approval.
    const currentResult = await client.query(
      `
      SELECT
        dr.request_id,
        dr.reference_number,
        dr.status AS request_status,
        dr.student_user_id,
        dr.completed_at,

        dai.instance_id,
        dai.workflow_id,
        dai.current_step_id,
        dai.cycle_number,
        dai.status AS instance_status,

        da.approval_id,
        da.assigned_approver_user_id,
        da.status AS approval_status,

        aws.step_order,
        aws.step_name,

        sp.college,
        sp.department

      FROM public.document_requests dr

      JOIN public.document_approval_instances dai
        ON dai.request_id = dr.request_id

      JOIN public.document_approvals da
        ON da.instance_id = dai.instance_id
       AND da.workflow_step_id = dai.current_step_id
       AND da.cycle_number = dai.cycle_number

      JOIN public.approval_workflow_steps aws
        ON aws.workflow_step_id = dai.current_step_id

      JOIN public.student_profiles sp
        ON sp.user_id = dr.student_user_id

      WHERE dr.reference_number = $1

      FOR UPDATE OF dr, dai, da
      `,
      [referenceNumber]
    );

    if (currentResult.rowCount !== 1) {
      throw new Error("Request not found.");
    }

    const current = currentResult.rows[0];

    if (
      current.assigned_approver_user_id.toString() !==
      approverUserId
    ) {
      throw new Error(
        "You are not assigned to approve this request."
      );
    }

    if (
      current.approval_status !== "Pending" ||
      current.instance_status !== "In Progress" ||
      current.request_status !== "Pending"
    ) {
      throw new Error(
        "This request cannot be approved in its current state."
      );
    }

    // Verify that the assigned account is still active.
    const activeApproverResult = await client.query(
      `
      SELECT 1
      FROM public.app_users
      WHERE user_id = $1
        AND is_active = TRUE
      `,
      [approverUserId]
    );

    if (activeApproverResult.rowCount !== 1) {
      throw new Error(
        "You are not assigned to approve this request."
      );
    }

    // Find the next active workflow stage.
    const nextStepResult = await client.query(
      `
      SELECT
        aws.workflow_step_id,
        aws.step_order,
        aws.step_name,
        r.role_code
      FROM public.approval_workflow_steps aws
      JOIN public.roles r
        ON r.role_id = aws.role_id
      WHERE aws.workflow_id = $1
        AND aws.step_order > $2
        AND aws.is_active = TRUE
      ORDER BY aws.step_order ASC
      LIMIT 1
      `,
      [current.workflow_id, current.step_order]
    );

    // Mark the current approval as approved.
    await client.query(
      `
      UPDATE public.document_approvals
      SET
        status = 'Approved',
        acted_at = NOW()
      WHERE approval_id = $1
        AND status = 'Pending'
      `,
      [current.approval_id]
    );

    if (nextStepResult.rowCount === 0) {
      // No further stage: this is the final approval.
      await client.query(
        `
        UPDATE public.document_approval_instances
        SET
          current_step_id = NULL,
          status = 'Approved',
          completed_at = NOW()
        WHERE instance_id = $1
        `,
        [current.instance_id]
      );

      await client.query(
        `
        UPDATE public.document_requests
        SET
          status = 'Completed',
          completed_at = NOW()
        WHERE request_id = $1
        `,
        [current.request_id]
      );

      await client.query(
        `
        INSERT INTO public.document_approval_history (
          instance_id,
          approval_id,
          actor_user_id,
          action,
          from_step_id,
          to_step_id,
          cycle_number,
          remarks
        )
        VALUES ($1, $2, $3, 'Approved', $4, NULL, $5, $6)
        `,
        [
          current.instance_id,
          current.approval_id,
          approverUserId,
          current.current_step_id,
          current.cycle_number,
          `${current.step_name} approved the request.`
        ]
      );

      await client.query(
        `
        INSERT INTO public.document_approval_history (
          instance_id,
          approval_id,
          actor_user_id,
          action,
          from_step_id,
          to_step_id,
          cycle_number,
          remarks
        )
        VALUES ($1, NULL, $2, 'Completed', $3, NULL, $4, $5)
        `,
        [
          current.instance_id,
          approverUserId,
          current.current_step_id,
          current.cycle_number,
          "All approval stages have been completed."
        ]
      );

      await client.query(
        `
        INSERT INTO public.notifications (
          user_id,
          request_id,
          notification_type,
          title,
          message
        )
        VALUES (
          $1,
          $2,
          'request_completed',
          'Document request completed',
          $3
        )
        `,
        [
          current.student_user_id,
          current.request_id,
          `Your document request (${current.reference_number}) has been fully approved.`
        ]
      );

      await client.query("COMMIT");

      return {
        message: "Request approved. All workflow stages are complete.",
        request: {
          referenceNumber: current.reference_number,
          status: "Completed",
          currentStage: null
        }
      };
    }

    const nextStep = nextStepResult.rows[0];

    // Resolve the next approver using their role and personnel profile.
    let nextApproverResult;

    switch (nextStep.role_code) {
      case "ADVISER": {
        nextApproverResult = await client.query(
          `
          SELECT
            u.user_id,
            u.email
          FROM public.student_profiles sp
          JOIN public.app_users u
            ON u.user_id = sp.adviser_user_id
           AND u.is_active = TRUE
          JOIN public.user_roles ur
            ON ur.user_id = u.user_id
          JOIN public.roles r
            ON r.role_id = ur.role_id
           AND r.role_code = 'ADVISER'
          WHERE sp.user_id = $1
          `,
          [current.student_user_id]
        );
        break;
      }

      case "CHAIRPERSON": {
        nextApproverResult = await client.query(
          `
          SELECT
            u.user_id,
            u.email
          FROM public.personnel_profiles pp
          JOIN public.app_users u
            ON u.user_id = pp.user_id
           AND u.is_active = TRUE
          JOIN public.user_roles ur
            ON ur.user_id = u.user_id
          JOIN public.roles r
            ON r.role_id = ur.role_id
           AND r.role_code = 'CHAIRPERSON'
          WHERE pp.college = $1
            AND pp.department = $2
          `,
          [current.college, current.department]
        );
        break;
      }

      case "DEAN": {
        nextApproverResult = await client.query(
          `
          SELECT
            u.user_id,
            u.email
          FROM public.personnel_profiles pp
          JOIN public.app_users u
            ON u.user_id = pp.user_id
           AND u.is_active = TRUE
          JOIN public.user_roles ur
            ON ur.user_id = u.user_id
          JOIN public.roles r
            ON r.role_id = ur.role_id
           AND r.role_code = 'DEAN'
          WHERE pp.college = $1
          `,
          [current.college]
        );
        break;
      }

      case "REGISTRAR": {
        nextApproverResult = await client.query(
          `
          SELECT
            u.user_id,
            u.email
          FROM public.app_users u
          JOIN public.user_roles ur
            ON ur.user_id = u.user_id
          JOIN public.roles r
            ON r.role_id = ur.role_id
           AND r.role_code = 'REGISTRAR'
          WHERE u.is_active = TRUE
          `
        );
        break;
      }

      default:
        throw new Error(
          `Unsupported workflow role: ${nextStep.role_code}`
        );
    }

    if (nextApproverResult.rowCount !== 1) {
      throw new Error(
        `The next approver could not be resolved for workflow role ${nextStep.role_code}.`
      );
    }

    const nextApprover = nextApproverResult.rows[0];

    // Create the next pending approval.
    const nextApprovalResult = await client.query(
      `
      INSERT INTO public.document_approvals (
        instance_id,
        workflow_step_id,
        cycle_number,
        assigned_approver_user_id,
        status
      )
      VALUES ($1, $2, $3, $4, 'Pending')
      RETURNING approval_id
      `,
      [
        current.instance_id,
        nextStep.workflow_step_id,
        current.cycle_number,
        nextApprover.user_id
      ]
    );

    const nextApprovalId = nextApprovalResult.rows[0].approval_id;

    // Move the workflow to the next stage.
    await client.query(
      `
      UPDATE public.document_approval_instances
      SET current_step_id = $1
      WHERE instance_id = $2
      `,
      [
        nextStep.workflow_step_id,
        current.instance_id
      ]
    );

    // Record the current approval.
    await client.query(
      `
      INSERT INTO public.document_approval_history (
        instance_id,
        approval_id,
        actor_user_id,
        action,
        from_step_id,
        to_step_id,
        cycle_number,
        remarks
      )
      VALUES ($1, $2, $3, 'Approved', $4, $5, $6, $7)
      `,
      [
        current.instance_id,
        current.approval_id,
        approverUserId,
        current.current_step_id,
        nextStep.workflow_step_id,
        current.cycle_number,
        `${current.step_name} approved the request.`
      ]
    );

    // Record the next assignment.
    await client.query(
      `
      INSERT INTO public.document_approval_history (
        instance_id,
        approval_id,
        actor_user_id,
        action,
        from_step_id,
        to_step_id,
        cycle_number,
        remarks
      )
      VALUES ($1, $2, NULL, 'Assigned', $3, $4, $5, $6)
      `,
      [
        current.instance_id,
        nextApprovalId,
        current.current_step_id,
        nextStep.workflow_step_id,
        current.cycle_number,
        `Assigned to ${nextStep.step_name} (${nextApprover.email}).`
      ]
    );

    // Notify the newly assigned approver.
    await client.query(
      `
      INSERT INTO public.notifications (
        user_id,
        request_id,
        notification_type,
        title,
        message
      )
      VALUES (
        $1,
        $2,
        'new_request',
        'Document awaiting your review',
        $3
      )
      `,
      [
        nextApprover.user_id,
        current.request_id,
        `Request ${current.reference_number} has been approved by ${current.step_name} and is awaiting your review.`
      ]
    );

    await client.query("COMMIT");

    return {
      message: `Request approved and forwarded to ${nextStep.step_name}.`,
      request: {
        referenceNumber: current.reference_number,
        status: "Pending",
        currentStage: nextStep.step_name
      }
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
