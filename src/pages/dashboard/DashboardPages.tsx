import type { Page, RequestItem } from "../../types";
import { Button, Icon, StatusBadge } from "../../components/ui";
import { RequestTable } from "../../components/requests/RequestTable";
import { requestsSeed } from "../../data/initialData";

export function StatCard({ label, value, icon, tone, trend }: { label: string; value: number; icon: string; tone: string; trend?: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon name={icon}/></div><div><p>{label}</p><strong>{value}</strong>{trend && <small>{trend}</small>}</div></div>;
}
export function StudentDashboard({ navigate, open }: { navigate: (p: Page) => void; open: (r: RequestItem) => void }) {
  return <>
    <div className="welcome-row"><div><span className="eyebrow">Monday, May 26</span><h2>Good morning, Andrea.</h2><p>You have one document currently waiting for approval.</p></div><Button icon="plus" onClick={() => navigate("new")}>New document request</Button></div>
    <div className="stats-grid"><StatCard label="Total requests" value={12} icon="file" tone="tone-maroon" trend="+2 this semester"/><StatCard label="Pending" value={3} icon="clock" tone="tone-amber"/><StatCard label="Approved" value={7} icon="check" tone="tone-green"/><StatCard label="Returned / Rejected" value={2} icon="rotate" tone="tone-red"/></div>
    <div className="dashboard-grid">
      <section className="card table-card"><div className="card-head"><div><h3>Recent document requests</h3><p>Your latest submissions and their current progress.</p></div><Button variant="ghost" onClick={() => navigate("requests")}>View all <Icon name="arrow" size={15}/></Button></div><RequestTable data={requestsSeed.slice(0, 4)} onOpen={open}/></section>
      <aside className="card progress-card"><div className="card-head"><div><h3>Active request</h3><p>IIT-2025-1048</p></div><StatusBadge status="Pending"/></div><div className="active-document"><div className="doc-big"><Icon name="file"/></div><div><strong>Load Revision Form</strong><span>Submitted May 22, 2025</span></div></div><div className="mini-timeline"><Step done label="Submitted" meta="May 22, 9:14 AM"/><Step done label="Program Adviser" meta="Approved May 23"/><Step current label="College Dean" meta="Awaiting review"/><Step label="Registrar" meta="Next approver"/><Step label="Completed" meta="Final stage"/></div><Button variant="secondary" className="full" onClick={() => open(requestsSeed[0])}>Track request</Button><small className="timeline-note">Approval sequence may vary by document requirements.</small></aside>
    </div>
  </>;
}

export function Step({ label, meta, done, current }: { label: string; meta: string; done?: boolean; current?: boolean }) {
  return <div className={`step ${done ? "step-done" : ""} ${current ? "step-current" : ""}`}><div className="step-mark">{done ? <Icon name="check" size={13}/> : <span/>}</div><div><strong>{label}</strong><small>{meta}</small></div>{current && <em>Current</em>}</div>;
}
export function ApproverDashboard({ navigate, open, queue }: { navigate: (p: Page) => void; open: (r: RequestItem) => void; queue: RequestItem[] }) {
  const pending = queue.filter(r => r.status === "Pending");
  return <><div className="welcome-row"><div><span className="eyebrow">Approver workspace</span><h2>Good morning, Dr. Villanueva.</h2><p>{pending.length} documents are waiting for your review.</p></div><Button variant="secondary" onClick={() => navigate("requests")}>View approval queue</Button></div><div className="stats-grid"><StatCard label="Pending approvals" value={pending.length} icon="clock" tone="tone-amber" trend="1 due today"/><StatCard label="Approved documents" value={28 + queue.filter(r => r.status === "Approved").length} icon="check" tone="tone-green" trend="+8 this month"/><StatCard label="Rejected documents" value={2} icon="x" tone="tone-red"/><StatCard label="Returned for revision" value={4} icon="rotate" tone="tone-blue"/></div><section className="card table-card"><div className="card-head"><div><h3>Requests awaiting action</h3><p>Prioritized by submission date and routing order.</p></div><Button variant="ghost" onClick={() => navigate("requests")}>View full queue <Icon name="arrow" size={15}/></Button></div><RequestTable data={pending} onOpen={open} approver/></section><div className="approver-foot"><div className="card quick-card"><div className="stat-icon tone-maroon"><Icon name="pen"/></div><div><h3>Your e-signature is ready</h3><p>Last updated April 12, 2025. It will only be applied after your approval confirmation.</p></div><Button variant="secondary" onClick={() => navigate("signature")}>Manage signature</Button></div><div className="card reminder"><Icon name="clock"/><div><strong>Average review time</strong><span>1.4 business days</span></div></div></div></>;
}
