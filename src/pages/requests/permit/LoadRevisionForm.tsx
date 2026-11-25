import { useState, type FormEvent } from "react";
import type { LoadRevisionPermit } from "../../../types";
import { Button, Field, Icon, Modal } from "../../../components/ui";
import { defaultPermit } from "../../../data/initialData";
import { SubjectEditor } from "./SubjectEditor";
import type { AuthenticatedUser } from "../../../lib/auth";

export function LoadRevisionForm({
  cancel,
  submit,
  initialData,
  isResubmission = false,
  studentProfile,
}: {
  cancel: () => void;
  submit: (permit: LoadRevisionPermit) => void;
  initialData?: LoadRevisionPermit;
  isResubmission?: boolean;
  studentProfile: AuthenticatedUser;
}) {
  const [data, setData] = useState<LoadRevisionPermit>(() => {
    if (initialData) return initialData;

    return {
      ...defaultPermit,
      familyName: studentProfile.familyName,
      givenName: studentProfile.givenName,
      middleName: studentProfile.middleName ?? "",
      studentId: studentProfile.studentNumber ?? "",
      college: studentProfile.college ?? "",
      department: studentProfile.department ?? "",
      courseYear: [
        studentProfile.program,
        studentProfile.yearLevel
          ? `${studentProfile.yearLevel}${studentProfile.yearLevel === 1 ? "st" : studentProfile.yearLevel === 2 ? "nd" : studentProfile.yearLevel === 3 ? "rd" : "th"} Year`
          : "",
      ]
        .filter(Boolean)
        .join(" – "),
      studentSignature: [
        studentProfile.givenName,
        studentProfile.middleName,
        studentProfile.familyName,
      ]
        .filter(Boolean)
        .join(" "),
    };
  });
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof LoadRevisionPermit>(
    field: K,
    value: LoadRevisionPermit[K],
  ) => setData((current) => ({ ...current, [field]: value }));
  function validate(e: FormEvent) {
    e.preventDefault();
    const required = [
      data.schoolYear,
      data.familyName,
      data.givenName,
      data.studentId,
      data.permitDate,
      data.college,
      data.department,
      data.courseYear,
      data.loadBeforeUnits,
      data.loadBeforeHours,
      data.loadAfterUnits,
      data.loadAfterHours,
      data.studentSignature,
    ];
    const invalidRows = [...data.withdraw, ...data.add].some(
      (row) => !row.course.trim() || !row.title.trim() || !row.units.trim(),
    );
    if (
      required.some((value) => !value.trim()) ||
      invalidRows ||
      (!data.conflict && !data.dissolved && !data.otherReason.trim())
    ) {
      setError(
        "Complete all required fields and select or enter at least one reason for revision.",
      );
      return;
    }
    setError("");
    setConfirm(true);
  }
  return (
    <>
      <div className="form-page-head">
        <button className="back-link" onClick={cancel}>
          ← Back to forms
        </button>
        <span>Official Registrar Form · FM-MSU-IIT-RGTR-008</span>
        <h2>
          {isResubmission
            ? "Revise and Resubmit Academic Load Permit"
            : "Academic Load Revision Permit"}
        </h2>
        <p>
          {isResubmission
            ? "Update the requested information based on the return remarks, then resubmit your permit."
            : "Complete the student portions of the official permit. Signature fields for university personnel are read-only."}
        </p>
      </div>
      <form className="request-form permit-form" onSubmit={validate}>
        <section className="form-section">
          <div className="section-number">1</div>
          <div className="section-body">
            <div className="section-title">
              <h3>Academic term</h3>
              <p>Select the term covered by this permit.</p>
            </div>
            <div className="form-grid">
              <Field label="Academic term" required>
                <select
                  value={data.term}
                  onChange={(e) =>
                    set("term", e.target.value as LoadRevisionPermit["term"])
                  }
                >
                  <option>1st Semester</option>
                  <option>2nd Semester</option>
                  <option>Summer Term</option>
                </select>
              </Field>
              <Field label="School year" required>
                <input
                  value={data.schoolYear}
                  onChange={(e) => set("schoolYear", e.target.value)}
                  placeholder="e.g. 2025–2026"
                />
              </Field>
            </div>
          </div>
        </section>
        <section className="form-section">
          <div className="section-number">2</div>
          <div className="section-body">
            <div className="section-title">
              <h3>Student information</h3>
              <p>
                Enter your name in Family, Given, Middle order as shown on the
                permit.
              </p>
            </div>
            <div className="form-grid three-col">
              <Field label="Family name" required>
                <input
                  value={data.familyName}
                  onChange={(e) => set("familyName", e.target.value)}
                />
              </Field>
              <Field label="Given name" required>
                <input
                  value={data.givenName}
                  onChange={(e) => set("givenName", e.target.value)}
                />
              </Field>
              <Field label="Middle name">
                <input
                  value={data.middleName}
                  onChange={(e) => set("middleName", e.target.value)}
                />
              </Field>
              <Field label="Student ID number" required>
                <input
                  value={data.studentId}
                  onChange={(e) => set("studentId", e.target.value)}
                />
              </Field>
              <Field label="Date" required>
                <input
                  type="date"
                  value={data.permitDate}
                  onChange={(e) => set("permitDate", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </section>
        <section className="form-section">
          <div className="section-number">3</div>
          <div className="section-body">
            <div className="section-title">
              <h3>Academic information</h3>
              <p>Provide your current college, department, course, and year.</p>
            </div>
            <div className="form-grid">
              <Field label="College / School" required>
                <input
                  value={data.college}
                  onChange={(e) => set("college", e.target.value)}
                />
              </Field>
              <Field label="Department" required>
                <input
                  value={data.department}
                  onChange={(e) => set("department", e.target.value)}
                />
              </Field>
              <Field label="Course and year" required>
                <input
                  value={data.courseYear}
                  onChange={(e) => set("courseYear", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </section>
        <section className="form-section">
          <div className="section-number">4</div>
          <div className="section-body">
            <SubjectEditor
              kind="withdraw"
              rows={data.withdraw}
              update={(rows) => set("withdraw", rows)}
            />
          </div>
        </section>
        <section className="form-section">
          <div className="section-number">5</div>
          <div className="section-body">
            <SubjectEditor
              kind="add"
              rows={data.add}
              update={(rows) => set("add", rows)}
            />
          </div>
        </section>
        <section className="form-section">
          <div className="section-number">6</div>
          <div className="section-body">
            <div className="section-title">
              <h3>Academic load</h3>
              <p>
                Enter both units and hours per week before and after revision.
              </p>
            </div>
            <div className="form-grid four-col">
              <Field label="Before — units" required>
                <input
                  type="number"
                  value={data.loadBeforeUnits}
                  onChange={(e) => set("loadBeforeUnits", e.target.value)}
                />
              </Field>
              <Field label="Before — hours/week" required>
                <input
                  type="number"
                  value={data.loadBeforeHours}
                  onChange={(e) => set("loadBeforeHours", e.target.value)}
                />
              </Field>
              <Field label="After — units" required>
                <input
                  type="number"
                  value={data.loadAfterUnits}
                  onChange={(e) => set("loadAfterUnits", e.target.value)}
                />
              </Field>
              <Field label="After — hours/week" required>
                <input
                  type="number"
                  value={data.loadAfterHours}
                  onChange={(e) => set("loadAfterHours", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </section>
        <section className="form-section">
          <div className="section-number">7</div>
          <div className="section-body">
            <div className="section-title">
              <h3>Reason for load revision</h3>
              <p>
                Select all applicable reasons and provide your printed name for
                the student signature area.
              </p>
            </div>
            <div className="reason-checks">
              <label>
                <input
                  type="checkbox"
                  checked={data.conflict}
                  onChange={(e) => set("conflict", e.target.checked)}
                />{" "}
                Conflict of Schedule
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={data.dissolved}
                  onChange={(e) => set("dissolved", e.target.checked)}
                />{" "}
                Subject/s Dissolved
              </label>
            </div>
            <Field label="Other reason/s">
              <textarea
                rows={3}
                value={data.otherReason}
                onChange={(e) => set("otherReason", e.target.value)}
                placeholder="Enter other reason/s, if applicable"
              />
            </Field>
            <Field label="Student signature over printed name" required>
              <input
                value={data.studentSignature}
                onChange={(e) => set("studentSignature", e.target.value)}
              />
            </Field>
          </div>
        </section>
        <section className="form-section approval-readonly">
          <div className="section-number">8</div>
          <div className="section-body">
            <div className="section-title">
              <h3>Approval</h3>
              <p>
                These designated areas are completed by authorized university
                personnel after submission.
              </p>
            </div>
            <div className="approval-slots">
              {["Adviser", "Chairperson", "Dean", "Registrar"].map((role) => (
                <div key={role}>
                  <Icon name="pen" size={16} />
                  <strong>{role}</strong>
                  <span>Signature over printed name · Date</span>
                  <em>Read-only</em>
                </div>
              ))}
            </div>
            <div className="official-fields">
              <span>Assessment</span>
              <b>University personnel only</b>
              <span>Official Receipt No.</span>
              <b>University personnel only</b>
            </div>
          </div>
        </section>
        {error && (
          <div className="form-error-banner">
            <Icon name="x" size={17} />
            {error}
          </div>
        )}
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
        <Modal
          title={
            isResubmission
              ? "Resubmit this official permit?"
              : "Submit this official permit?"
          }
          close={() => setConfirm(false)}
        >
          <div className="confirm-icon">
            <Icon name="file" />
          </div>
          <p>
            {isResubmission
              ? "You're about to resubmit your revised "
              : "You're about to submit the "}
            <strong>Academic Load Revision Permit</strong>{" "}
            (FM-MSU-IIT-RGTR-008). Designated university personnel will complete
            the approval and signature fields.
          </p>
          <div className="modal-summary">
            <span>Student</span>
            <strong>
              {data.familyName}, {data.givenName} {data.middleName}
            </strong>
            <span>Term</span>
            <strong>
              {data.term}, SY {data.schoolYear}
            </strong>
          </div>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Go back
            </Button>
            <Button onClick={() => submit(data)}>
              {isResubmission ? "Confirm resubmission" : "Confirm submission"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
