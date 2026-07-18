import { Orbit } from "lucide-react";
import type { ProjectFeature, ProjectTask } from "../types";

export type ProgressRingSelection = "features" | "focus";

interface ProgressRingsProps {
  features: ProjectFeature[];
  focusTasks: ProjectTask[];
  selected: ProgressRingSelection;
  onSelect: (selection: ProgressRingSelection) => void;
}

const outerRadius = 88;
const innerRadius = 66;
const outerCircumference = 2 * Math.PI * outerRadius;
const innerCircumference = 2 * Math.PI * innerRadius;

export function ProgressRings({ features, focusTasks, selected, onSelect }: ProgressRingsProps) {
  const completedTasks = focusTasks.filter((task) => task.completed).length;
  const focusPercent =
    focusTasks.length === 0 ? 0 : Math.round((completedTasks / focusTasks.length) * 100);
  const segmentLength = features.length === 0 ? 0 : outerCircumference / features.length;
  const segmentGap = Math.min(5, segmentLength * 0.16);

  return (
    <div className={`progress-rings progress-rings--${selected}`}>
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
        <circle className="progress-rings__focus-track" cx="110" cy="110" r={innerRadius} />
        <circle
          className="progress-rings__focus-value"
          cx="110"
          cy="110"
          r={innerRadius}
          strokeDasharray={`${(focusPercent / 100) * innerCircumference} ${innerCircumference}`}
        />
      </svg>
      <button
        aria-label="Show feature progress"
        aria-pressed={selected === "features"}
        className="progress-rings__hit progress-rings__hit--outer"
        onClick={() => onSelect("features")}
        type="button"
      />
      <button
        aria-label="Show active focus progress"
        aria-pressed={selected === "focus"}
        className="progress-rings__hit progress-rings__hit--inner"
        onClick={() => onSelect("focus")}
        type="button"
      />
      <div className="progress-rings__core">
        <Orbit size={23} />
        <small>{selected === "features" ? "Features" : "Active focus"}</small>
        <strong>{selected === "features" ? features.length : `${focusPercent}%`}</strong>
      </div>
    </div>
  );
}
