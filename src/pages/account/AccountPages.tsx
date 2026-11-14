import { useState } from "react";
import type { Role } from "../../types";
import { Button, Icon, Modal } from "../../components/ui";

export function SignaturePage() {
  const [saved, setSaved] = useState(true);
  const [tab, setTab] = useState<"draw" | "upload">("draw");
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="signature-layout">
      <section className="card signature-main">
        <div className="card-head">
          <div>
            <h3>Create your e-signature</h3>
            <p>Draw a signature or upload a transparent image file.</p>
          </div>
        </div>
        <div className="signature-tabs">
          <button
            className={tab === "draw" ? "active" : ""}
            onClick={() => setTab("draw")}
          >
            <Icon name="pen" size={17} /> Draw signature
          </button>
          <button
            className={tab === "upload" ? "active" : ""}
            onClick={() => setTab("upload")}
          >
            <Icon name="upload" size={17} /> Upload image
          </button>
        </div>
        {tab === "draw" ? (
          <div className="signature-pad">
            <span className="script-signature">Elena Villanueva</span>
            <div className="pad-line" />
            <small>
              Draw your signature above using your mouse or touch screen
            </small>
            <button>Clear</button>
          </div>
        ) : (
          <label className="upload-zone">
            <Icon name="upload" size={30} />
            <strong>Drop your signature image here</strong>
            <span>or click to browse · PNG or JPG up to 2 MB</span>
            <input type="file" accept="image/*" />
          </label>
        )}
        <div className="signature-actions">
          <Button variant="secondary">Reset</Button>
          <Button onClick={() => setConfirm(true)}>Save signature</Button>
        </div>
      </section>
      <aside className="card signature-preview">
        <span className="eyebrow">Current signature</span>
        <div className="preview-sign">
          {saved ? (
            <span className="script-signature">Elena Villanueva</span>
          ) : (
            <em>No signature saved</em>
          )}
        </div>
        <div className="signature-status">
          <i />
          <div>
            <strong>{saved ? "Signature ready" : "No saved signature"}</strong>
            <span>
              {saved
                ? "Last updated April 12, 2025"
                : "Create one to approve documents"}
            </span>
          </div>
        </div>
        {saved && (
          <Button
            variant="danger"
            className="full"
            onClick={() => setSaved(false)}
          >
            Remove signature
          </Button>
        )}
        <div className="legal-note">
          <Icon name="check" size={18} />
          <p>
            This prototype signature is stored only within this interface and is
            not a legally verified or cryptographic digital signature.
          </p>
        </div>
      </aside>
      {confirm && (
        <Modal
          title={saved ? "Replace saved signature?" : "Save this signature?"}
          close={() => setConfirm(false)}
        >
          <p>
            This signature will be used in the prototype when you confirm
            document approvals.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setSaved(true);
                setConfirm(false);
              }}
            >
              {saved ? "Replace signature" : "Save signature"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function NotificationsPage({ role }: { role: Role }) {
  const items =
    role === "student"
      ? [
          [
            "check",
            "Your document was approved",
            "Your Leave of Absence Form has received final approval.",
            "12 minutes ago",
            true,
          ],
          [
            "rotate",
            "Revision requested",
            "Your Shifter's Application Form was returned with a comment.",
            "Yesterday",
            true,
          ],
          [
            "file",
            "Document submitted successfully",
            "IIT-2025-1048 is now with the College Dean.",
            "May 22",
            false,
          ],
          [
            "download",
            "Your approved PDF is ready",
            "Load Revision Form IIT-2025-0912 is available to download.",
            "Apr 29",
            false,
          ],
        ]
      : [
          [
            "file",
            "New document awaiting review",
            "Miguel Ramos submitted a Leave of Absence Form.",
            "8 minutes ago",
            true,
          ],
          [
            "clock",
            "Pending approval reminder",
            "IIT-2025-1048 has been waiting for review for two days.",
            "2 hours ago",
            true,
          ],
          [
            "rotate",
            "Request updated",
            "Patricia Cruz revised and resubmitted her document.",
            "Yesterday",
            false,
          ],
        ];
  return (
    <section className="card notification-card">
      <div className="card-head">
        <div>
          <h3>All notifications</h3>
          <p>Updates about documents and approval activity.</p>
        </div>
        <Button variant="ghost">Mark all as read</Button>
      </div>
      <div className="notification-filter">
        <button className="active">All</button>
        <button>
          Unread <span>{items.filter((x) => x[4]).length}</span>
        </button>
      </div>
      {items.map((x, i) => (
        <div className={`notification-item ${x[4] ? "unread" : ""}`} key={i}>
          <div
            className={`notification-icon tone-${x[0] === "check" || x[0] === "download" ? "green" : x[0] === "rotate" ? "amber" : "maroon"}`}
          >
            <Icon name={x[0] as string} />
          </div>
          <div>
            <strong>{x[1]}</strong>
            <p>{x[2]}</p>
            <small>{x[3]}</small>
          </div>
          {x[4] && <i />}
          <button>
            <Icon name="chevron" size={16} />
          </button>
        </div>
      ))}
    </section>
  );
}
