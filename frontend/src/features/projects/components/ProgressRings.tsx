import { Orbit } from "lucide-react";
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

export function ProgressRings({
  features,
  focuses,
  tasks,
  selectedFocusId,
  selected,
  onSelect,
  onSelectFocus,
}: ProgressRingsProps) {
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

  const focusRings = visibleFocuses.map((focus, index) => {
    const radius =
      visibleFocuses.length === 1
        ? singleFocusRadius
        : outerFocusRadius - (visibleFocuses.length - 1 - index) * focusSpacing;
    const focusTasks = tasks.filter((task) => task.focusId === focus.id);
    const completed = focusTasks.filter((task) => task.completed).length;
    const percent = focusTasks.length === 0 ? 0 : Math.round((completed / focusTasks.length) * 100);
    return { focus, percent, radius };
  });

  return (
    <div
      className={`progress-rings progress-rings--${selected} ${focusRings.length > 1 ? "progress-rings--multiple" : ""}`}
    >
      <svg aria-hidden="true" viewBox="0 0 220 220">
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
        {[...focusRings].reverse().map(({ focus, percent, radius }) => {
          const circumference = 2 * Math.PI * radius;
          const selectedClass = focus.id === selectedFocus?.id ? "is-selected" : "";
          return (
            <g key={focus.id}>
              <circle
                className={`progress-rings__focus-track progress-rings__focus-track--${focus.status}`}
                cx="110"
                cy="110"
                r={radius}
              />
              <circle
                className={`progress-rings__focus-value progress-rings__focus-value--${focus.status} ${selectedClass}`}
                cx="110"
                cy="110"
                r={radius}
                strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
              />
            </g>
          );
        })}
      </svg>
      <button
        aria-label="Show main goal progress"
        aria-pressed={selected === "features"}
        className="progress-rings__hit progress-rings__hit--outer"
        onClick={() => onSelect("features")}
        type="button"
      />
      {focusRings.map(({ focus, radius }, index) => (
        <button
          key={focus.id}
          aria-label={`Show ${focus.status === "active" ? "active" : "previous"} focus ${focus.title}`}
          aria-pressed={selected === "focus" && selectedFocus?.id === focus.id}
          className="progress-rings__hit progress-rings__hit--focus"
          onClick={() => {
            onSelectFocus(focus.id);
            onSelect("focus");
          }}
          style={{
            width: radius * 2 + 10,
            height: radius * 2 + 10,
            zIndex: focusRings.length - index + 1,
          }}
          type="button"
        />
      ))}
      <div className="progress-rings__core">
        <Orbit size={23} />
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
