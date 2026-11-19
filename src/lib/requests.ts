
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");

// ============================================
// REQUEST DETAIL TYPES
// ============================================

export interface RequestSubject {
  subject_id: number;
  revision_action: "ADD" | "WITHDRAW";
  course_number_section: string;
  course_title: string;
  units: number;
  is_closed_subject: boolean;
}

export interface RequestStudent {
  userId: string;
  givenName: string;
  middleName: string | null;
  familyName: string;
  fullName: string;
  email: string;
  studentNumber: string | null;
  college: string | null;
  department: string | null;
  program: string | null;
  yearLevel: number | null;
}

export interface LoadRevisionDetails {
  academic_term: string;
  school_year: string;
  family_name: string;
  given_name: string;
  middle_name: string | null;
  student_number: string;
  permit_date: string;
  college: string;
  department: string;
  course_year: string;
  load_before_units: number;
  load_before_hours: number;
  load_after_units: number;
  load_after_hours: number;
  conflict_of_schedule: boolean;
  subjects_dissolved: boolean;
  other_reason: string | null;
  student_signature_name: string;
  subjects: RequestSubject[];
}

export interface ShifterApplicationDetails {
  current_program: string;
  intended_program: string;
  reason_for_shifting: string;
}

export interface LeaveOfAbsenceDetails {
  current_academic_year: string;
  semester: string;
  reason_of_absence: string;
}

export type RequestDetails =
  | LoadRevisionDetails
  | ShifterApplicationDetails
  | LeaveOfAbsenceDetails
  | null;

export interface RequestDetail {
  id: string;
  referenceNumber: string;
  documentCode: string;
  documentName: string;
  status: string;
  submittedAt: string | null;
  completedAt: string | null;
  student: RequestStudent;
  details: RequestDetails;
}

interface RequestDetailApiResponse {
  success: boolean;
  message?: string;
  request: RequestDetail;
}

// ============================================
// REQUEST LIST TYPES
// ============================================

export interface RequestListItem {
  id: string;
  type: string;
  student: string;
  date: string;
  stage: string;
  status: string;
}

interface RequestListApiResponse {
  success: boolean;
  message?: string;
  requests: RequestListItem[];
}

// ============================================
// REQUEST API ERROR
// ============================================

export class RequestApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "RequestApiError";
  }
}

// ============================================
// REQUEST DETAIL API
// ============================================

export async function getRequestDetailsApi(
  referenceNumber: string
): Promise<RequestDetail> {
  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/requests/${encodeURIComponent(referenceNumber)}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json"
        }
      }
    );
  } catch {
    throw new Error(
      "Cannot connect to the server. Check that the backend is running."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new RequestApiError(
      data.message || "Unable to load request details.",
      response.status
    );
  }

  return (data as RequestDetailApiResponse).request;
}

// ============================================
// REQUEST LIST API
// ============================================

export async function getRequestsApi(): Promise<RequestListItem[]> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/requests`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json"
      }
    });
  } catch {
    throw new Error(
      "Cannot connect to the server. Check that the backend is running."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new RequestApiError(
      data.message || "Unable to retrieve requests.",
      response.status
    );
  }

  return (data as RequestListApiResponse).requests;
}