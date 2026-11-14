import { useMemo, useState } from "react";
import type { RequestItem, Role } from "../../types";
import { Button, Icon } from "../../components/ui";
import { RequestTable } from "../../components/requests/RequestTable";

export function RequestsPage({
  data,
  role,
  open,
}: {
  data: RequestItem[];
  role: Role;
  open: (r: RequestItem) => void;
}) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const list = useMemo(
    () =>
      data.filter(
        (r) =>
          (filter === "All" || r.status === filter) &&
          (r.id + r.type + r.student)
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [data, filter, search],
  );
  const filters =
    role === "student"
      ? ["All", "Pending", "Approved", "Returned for Revision", "Completed"]
      : ["All", "Pending", "Approved", "Rejected", "Returned for Revision"];
  return (
    <>
      <div className="list-toolbar">
        <div className="search-box">
          <Icon name="search" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference, document, or student…"
          />
        </div>
        <Button variant="secondary" icon="download">
          Export
        </Button>
      </div>
      <div className="filter-tabs">
        {filters.map((x) => (
          <button
            key={x}
            className={filter === x ? "active" : ""}
            onClick={() => setFilter(x)}
          >
            {x}
            <span>
              {x === "All"
                ? data.length
                : data.filter((r) => r.status === x).length}
            </span>
          </button>
        ))}
      </div>
      <section className="card request-list">
        {list.length ? (
          <RequestTable
            data={list}
            onOpen={open}
            approver={role === "approver"}
          />
        ) : (
          <div className="empty">
            <Icon name="search" size={28} />
            <h3>No matching requests</h3>
            <p>Try adjusting your search or selected status filter.</p>
          </div>
        )}
      </section>
    </>
  );
}
