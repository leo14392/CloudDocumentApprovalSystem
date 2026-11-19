import { useEffect, useState } from "react";

import {
  getCurrentUser,
  loginApi,
  logoutApi,
  submitLoadRevisionApi,
  submitShifterApplicationApi,
  submitLeaveOfAbsenceApi,
  type AuthenticatedUser,
} from "./lib/auth";
import { getApproverDashboardApi } from "./lib/dashboard";
import { getRequestsApi } from "./lib/requests";

import type { Page, Role, RequestItem, Status } from "./types";
import type { RequestSubmission } from "./pages/requests/RequestForm";

import { Shell } from "./components/layout/AppShell";
import { Info } from "./components/ui";
import { LoginPage } from "./pages/auth/LoginPage";

import {
  StudentDashboard,
  ApproverDashboard,
} from "./pages/dashboard/DashboardPages";

import {
  Detail,
  NewRequest,
  RequestForm,
  RequestsPage,
  SubmissionSuccess,
} from "./pages/requests/RequestPages";

import { ReviewPage } from "./pages/review/ReviewPage";

import { NotificationsPage, SignaturePage } from "./pages/account/AccountPages";

import { defaultPermit } from "./data/initialData";

export default function App() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [page, setPage] = useState<Page>("login");
  const [selectedType, setSelectedType] = useState("Load Revision Form");

  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(
    null,
  );

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [queue, setQueue] = useState<RequestItem[]>([]);
  const [submitted, setSubmitted] = useState<RequestItem | null>(null);

  // Restore an existing authenticated session when the app starts.
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const currentUser = await getCurrentUser();

        if (!active) return;

        if (currentUser) {
          setUser(currentUser);
          setPage("dashboard");
        }
      } catch (error) {
        console.error("Session restoration failed:", error);
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  // Load the authenticated user's live request list.
  useEffect(() => {
    if (!user) {
      setRequests([]);
      return;
    }

    let active = true;

    async function refreshRequests() {
      try {
        const result = await getRequestsApi();

        if (!active) return;

        const liveRequests: RequestItem[] = result.map((request) => ({
          id: request.id,
          type: request.type,
          student: request.student,
          date: request.date,
          stage: request.stage,
          status: request.status as Status,
        }));

        setRequests(liveRequests);
      } catch (error) {
        console.error("Request list loading failed:", error);
      }
    }

    refreshRequests();

    const interval = window.setInterval(refreshRequests, 10000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user]);

  // Load live pending approvals for approvers.
  useEffect(() => {
    if (!user || user.roles.includes("STUDENT")) {
      setQueue([]);
      return;
    }

    let active = true;

    async function refreshQueue() {
      try {
        const result = await getApproverDashboardApi();

        if (!active) return;

        const liveQueue: RequestItem[] = result.pendingRequests.map(
          (request) => ({
            id: request.referenceNumber,
            type: request.type,
            student: request.studentName,
            date: new Date(request.submittedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            stage: request.status,
            status: request.status as Status,
          }),
        );

        setQueue(liveQueue);
      } catch (error) {
        console.error("Pending approvals loading failed:", error);
      }
    }

    refreshQueue();

    const interval = window.setInterval(refreshQueue, 10000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user]);

  // The UI role is only for choosing the appropriate interface.
  // Backend middleware remains responsible for actual authorization.
  const role: Role | null = user
    ? user.roles.includes("STUDENT")
      ? "student"
      : "approver"
    : null;

  async function login(email: string, password: string) {
    const authenticatedUser = await loginApi(email, password);

    setUser(authenticatedUser);
    setSubmitted(null);
    setSelectedRequest(null);
    setPage("dashboard");
  }

  async function logout() {
    try {
      await logoutApi();

      setUser(null);
      setSubmitted(null);
      setSelectedRequest(null);
      setRequests([]);
      setQueue([]);
      setPage("login");
    } catch (error) {
      console.error("Logout failed:", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to log out. Please try again.",
      );
    }
  }

  function open(request: RequestItem) {
    setSelectedRequest(request);
    setPage("detail");
  }

  async function submitRequest(submission: RequestSubmission) {
    if (!user) return;

    try {
      let nextRequest: RequestItem;

      if (submission.kind === "loadRevision") {
        const permit = submission.permit;
        const result = await submitLoadRevisionApi(permit);

        nextRequest = {
          id: result.referenceNumber,
          type: "Academic Load Revision Permit",
          student: result.student,
          date: new Date(result.submittedAt).toLocaleDateString(),
          stage: "Awaiting review",
          status: "Pending",
          permit,
        };
      } else if (submission.kind === "shifter") {
        const result = await submitShifterApplicationApi(submission.data);

        nextRequest = {
          id: result.referenceNumber,
          type: "Shifter's Application Form",
          student: result.student,
          date: new Date(result.submittedAt).toLocaleDateString(),
          stage: "Awaiting review",
          status: "Pending",
          reason: submission.data.reason,
        };
      } else {
        const result = await submitLeaveOfAbsenceApi(submission.data);

        nextRequest = {
          id: result.referenceNumber,
          type: "Leave of Absence Form",
          student: result.student,
          date: new Date(result.submittedAt).toLocaleDateString(),
          stage: "Awaiting review",
          status: "Pending",
          reason: submission.data.reason,
        };
      }

      // Refresh the authoritative request list from PostgreSQL.
      try {
        const result = await getRequestsApi();

        setRequests(
          result.map((request) => ({
            id: request.id,
            type: request.type,
            student: request.student,
            date: request.date,
            stage: request.stage,
            status: request.status as Status,
          })),
        );
      } catch (refreshError) {
        console.error(
          "Request was submitted, but the list refresh failed:",
          refreshError,
        );

        // Keep the successful submission visible until the next refresh.
        setRequests((previous) => [
          nextRequest,
          ...previous.filter((request) => request.id !== nextRequest.id),
        ]);
      }

      setSubmitted(nextRequest);
    } catch (error) {
      console.error("Request submission failed:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to submit your request. Please try again.",
      );
    }
  }

  // Prototype-only review behavior.
  // This does not persist approval decisions to PostgreSQL.
  function finishReview(
    status: Status,
    reason?: string,
    signatureSlot?: string,
  ) {
    if (!selectedRequest) return;

    const nextStatus: Status = signatureSlot ? "Pending" : status;

    const permit = signatureSlot
      ? {
          ...(selectedRequest.permit || defaultPermit),
          signatures: {
            ...(selectedRequest.permit || defaultPermit).signatures,
            [signatureSlot]: user
              ? `${user.givenName} ${user.familyName}`
              : "Authorized Approver",
          },
        }
      : selectedRequest.permit;

    const updated: RequestItem = {
      ...selectedRequest,
      status: nextStatus,
      reason,
      permit,
      stage: signatureSlot ? `${signatureSlot} signed` : selectedRequest.stage,
    };

    setSelectedRequest(updated);

    setRequests((previous) =>
      previous.map((request) =>
        request.id === selectedRequest.id ? updated : request,
      ),
    );

    setQueue((previous) =>
      previous.map((request) =>
        request.id === selectedRequest.id ? updated : request,
      ),
    );

    setPage("detail");
  }

  if (authLoading) {
    return (
      <div className="login-page">
        <div className="login-box">
          <p>Checking your session...</p>
        </div>
      </div>
    );
  }

  if (!user || !role) {
    return <LoginPage onLogin={login} />;
  }

  if (submitted) {
    return (
      <Shell
        user={user}
        role={role}
        page="requests"
        navigate={(nextPage) => {
          setSubmitted(null);
          setPage(nextPage);
        }}
        onLogout={logout}
        title="Request submitted"
        subtitle="Your document has entered the approval workflow."
      >
        <SubmissionSuccess
          request={submitted}
          done={() => {
            setSelectedRequest(submitted);
            setSubmitted(null);
            setPage("detail");
          }}
        />
      </Shell>
    );
  }

  let title = "Dashboard";

  let subtitle =
    role === "student"
      ? "An overview of your university document requests."
      : "Review and manage documents assigned to you.";

  if (page === "new") {
    title = "New document request";
    subtitle = "Choose a form to begin your submission.";
  }

  if (page === "form") {
    title = "Complete request";
    subtitle = "Provide the required document information.";
  }

  if (page === "requests") {
    title = role === "student" ? "My requests" : "Pending approvals";

    subtitle =
      role === "student"
        ? "Search, filter, and track all your document requests."
        : "Documents currently awaiting your review.";
  }

  if (page === "detail") {
    title = "Request details";
    subtitle = "Review submitted information and approval progress.";
  }

  if (page === "review") {
    title = "Document review";
    subtitle = "Verify information and record your decision.";
  }

  if (page === "signature") {
    title = "My e-signature";
    subtitle = "Create and manage your signature for document approvals.";
  }

  if (page === "notifications") {
    title = "Notifications";
    subtitle = "Stay informed about document activity and updates.";
  }

  if (page === "settings") {
    title = "Profile & settings";
    subtitle = "Manage your account preferences.";
  }

  const displayName = [user.givenName, user.middleName, user.familyName]
    .filter(Boolean)
    .join(" ");

  return (
    <Shell
      user={user}
      role={role}
      page={page}
      navigate={setPage}
      onLogout={logout}
      title={title}
      subtitle={subtitle}
    >
      {page === "dashboard" &&
        (role === "student" ? (
          <StudentDashboard
            navigate={setPage}
            open={open}
            studentName={displayName}
          />
        ) : (
          <ApproverDashboard navigate={setPage} open={open} queue={queue} />
        ))}

      {page === "new" && (
        <NewRequest
          select={(type) => {
            setSelectedType(type);
            setPage("form");
          }}
        />
      )}

      {page === "form" && (
        <RequestForm
          type={selectedType}
          cancel={() => setPage("new")}
          submit={submitRequest}
        />
      )}

      {page === "requests" && (
        <RequestsPage
          data={role === "student" ? requests : queue}
          role={role}
          open={open}
        />
      )}

      {page === "detail" &&
        (selectedRequest ? (
          <Detail
            request={selectedRequest}
            role={role}
            back={() => setPage("requests")}
            review={() => setPage("review")}
          />
        ) : (
          <Info
            label="Request unavailable"
            value="Select a request from the request list to view its details."
          />
        ))}

      {page === "review" &&
        (selectedRequest ? (
          <ReviewPage
            request={selectedRequest}
            finish={finishReview}
            back={() => setPage("detail")}
          />
        ) : (
          <Info
            label="Request unavailable"
            value="Select a request before opening the review page."
          />
        ))}

      {page === "signature" && <SignaturePage />}

      {page === "notifications" && <NotificationsPage role={role} />}

      {page === "settings" && (
        <section className="card settings-placeholder">
          <div className="avatar large">
            {user.givenName.charAt(0)}
            {user.familyName.charAt(0)}
          </div>

          <h2>{displayName}</h2>
          <p>{user.email}</p>

          <div className="info-grid">
            <Info label="University affiliation" value="MSU–IIT" />

            <Info
              label="Account role"
              value={user.roles.join(", ") || "No assigned role"}
            />

            <Info label="Notification preference" value="Email and in-app" />

            <Info label="Account status" value="Active" />
          </div>
        </section>
      )}
    </Shell>
  );
}
