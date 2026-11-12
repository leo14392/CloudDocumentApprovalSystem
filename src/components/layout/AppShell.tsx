import { useState, type ReactNode } from "react";
import type { Page, Role } from "../../types";
import { Icon, Logo } from "../ui";

const studentNav = [
  ["dashboard", "grid", "Dashboard"],
  ["new", "plus", "New Request"],
  ["requests", "file", "My Requests"],
  ["notifications", "bell", "Notifications"],
  ["settings", "settings", "Profile & Settings"],
];
const approverNav = [
  ["dashboard", "grid", "Dashboard"],
  ["requests", "clock", "Pending Approvals"],
  ["requests", "file", "Processed Requests"],
  ["signature", "pen", "My E-Signature"],
  ["notifications", "bell", "Notifications"],
  ["settings", "settings", "Profile & Settings"],
];

export function Sidebar({ role, page, navigate, open, close }: { role: Role; page: Page; navigate: (p: Page) => void; open: boolean; close: () => void }) {
  const nav = role === "student" ? studentNav : approverNav;
  return <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
    <div className="sidebar-head"><Logo light/><button className="mobile-close" onClick={close} aria-label="Close menu"><Icon name="x"/></button></div>
    <div className="role-label">{role === "student" ? "Student Portal" : "Approver Workspace"}</div>
    <nav>{nav.map(([target, icon, label], i) => <button key={`${label}-${i}`} className={(page === target && !(i === 2 && role === "approver")) ? "nav-active" : ""} onClick={() => { navigate(target as Page); close(); }}><Icon name={icon}/><span>{label}</span>{label === "Notifications" && <em>3</em>}</button>)}</nav>
    <div className="sidebar-support"><div className="support-icon">?</div><strong>Need help?</strong><p>Visit the service guide or contact ICTC support.</p><button>View support center <Icon name="arrow" size={14}/></button></div>
    <button className="signout" onClick={() => navigate("login")}><Icon name="logout"/><span>Sign out</span></button>
  </aside>;
}
export function Shell({ children, role, page, navigate, title, subtitle }: { children: ReactNode; role: Role; page: Page; navigate: (p: Page) => void; title: string; subtitle: string }) {
  const [menu, setMenu] = useState(false);
  return <div className="app-shell">
    <Sidebar role={role} page={page} navigate={navigate} open={menu} close={() => setMenu(false)}/>
    {menu && <div className="scrim" onClick={() => setMenu(false)}/>}
    <main className="main">
      <header className="topbar">
        <button className="menu-btn" onClick={() => setMenu(true)} aria-label="Open menu"><Icon name="menu"/></button>
        <div className="page-heading"><h1>{title}</h1><p>{subtitle}</p></div>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => navigate("notifications")} aria-label="Notifications"><Icon name="bell"/><i/></button>
          <div className="profile"><div className="avatar">{role === "student" ? "AS" : "EV"}</div><div><strong>{role === "student" ? "Andrea Santos" : "Dr. Elena Villanueva"}</strong><small>{role === "student" ? "BS Information Technology" : "Department Chair"}</small></div><Icon name="chevron" size={15}/></div>
        </div>
      </header>
      <div className="content">{children}</div>
    </main>
  </div>;
}
