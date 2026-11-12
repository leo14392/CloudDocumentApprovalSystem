import { useState } from "react";
import type {
  Page,
  Role,
  RequestItem,
  LoadRevisionPermit,
  Status,
} from "./types";
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
import { approvalQueue, defaultPermit, requestsSeed } from "./data/initialData";

export default function App() {
  const [page, setPage] = useState<Page>("login");
  const [role, setRole] = useState<Role>("student");
  const [selectedType, setSelectedType] = useState("Load Revision Form");
  const [selectedRequest, setSelectedRequest] = useState<RequestItem>(
    requestsSeed[0],
  );
  const [requests, setRequests] = useState<RequestItem[]>(requestsSeed);
  const [queue, setQueue] = useState<RequestItem[]>(approvalQueue);
  const [submitted, setSubmitted] = useState<RequestItem | null>(null);
  const login = (r: Role) => {
    setRole(r);
    setPage("dashboard");
  };
  const open = (r: RequestItem) => {
    setSelectedRequest(r);
    setPage(role === "approver" ? "detail" : "detail");
  };
  const submitRequest = (permit?: LoadRevisionPermit) => {
    const nextReference =
      Math.max(
        ...requests.map((request) => Number(request.id.split("-").at(-1)) || 0),
        ...queue.map((request) => Number(request.id.split("-").at(-1)) || 0),
        1061,
      ) + 1;
    const r = {
      id: `IIT-2025-${nextReference}`,
      type: selectedType,
      student: permit
        ? `${permit.givenName} ${permit.middleName} ${permit.familyName}`
            .replace(/\s+/g, " ")
            .trim()
        : "Andrea M. Santos",
      date: "May 26, 2025",
      stage: "Program Adviser",
      status: "Pending" as Status,
      permit,
    };
    setRequests([r, ...requests]);
    setQueue([r, ...queue]);
    setSubmitted(r);
  };
  const finishReview = (
    status: Status,
    reason?: string,
    signatureSlot?: string,
  ) => {
    const nextStatus: Status = signatureSlot ? "Pending" : status;
    const permit = signatureSlot
      ? {
          ...(selectedRequest.permit || defaultPermit),
          signatures: {
            ...(selectedRequest.permit || defaultPermit).signatures,
            [signatureSlot]: "Dr. Elena Villanueva",
          },
        }
      : selectedRequest.permit;
    const updated = {
      ...selectedRequest,
      status: nextStatus,
      reason,
      permit,
      stage: signatureSlot ? `${signatureSlot} signed` : selectedRequest.stage,
    };
    setSelectedRequest(updated);
    setRequests(
      requests.map((r) => (r.id === selectedRequest.id ? updated : r)),
    );
    setQueue(queue.map((r) => (r.id === selectedRequest.id ? updated : r)));
    setPage("detail");
  };
  if (page === "login") return <LoginPage onLogin={login} />;
  if (submitted)
    return (
      <Shell
        role={role}
        page="requests"
        navigate={(p) => {
          setSubmitted(null);
          setPage(p);
        }}
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
  let title = "Dashboard",
    subtitle =
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
  return (
    <Shell
      role={role}
      page={page}
      navigate={setPage}
      title={title}
      subtitle={subtitle}
    >
      {page === "dashboard" &&
        (role === "student" ? (
          <StudentDashboard navigate={setPage} open={open} />
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
      {page === "detail" && (
        <Detail
          request={selectedRequest}
          role={role}
          back={() => setPage("requests")}
          review={() => setPage("review")}
        />
      )}
      {page === "review" && (
        <ReviewPage
          request={selectedRequest}
          finish={finishReview}
          back={() => setPage("detail")}
        />
      )}
      {page === "signature" && <SignaturePage />}
      {page === "notifications" && <NotificationsPage role={role} />}
      {page === "settings" && (
        <section className="card settings-placeholder">
          <div className="avatar large">{role === "student" ? "AS" : "EV"}</div>
          <h2>
            {role === "student" ? "Andrea M. Santos" : "Dr. Elena Villanueva"}
          </h2>
          <p>
            {role === "student"
              ? "andrea.santos@g.msuiit.edu.ph"
              : "elena.villanueva@msuiit.edu.ph"}
          </p>
          <div className="info-grid">
            <Info label="University affiliation" value="MSU–IIT" />
            <Info
              label="Account role"
              value={role === "student" ? "Student" : "Authorized Approver"}
            />
            <Info label="Notification preference" value="Email and in-app" />
            <Info label="Account status" value="Active" />
          </div>
        </section>
      )}
    </Shell>
  );
}
