import { useEffect, useState } from "react";
import type { Role } from "../../types";
import { Button, Icon, Modal } from "../../components/ui";
import {
  getNotificationsApi,
  markNotificationAsReadApi,
  markAllNotificationsAsReadApi,
  type NotificationItem,
} from "../../lib/notifications";

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

export function NotificationsPage({
  role,
  onOpenRequest,
}: {
  role: Role;
  onOpenRequest: (referenceNumber: string) => Promise<void>;
}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function loadNotifications() {
    try {
      const notifications = await getNotificationsApi();
      setItems(notifications);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 10000);

    return () => window.clearInterval(interval);
  }, []);

  const unreadCount = items.filter((item) => !item.isRead).length;

  const filteredItems =
    filter === "unread" ? items.filter((item) => !item.isRead) : items;

  function getNotificationIcon(type: string) {
    switch (type) {
      case "submission_confirmation":
        return "check";
      case "new_request":
        return "file";
      case "approved":
        return "check";
      case "revision_requested":
        return "rotate";
      case "reminder":
        return "clock";
      default:
        return "file";
    }
  }

  function getNotificationTone(type: string) {
    switch (type) {
      case "submission_confirmation":
      case "approved":
        return "green";
      case "revision_requested":
        return "amber";
      default:
        return "maroon";
    }
  }

  function formatNotificationDate(date: string) {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  async function handleMarkAsRead(notificationId: string) {
    try {
      await markNotificationAsReadApi(notificationId);

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === notificationId ? { ...item, isRead: true } : item,
        ),
      );

      window.dispatchEvent(new Event("notifications-updated"));

      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark notification as read.",
      );
    }
  }

  async function handleNotificationClick(item: NotificationItem) {
    try {
      if (!item.isRead) {
        await markNotificationAsReadApi(item.id);

        setItems((currentItems) =>
          currentItems.map((notification) =>
            notification.id === item.id
              ? { ...notification, isRead: true }
              : notification,
          ),
        );

        window.dispatchEvent(new Event("notifications-updated"));
      }

      setError("");

      if (item.referenceNumber) {
        await onOpenRequest(item.referenceNumber);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to open this notification.",
      );
    }
  }

  async function handleMarkAllAsRead() {
    if (unreadCount === 0 || actionLoading) {
      return;
    }

    setActionLoading(true);

    try {
      await markAllNotificationsAsReadApi();

      setItems((currentItems) =>
        currentItems.map((item) => ({
          ...item,
          isRead: true,
        })),
      );

      window.dispatchEvent(new Event("notifications-updated"));

      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark all notifications as read.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section className="card notification-card">
      <div className="card-head">
        <div>
          <h3>All notifications</h3>
          <p>
            {role === "student"
              ? "Updates about your documents and submissions."
              : "Updates about documents and approval activity."}
          </p>
        </div>

        <Button
          variant="ghost"
          onClick={handleMarkAllAsRead}
          disabled={unreadCount === 0 || actionLoading}
        >
          {actionLoading ? "Updating..." : "Mark all as read"}
        </Button>
      </div>

      <div className="notification-filter">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All
        </button>

        <button
          className={filter === "unread" ? "active" : ""}
          onClick={() => setFilter("unread")}
        >
          Unread <span>{unreadCount}</span>
        </button>
      </div>

      {error && (
        <div className="notification-error" role="alert">
          {error}
          <button onClick={() => void loadNotifications()}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="notification-empty">
          <p>Loading notifications...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="notification-empty">
          <Icon name="check" size={24} />
          <p>
            {filter === "unread"
              ? "You're all caught up. No unread notifications."
              : "You don't have any notifications yet."}
          </p>
        </div>
      ) : (
        filteredItems.map((item) => {
          const icon = getNotificationIcon(item.type);
          const tone = getNotificationTone(item.type);

          return (
            <div
              className={`notification-item ${!item.isRead ? "unread" : ""}`}
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => void handleNotificationClick(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void handleNotificationClick(item);
                }
              }}
              title={
                item.referenceNumber
                  ? "Open request details"
                  : "Mark notification as read"
              }
            >
              <div className={`notification-icon tone-${tone}`}>
                <Icon name={icon} />
              </div>

              <div>
                <strong>{item.title}</strong>
                <p>{item.message}</p>
                <small>{formatNotificationDate(item.createdAt)}</small>
              </div>

              {!item.isRead && <i />}

              <button
                type="button"
                aria-label={
                  item.isRead
                    ? "Notification already read"
                    : "Mark notification as read"
                }
                title={item.isRead ? "Already read" : "Mark as read"}
                disabled={item.isRead}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleMarkAsRead(item.id);
                }}
              >
                <Icon name="chevron" size={16} />
              </button>
            </div>
          );
        })
      )}
    </section>
  );
}
