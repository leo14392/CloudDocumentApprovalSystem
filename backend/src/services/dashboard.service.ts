
import { pool } from "../config/database.js";

// ============================================
// STUDENT DASHBOARD
// ============================================

export interface StudentDashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  returned: number;
  completed: number;
}

export interface StudentDashboardRequest {
  id: string;
  referenceNumber: string;
  type: string;
  status: string;
  submittedAt: string;
}

export interface StudentDashboardActiveRequest
  extends StudentDashboardRequest {
  stage: string;
}

export interface StudentDashboardData {
  stats: StudentDashboardStats;
  recentRequests: StudentDashboardRequest[];
  activeRequest: StudentDashboardActiveRequest | null;
}

interface StatsQueryRow {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  returned: number;
  completed: number;
}

interface RequestQueryRow {
  id: string;
  reference_number: string;
  document_name: string;
  status: string;
  submitted_at: Date | string;
}

function mapRequest(row: RequestQueryRow): StudentDashboardRequest {
  return {
    id: row.id,
    referenceNumber: row.reference_number,
    type: row.document_name,
    status: row.status,
    submittedAt: new Date(row.submitted_at).toISOString()
  };
}

export async function getStudentDashboard(
  userId: string
): Promise<StudentDashboardData> {
  const statsResult = await pool.query<StatsQueryRow>(
    `
      SELECT
        COUNT(*) FILTER (
          WHERE status <> 'Draft'
        )::int AS total,

        COUNT(*) FILTER (
          WHERE status = 'Pending'
        )::int AS pending,

        COUNT(*) FILTER (
          WHERE status = 'Approved'
        )::int AS approved,

        COUNT(*) FILTER (
          WHERE status = 'Rejected'
        )::int AS rejected,

        COUNT(*) FILTER (
          WHERE status = 'Returned for Revision'
        )::int AS returned,

        COUNT(*) FILTER (
          WHERE status = 'Completed'
        )::int AS completed

      FROM document_requests
      WHERE student_user_id = $1
        AND submitted_at IS NOT NULL
    `,
    [userId]
  );

  const recentResult = await pool.query<RequestQueryRow>(
    `
      SELECT
        dr.request_id AS id,
        dr.reference_number,
        dt.document_name,
        dr.status,
        dr.submitted_at

      FROM document_requests dr

      INNER JOIN document_types dt
        ON dt.document_type_id = dr.document_type_id

      WHERE dr.student_user_id = $1
        AND dr.submitted_at IS NOT NULL

      ORDER BY dr.submitted_at DESC, dr.request_id DESC
      LIMIT 4
    `,
    [userId]
  );

  const activeResult = await pool.query<RequestQueryRow>(
    `
      SELECT
        dr.request_id AS id,
        dr.reference_number,
        dt.document_name,
        dr.status,
        dr.submitted_at

      FROM document_requests dr

      INNER JOIN document_types dt
        ON dt.document_type_id = dr.document_type_id

      WHERE dr.student_user_id = $1
        AND dr.status IN ('Pending', 'Returned for Revision')
        AND dr.submitted_at IS NOT NULL

      ORDER BY dr.submitted_at DESC, dr.request_id DESC
      LIMIT 1
    `,
    [userId]
  );

  const statsRow = statsResult.rows[0];

  const stats: StudentDashboardStats = {
    total: statsRow?.total ?? 0,
    pending: statsRow?.pending ?? 0,
    approved: statsRow?.approved ?? 0,
    rejected: statsRow?.rejected ?? 0,
    returned: statsRow?.returned ?? 0,
    completed: statsRow?.completed ?? 0
  };

  const recentRequests = recentResult.rows.map(mapRequest);

  const activeRow = activeResult.rows[0];

  const activeRequest: StudentDashboardActiveRequest | null =
    activeRow
      ? {
          ...mapRequest(activeRow),
          stage:
            activeRow.status === "Pending"
              ? "Awaiting review"
              : "Revision requested"
        }
      : null;

  return {
    stats,
    recentRequests,
    activeRequest
  };
}

// ============================================
// APPROVER DASHBOARD
// ============================================

export interface ApproverDashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  returned: number;
  completed: number;
}

export interface ApproverDashboardRequest {
  id: string;
  referenceNumber: string;
  type: string;
  studentName: string;
  studentNumber: string | null;
  status: string;
  submittedAt: string;
}

export interface ApproverDashboardData {
  stats: ApproverDashboardStats;
  recentRequests: ApproverDashboardRequest[];
  pendingRequests: ApproverDashboardRequest[];
}

interface ApproverRequestQueryRow {
  id: string;
  reference_number: string;
  document_name: string;
  given_name: string;
  middle_name: string | null;
  family_name: string;
  student_number: string | null;
  status: string;
  submitted_at: Date | string;
}

function mapApproverRequest(
  row: ApproverRequestQueryRow
): ApproverDashboardRequest {
  const studentName = [
    row.given_name,
    row.middle_name,
    row.family_name
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: row.id,
    referenceNumber: row.reference_number,
    type: row.document_name,
    studentName,
    studentNumber: row.student_number,
    status: row.status,
    submittedAt: new Date(row.submitted_at).toISOString()
  };
}

export async function getApproverDashboard(): Promise<ApproverDashboardData> {
  const statsResult = await pool.query<StatsQueryRow>(
    `
      SELECT
        COUNT(*)::int AS total,

        COUNT(*) FILTER (
          WHERE status = 'Pending'
        )::int AS pending,

        COUNT(*) FILTER (
          WHERE status = 'Approved'
        )::int AS approved,

        COUNT(*) FILTER (
          WHERE status = 'Rejected'
        )::int AS rejected,

        COUNT(*) FILTER (
          WHERE status = 'Returned for Revision'
        )::int AS returned,

        COUNT(*) FILTER (
          WHERE status = 'Completed'
        )::int AS completed

      FROM document_requests
      WHERE submitted_at IS NOT NULL
        AND status <> 'Draft'
    `
  );

  const requestQuery = `
    SELECT
      dr.request_id AS id,
      dr.reference_number,
      dt.document_name,
      au.given_name,
      au.middle_name,
      au.family_name,
      sp.student_number,
      dr.status,
      dr.submitted_at

    FROM document_requests dr

    INNER JOIN document_types dt
      ON dt.document_type_id = dr.document_type_id

    INNER JOIN app_users au
      ON au.user_id = dr.student_user_id

    LEFT JOIN student_profiles sp
      ON sp.user_id = dr.student_user_id

    WHERE dr.submitted_at IS NOT NULL
      AND dr.status <> 'Draft'
  `;

  const recentResult = await pool.query<ApproverRequestQueryRow>(
    `
      ${requestQuery}
      ORDER BY dr.submitted_at DESC, dr.request_id DESC
      LIMIT 6
    `
  );

  const pendingResult = await pool.query<ApproverRequestQueryRow>(
    `
      ${requestQuery}
        AND dr.status = 'Pending'
      ORDER BY dr.submitted_at ASC, dr.request_id ASC
      LIMIT 6
    `
  );

  const statsRow = statsResult.rows[0];

  const stats: ApproverDashboardStats = {
    total: statsRow?.total ?? 0,
    pending: statsRow?.pending ?? 0,
    approved: statsRow?.approved ?? 0,
    rejected: statsRow?.rejected ?? 0,
    returned: statsRow?.returned ?? 0,
    completed: statsRow?.completed ?? 0
  };

  return {
    stats,
    recentRequests: recentResult.rows.map(mapApproverRequest),
    pendingRequests: pendingResult.rows.map(mapApproverRequest)
  };
}
