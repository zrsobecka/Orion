import { Check, Flag, GitBranch, Radio, Sparkles } from "lucide-react";
import type { ProjectFeature, ProjectFocus } from "../types";

interface MissionPathProps {
  features: ProjectFeature[];
  focuses: ProjectFocus[];
  selectedFocusId: string | null;
  onSelectFocus: (focusId: string) => void;
}

const priorityOrder = { now: 0, next: 1, later: 2 } as const;

export function MissionPath({
  features,
  focuses,
  selectedFocusId,
  onSelectFocus,
}: MissionPathProps) {
  const activeFocus = focuses.find((focus) => focus.status === "active") ?? null;
  const previousFocuses = focuses
    .filter((focus) => focus.status === "archived")
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .slice(-2);
  const futureFeatures = [...features]
    .filter((feature) => feature.status !== "working" && feature.priority !== "now")
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 2);

  return (
    <div className="mission-path" aria-labelledby="mission-path-title">
      <div className="mission-path__heading">
        <span id="mission-path-title">
          <GitBranch size={13} /> Route travelled
        </span>
        <small>Focus history → current outcome → possible branches</small>
      </div>
      <ol className="mission-path__track">
        {previousFocuses.map((focus) => (
          <li className="mission-path__step mission-path__step--previous" key={focus.id}>
            <button
              aria-pressed={selectedFocusId === focus.id}
              className={selectedFocusId === focus.id ? "is-selected" : ""}
              onClick={() => onSelectFocus(focus.id)}
              type="button"
            >
              <span className="mission-path__node">
                <Check size={12} />
              </span>
              <span className="mission-path__copy">
                <small>Previous focus</small>
                <strong>{focus.title}</strong>
              </span>
            </button>
          </li>
        ))}
        <li className="mission-path__step mission-path__step--current">
          {activeFocus ? (
            <button
              aria-pressed={selectedFocusId === activeFocus.id}
              className={selectedFocusId === activeFocus.id ? "is-selected" : ""}
              onClick={() => onSelectFocus(activeFocus.id)}
              type="button"
            >
              <span className="mission-path__node">
                <Radio size={13} />
              </span>
              <span className="mission-path__copy">
                <small>Current focus</small>
                <strong>{activeFocus.title}</strong>
              </span>
            </button>
          ) : (
            <div className="mission-path__placeholder">
              <span className="mission-path__node">
                <Flag size={13} />
              </span>
              <span className="mission-path__copy">
                <small>Next waypoint</small>
                <strong>Start a focus</strong>
              </span>
            </div>
          )}
        </li>
        {futureFeatures.map((feature, index) => (
          <li className="mission-path__step mission-path__step--future" key={feature.id}>
            <div>
              <span className="mission-path__node">
                <Sparkles size={12} />
              </span>
              <span className="mission-path__copy">
                <small>{index === 0 ? "Possible next" : "Later branch"}</small>
                <strong>{feature.name}</strong>
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
