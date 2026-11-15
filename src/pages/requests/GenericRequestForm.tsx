import { useState, type FormEvent } from "react";

import type {
  ShifterApplicationSubmission,
  LeaveOfAbsenceSubmission,
} from "../../lib/auth";

import { Button, Field, Icon, Modal } from "../../components/ui";

type GenericRequestSubmission =
  | ShifterApplicationSubmission
  | LeaveOfAbsenceSubmission;

export function GenericRequestForm({
  type,
  cancel,
  submit,
}: {
  type: string;
  cancel: () => void;
  submit: (data?: GenericRequestSubmission) => void;
}) {
  const [reason, setReason] = useState("");
  const [intendedProgram, setIntendedProgram] = useState("");
  const [currentAcademicYear, setCurrentAcademicYear] = useState("");
  const [semester, setSemester] = useState("1st Semester");

  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState(false);

  const isShifter = type === "Shifter's Application Form";
  const isLeave = type === "Leave of Absence Form";

  function validate(e: FormEvent) {
    e.preventDefault();

    if (
      !reason.trim() ||
      (isShifter && !intendedProgram.trim()) ||
      (isLeave && !currentAcademicYear.trim())
    ) {
      setError(true);
      return;
    }

    setError(false);
    setConfirm(true);
  }

  function confirmSubmission() {
    if (isShifter) {
      submit({
        intendedProgram: intendedProgram.trim(),
        reason: reason.trim(),
      });
      return;
    }

    if (isLeave) {
      submit({
        currentAcademicYear: currentAcademicYear.trim(),
        semester,
        reason: reason.trim(),
      });
    }
  }

  return (
    <>
      <div className="form-page-head">
        <button className="back-link" onClick={cancel}>
          ← Back to forms
        </button>

        <span>New request</span>
        <h2>{type}</h2>

        <p>
          Complete the required information below. Fields marked with * are
          required.
        </p>
      </div>

      <form className="request-form" onSubmit={validate}>
        <section className="form-section">
          <div className="section-number">1</div>

          <div className="section-body">
            <div className="section-title">
              <h3>Student information</h3>
              <p>
                Your identity and academic profile will be retrieved from your
                authenticated university account.
              </p>
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="section-number">2</div>

          <div className="section-body">
            <div className="section-title">
              <h3>
                {isShifter ? "Program information" : "Academic information"}
              </h3>

              <p>Provide the details relevant to this request.</p>
            </div>

            <div className="form-grid">
              {isShifter && (
                <Field label="Intended program" required>
                  <input
                    type="text"
                    value={intendedProgram}
                    onChange={(e) => {
                      setIntendedProgram(e.target.value);
                      setError(false);
                    }}
                    placeholder="Enter your intended program"
                    maxLength={120}
                  />
                </Field>
              )}

              {isLeave && (
                <>
                  <Field label="Current academic year" required>
                    <input
                      type="text"
                      value={currentAcademicYear}
                      onChange={(e) => {
                        setCurrentAcademicYear(e.target.value);
                        setError(false);
                      }}
                      placeholder="Example: 2026-2027"
                      maxLength={60}
                    />
                  </Field>

                  <Field label="Semester" required>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                    >
                      <option value="1st Semester">First Semester</option>
                      <option value="2nd Semester">Second Semester</option>
                      <option value="Summer Term">Summer Term</option>
                    </select>
                  </Field>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="section-number">3</div>

          <div className="section-body">
            <div className="section-title">
              <h3>Reason for request</h3>

              <p>
                {isShifter
                  ? "Explain your reason for enrolling in your present program and for shifting."
                  : "Briefly explain the circumstances for your leave of absence."}
              </p>
            </div>

            <Field
              label={
                isLeave
                  ? "Reason for leave of absence"
                  : "Reason for shifting or transferring"
              }
              required
            >
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError(false);
                }}
                placeholder="Provide a clear explanation to help approvers review your request…"
                rows={5}
                maxLength={5000}
              />

              {error && (
                <span className="error-text">
                  Please complete all required fields before continuing.
                </span>
              )}
            </Field>
          </div>
        </section>

        <div className="form-actions">
          <Button variant="secondary" onClick={cancel}>
            Cancel
          </Button>

          <Button type="submit">
            Review and submit <Icon name="arrow" size={16} />
          </Button>
        </div>
      </form>

      {confirm && (
        <Modal title="Submit this request?" close={() => setConfirm(false)}>
          <div className="confirm-icon">
            <Icon name="file" />
          </div>

          <p>
            You're about to submit your <strong>{type}</strong>. The request
            will be routed to the first designated approver.
          </p>

          <div className="modal-summary">
            <span>Student</span>
            <strong>Authenticated student account</strong>

            {isShifter && (
              <>
                <span>Intended program</span>
                <strong>{intendedProgram}</strong>
              </>
            )}

            {isLeave && (
              <>
                <span>Academic year</span>
                <strong>{currentAcademicYear}</strong>

                <span>Semester</span>
                <strong>{semester}</strong>
              </>
            )}

            <span>Document</span>
            <strong>{type}</strong>
          </div>

          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Go back
            </Button>

            <Button onClick={confirmSubmission}>Confirm submission</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
