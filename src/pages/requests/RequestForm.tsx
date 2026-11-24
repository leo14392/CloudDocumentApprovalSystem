import type { LoadRevisionPermit } from "../../types";

import type {
  ShifterApplicationSubmission,
  LeaveOfAbsenceSubmission,
} from "../../lib/auth";

import type {
  ShifterApplicationDetails,
  LeaveOfAbsenceDetails,
} from "../../lib/requests";

import { isLoadRevision } from "../../data/initialData";
import { LoadRevisionForm } from "./permit/LoadRevisionForm";
import { GenericRequestForm } from "./GenericRequestForm";

export type RequestSubmission =
  | {
      kind: "loadRevision";
      permit: LoadRevisionPermit;
    }
  | {
      kind: "shifter";
      data: ShifterApplicationSubmission;
    }
  | {
      kind: "leaveOfAbsence";
      data: LeaveOfAbsenceSubmission;
    };

export function RequestForm({
  type,
  cancel,
  submit,
  initialPermit,
  initialGenericData,
  isResubmission = false,
}: {
  type: string;
  cancel: () => void;
  submit: (submission: RequestSubmission) => void;
  initialPermit?: LoadRevisionPermit;
  isResubmission?: boolean;
  initialGenericData?: ShifterApplicationDetails | LeaveOfAbsenceDetails;
}) {
  if (isLoadRevision(type)) {
    return (
      <LoadRevisionForm
        cancel={cancel}
        initialData={initialPermit}
        isResubmission={isResubmission}
        submit={(permit) =>
          submit({
            kind: "loadRevision",
            permit,
          })
        }
      />
    );
  }

  return (
    <GenericRequestForm
      type={type}
      initialData={initialGenericData}
      isResubmission={isResubmission}
      cancel={cancel}
      submit={(data) => {
        if (!data) return;

        if ("intendedProgram" in data) {
          submit({
            kind: "shifter",
            data,
          });
        } else if ("currentAcademicYear" in data) {
          submit({
            kind: "leaveOfAbsence",
            data,
          });
        }
      }}
    />
  );
}
