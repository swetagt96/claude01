import type { SavedPlant } from "../types";
import { getDueStatus } from "../garden";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function MyGarden({
  plants,
  notifyState,
  loggedIn,
  onEnableNotifications,
  onWater,
  onRemove,
}: {
  plants: SavedPlant[];
  notifyState: NotificationPermission | "unsupported";
  loggedIn: boolean;
  onEnableNotifications: () => void;
  onWater: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (plants.length === 0) return null;

  const dueCount = plants.filter((p) => {
    const s = getDueStatus(p).state;
    return s === "overdue" || s === "due-today";
  }).length;

  return (
    <section className="card garden">
      <div className="garden-head">
        <h2>
          🪴 My Garden
          {dueCount > 0 && <span className="due-count">{dueCount} need water</span>}
        </h2>
        {notifyState === "default" && (
          <button className="btn ghost sm" onClick={onEnableNotifications}>
            🔔 Enable reminders
          </button>
        )}
        {notifyState === "granted" && (
          <span className="notify-on">
            🔔 {loggedIn ? "Background reminders on" : "Reminders on (while open)"}
          </span>
        )}
        {notifyState === "denied" && (
          <span className="notify-off" title="Allow notifications in your browser settings">
            🔕 Reminders blocked
          </span>
        )}
      </div>

      <ul className="garden-list">
        {plants.map((plant) => {
          const status = getDueStatus(plant);
          return (
            <li key={plant.id} className={`garden-item due-${status.state}`}>
              <div className="gi-thumb">
                {plant.imageDataUrl ? (
                  <img src={plant.imageDataUrl} alt={plant.nickname} />
                ) : (
                  <span className="gi-emoji">🌱</span>
                )}
              </div>

              <div className="gi-info">
                <strong className="gi-name">{plant.nickname}</strong>
                <span className="gi-species">{plant.commonName}</span>
                <span className={`gi-due badge-${status.state}`}>{status.label}</span>
                <span className="gi-meta">
                  Every {plant.frequencyDays}d · last watered {formatDate(plant.lastWatered)}
                </span>
              </div>

              <div className="gi-actions">
                <button
                  className="btn primary sm"
                  onClick={() => onWater(plant.id)}
                  title="Mark as watered and reset the schedule"
                >
                  💧 Water now
                </button>
                <button
                  className="btn ghost sm danger"
                  onClick={() => onRemove(plant.id)}
                  aria-label={`Remove ${plant.nickname}`}
                  title="Remove from garden"
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
