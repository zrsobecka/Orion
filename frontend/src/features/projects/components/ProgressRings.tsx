import { useState, type KeyboardEvent } from "react";
import type { ProjectFeature, ProjectFocus, ProjectTask } from "../types";

export type ProgressRingSelection = "features" | "focus";

interface ProgressRingsProps {
  features: ProjectFeature[];
  focuses: ProjectFocus[];
  tasks: ProjectTask[];
  selectedFocusId: string | null;
  selected: ProgressRingSelection;
  onSelect: (selection: ProgressRingSelection) => void;
  onSelectFocus: (focusId: string) => void;
}

const outerRadius = 92;
const singleFocusRadius = 66;
const outerFocusRadius = 74;
const innerFocusRadius = 38;
const maxVisibleFocuses = 6;
const outerCircumference = 2 * Math.PI * outerRadius;
const focusRingTones = ["green", "cobalt", "violet", "teal", "sky", "indigo"] as const;

type FocusRingTone = (typeof focusRingTones)[number];

function activateRingWithKeyboard(event: KeyboardEvent<SVGCircleElement>, onActivate: () => void) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  onActivate();
}

export function ProgressRings({
  features,
  focuses,
  tasks,
  selectedFocusId,
  selected,
  onSelect,
  onSelectFocus,
}: ProgressRingsProps) {
  const [hoveredRing, setHoveredRing] = useState<"features" | string | null>(null);
  const selectedFocus =
    focuses.find((focus) => focus.id === selectedFocusId) ??
    focuses.find((focus) => focus.status === "active") ??
    null;
  const recentFocuses = focuses.slice(0, maxVisibleFocuses);
  const visibleFocuses =
    selectedFocus && !recentFocuses.some((focus) => focus.id === selectedFocus.id)
      ? [...recentFocuses.slice(0, -1), selectedFocus]
      : recentFocuses;
  const focusSpacing =
    visibleFocuses.length <= 1
      ? 0
      : (outerFocusRadius - innerFocusRadius) / (visibleFocuses.length - 1);
  const focusHitWidth =
    visibleFocuses.length <= 1 ? 16 : Math.max(6, Math.min(14, focusSpacing - 1));
  const selectedFocusTasks = selectedFocus
    ? tasks.filter((task) => task.focusId === selectedFocus.id)
    : [];
  const completedTasks = selectedFocusTasks.filter((task) => task.completed).length;
  const workingFeatures = features.filter((feature) => feature.status === "working").length;
  const focusPercent =
    selectedFocusTasks.length === 0
      ? 0
      : Math.round((completedTasks / selectedFocusTasks.length) * 100);
  const segmentLength = features.length === 0 ? 0 : outerCircumference / features.length;
  const segmentGap = Math.min(5, segmentLength * 0.16);
  const focusToneById = new Map(
    [...focuses]
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt))
      .map((focus, index) => [
        focus.id,
        focusRingTones[index % focusRingTones.length] as FocusRingTone,
      ]),
  );

  const focusRings = visibleFocuses.map((focus, index) => {
    const radius =
      visibleFocuses.length === 1
        ? singleFocusRadius
        : outerFocusRadius - (visibleFocuses.length - 1 - index) * focusSpacing;
    const focusTasks = tasks.filter((task) => task.focusId === focus.id);
    const completed = focusTasks.filter((task) => task.completed).length;
    const percent = focusTasks.length === 0 ? 0 : Math.round((completed / focusTasks.length) * 100);
    return {
      focus,
      percent,
      radius,
      tone: focusToneById.get(focus.id) ?? focusRingTones[0],
    };
  });

  return (
    <div
      className={`progress-rings progress-rings--${selected} ${hoveredRing === "features" ? "is-features-hovered" : ""} ${focusRings.length > 1 ? "progress-rings--multiple" : ""}`}
    >
      <svg aria-label="Project goal and focus progress rings" role="group" viewBox="0 0 220 220">
        <circle className="progress-rings__track" cx="110" cy="110" r={outerRadius} />
        {features.map((feature, index) => (
          <circle
            key={feature.id}
            className={`progress-rings__feature progress-rings__feature--${feature.status}`}
            cx="110"
            cy="110"
            r={outerRadius}
            strokeDasharray={`${Math.max(0, segmentLength - segmentGap)} ${outerCircumference}`}
            strokeDashoffset={-index * segmentLength}
          />
        ))}
        {[...focusRings].reverse().map(({ focus, percent, radius, tone }) => {
          const circumference = 2 * Math.PI * radius;
          const selectedClass = focus.id === selectedFocus?.id ? "is-selected" : "";
          const currentClass = focus.status === "active" ? "is-current-focus" : "";
          const hoveredClass = focus.id === hoveredRing ? "is-hovered" : "";
          return (
            <g
              className={`${selectedClass} ${currentClass} ${hoveredClass}`}
              data-focus-tone={tone}
              key={focus.id}
            >
              <circle
                className={`progress-rings__focus-track progress-rings__focus-track--${focus.status}`}
                cx="110"
                cy="110"
                r={radius}
              />
              {percent > 0 && (
                <circle
                  className={`progress-rings__focus-value progress-rings__focus-value--${focus.status}`}
                  cx="110"
                  cy="110"
                  r={radius}
                  strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
                />
              )}
              <circle
                aria-label={`Show ${focus.status === "active" ? "active" : "previous"} focus ${focus.title}`}
                aria-pressed={selected === "focus" && selectedFocus?.id === focus.id}
                className="progress-rings__ring-hit progress-rings__ring-hit--focus"
                cx="110"
                cy="110"
                data-focus-id={focus.id}
                onBlur={() => setHoveredRing(null)}
                onClick={() => {
                  onSelectFocus(focus.id);
                  onSelect("focus");
                }}
                onFocus={() => setHoveredRing(focus.id)}
                onKeyDown={(event) =>
                  activateRingWithKeyboard(event, () => {
                    onSelectFocus(focus.id);
                    onSelect("focus");
                  })
                }
                onMouseEnter={() => setHoveredRing(focus.id)}
                onMouseLeave={() => setHoveredRing(null)}
                r={radius}
                role="button"
                strokeWidth={focusHitWidth}
                tabIndex={0}
              >
                <title>{`${focus.title} · ${percent}% complete`}</title>
              </circle>
            </g>
          );
        })}
        <circle
          aria-label="Show main goal progress"
          aria-pressed={selected === "features"}
          className="progress-rings__ring-hit progress-rings__ring-hit--outer"
          cx="110"
          cy="110"
          onBlur={() => setHoveredRing(null)}
          onClick={() => onSelect("features")}
          onFocus={() => setHoveredRing("features")}
          onKeyDown={(event) => activateRingWithKeyboard(event, () => onSelect("features"))}
          onMouseEnter={() => setHoveredRing("features")}
          onMouseLeave={() => setHoveredRing(null)}
          r={outerRadius}
          role="button"
          strokeWidth="16"
          tabIndex={0}
        >
          <title>Show main goal progress</title>
        </circle>
      </svg>
      <div className="progress-rings__core">
        <small>
          {selected === "features"
            ? "Main goal"
            : selectedFocus?.status === "active"
              ? "Active focus"
              : "Previous focus"}
        </small>
        <strong>
          {selected === "features" ? `${workingFeatures}/${features.length}` : `${focusPercent}%`}
        </strong>
      </div>
    </div>
  );
}
