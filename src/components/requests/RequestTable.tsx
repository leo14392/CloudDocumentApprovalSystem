import type { RequestItem } from "../../types";
import { Icon, StatusBadge } from "../ui";

export function RequestTable({
  data,
  onOpen,
  approver = false,
}: {
  data: RequestItem[];
  onOpen: (r: RequestItem) => void;
  approver?: boolean;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Reference</th>
            {approver && <th>Student</th>}
            <th>Document type</th>
            <th>Submitted</th>
            <th>{approver ? "Status" : "Current stage"}</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, index) => (
            <tr
              key={`${r.id}-${r.type}-${r.date}-${index}`}
              onClick={() => onOpen(r)}
            >
              <td>
                <strong className="ref">{r.id}</strong>
              </td>
              {approver && (
                <td>
                  <div className="student-cell">
                    <span>
                      {r.student
                        .split(" ")
                        .map((x) => x[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <strong>{r.student}</strong>
                  </div>
                </td>
              )}
              <td>
                <div className="doc-cell">
                  <span>
                    <Icon name="file" size={17} />
                  </span>
                  {r.type}
                </div>
              </td>
              <td>{r.date}</td>
              <td>
                {approver ? (
                  <span className="priority">
                    <i />
                    Awaiting review
                  </span>
                ) : (
                  r.stage
                )}
              </td>
              <td>
                <StatusBadge status={r.status} />
              </td>
              <td>
                <button className="row-action" aria-label="View request">
                  <Icon name="chevron" size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
