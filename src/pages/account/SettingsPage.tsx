import { Info } from "../../components/ui";
import type { AuthenticatedUser } from "../../lib/auth";

function formatRole(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function SettingsPage({ user }: { user: AuthenticatedUser }) {
  const isStudent = user.roles.includes("STUDENT");
  const displayName = [user.givenName, user.middleName, user.familyName]
    .filter(Boolean)
    .join(" ");
  const roles = user.roles.map(formatRole).join(", ") || "No assigned role";
  const missing = "Not provided";

  return (
    <div className="settings-layout">
      <section className="card settings-profile">
        <div className="avatar large">
          {user.givenName.charAt(0)}
          {user.familyName.charAt(0)}
        </div>
        <h2>{displayName}</h2>
        <p>{user.email}</p>
        <span className="settings-role">{roles}</span>
      </section>

      <div className="settings-details">
        <section className="card settings-card">
          <div className="card-head">
            <div>
              <h3>
                {isStudent ? "Academic information" : "Office information"}
              </h3>
              <p>Details recorded for your university account.</p>
            </div>
          </div>
          <div className="info-grid">
            {isStudent && (
              <Info
                label="Student number"
                value={user.studentNumber || missing}
              />
            )}
            <Info label="College" value={user.college || missing} />
            <Info label="Department" value={user.department || missing} />
            {isStudent && (
              <>
                <Info label="Program" value={user.program || missing} />
                <Info
                  label="Year level"
                  value={user.yearLevel?.toString() ?? missing}
                />
              </>
            )}
          </div>
        </section>

        <section className="card settings-card">
          <div className="card-head">
            <div>
              <h3>Account details</h3>
              <p>Your sign-in and affiliation information.</p>
            </div>
          </div>
          <div className="info-grid">
            <Info label="University email" value={user.email} />
            <Info label="University affiliation" value="MSU–IIT" />
            <Info label="Account role" value={roles} />
          </div>
        </section>

        <p className="settings-note">
          To correct any of these details, contact ICTC support.
        </p>
      </div>
    </div>
  );
}