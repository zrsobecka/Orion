import { useState, type KeyboardEvent } from "react";
import { getGoalTasks, getTaskProgress } from "../projectModel";
import type { ProjectFocus, ProjectTask } from "../types";

export type ProgressRingSelection = "goal" | "focus";

interface ProgressRingsProps {
  focuses: ProjectFocus[];
  tasks: ProjectTask[];
  selectedFocusId: string | null;
  selected: ProgressRingSelection;
  onSelect: (selection: ProgressRingSelection) => void;
  onSelectFocus: (focusId: string) => void;
}

const outerRadius = 98;
const singleFocusRadius = 68;
const outerFocusRadius = 82;
const innerFocusRadius = 56;
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
  focuses,
  tasks,
  selectedFocusId,
  selected,
  onSelect,
  onSelectFocus,
}: ProgressRingsProps) {
  const [hoveredRing, setHoveredRing] = useState<"goal" | string | null>(null);
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
  const focusPercent = getTaskProgress(selectedFocusTasks).percent;
  const goalTasks = getGoalTasks(focuses, tasks);
  const goalPercent = getTaskProgress(goalTasks).percent;
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
    const percent = getTaskProgress(focusTasks).percent;
    return {
      focus,
      percent,
      radius,
      tone: focusToneById.get(focus.id) ?? focusRingTones[0],
    };
  });

  return (
    <div
      className={`progress-rings progress-rings--${selected} ${hoveredRing === "goal" ? "is-goal-hovered" : ""} ${focusRings.length > 1 ? "progress-rings--multiple" : ""}`}
    >
      <svg aria-label="Project goal and focus progress rings" role="group" viewBox="0 0 220 220">
        <circle className="progress-rings__goal-track" cx="110" cy="110" r={outerRadius} />
        {goalPercent > 0 && (
          <circle
            className="progress-rings__goal-value"
            cx="110"
            cy="110"
            r={outerRadius}
            strokeDasharray={`${(goalPercent / 100) * outerCircumference} ${outerCircumference}`}
          />
        )}
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
          aria-pressed={selected === "goal"}
          className="progress-rings__ring-hit progress-rings__ring-hit--outer"
          cx="110"
          cy="110"
          onBlur={() => setHoveredRing(null)}
          onClick={() => onSelect("goal")}
          onFocus={() => setHoveredRing("goal")}
          onKeyDown={(event) => activateRingWithKeyboard(event, () => onSelect("goal"))}
          onMouseEnter={() => setHoveredRing("goal")}
          onMouseLeave={() => setHoveredRing(null)}
          r={outerRadius}
          role="button"
          strokeWidth="16"
          tabIndex={0}
        >
          <title>{`Main goal · ${goalPercent}% complete`}</title>
        </circle>
      </svg>
      <span className="sr-only" aria-live="polite">
        {selected === "goal"
          ? `Main goal is ${goalPercent}% complete`
          : `${selectedFocus?.title ?? "Selected focus"} is ${focusPercent}% complete`}
      </span>
    </div>
  );
}
