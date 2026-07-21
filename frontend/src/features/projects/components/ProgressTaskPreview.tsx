import { Check, Circle, ListTodo, Target } from "lucide-react";
import { getGoalTasks, getTaskProgress } from "../projectModel";
import type { ProjectFocus, ProjectTask } from "../types";
import type { ProgressRingSelection } from "./ProgressRings";

interface ProgressTaskPreviewProps {
  focuses: ProjectFocus[];
  projectGoal: string;
  selectedFocusId: string | null;
  selection: ProgressRingSelection;
  tasks: ProjectTask[];
}

export function ProgressTaskPreview({
  focuses,
  projectGoal,
  selectedFocusId,
  selection,
  tasks,
}: ProgressTaskPreviewProps) {
  const activeFocus = focuses.find((focus) => focus.status === "active") ?? null;
  const selectedFocus =
    focuses.find((focus) => focus.id === selectedFocusId) ?? activeFocus ?? null;
  const visibleTasks =
    selection === "goal"
      ? getGoalTasks(focuses, tasks)
      : selectedFocus
        ? tasks.filter((task) => task.focusId === selectedFocus.id)
        : [];
  const progress = getTaskProgress(visibleTasks);
  const visibleFocuses =
    selection === "goal"
      ? focuses.filter((focus) => visibleTasks.some((task) => task.focusId === focus.id))
      : selectedFocus
        ? [selectedFocus]
        : [];
  const label =
    selection === "goal"
      ? "Main project goal"
      : selectedFocus?.status === "active"
        ? "Active focus"
        : "Previous focus";
  const title =
    selection === "goal"
      ? projectGoal || "Add what this application should achieve."
      : selectedFocus?.title || "Start a focus to define the current outcome.";

  return (
    <>
      <section className="progress-task-preview__summary" aria-live="polite">
        <div>
          <span>{label}</span>
          <h3>{title}</h3>
        </div>
        <strong aria-label={`${progress.percent}% complete`}>{progress.percent}%</strong>
        <p>
          {progress.completed} of {progress.total} tasks complete
        </p>
      </section>

      <div className="progress-task-preview" aria-label="Tasks determining selected progress">
        <div className="progress-task-preview__heading">
          <span>
            <ListTodo size={13} /> Progress inputs
          </span>
          <small>View only</small>
        </div>

        {visibleTasks.length === 0 ? (
          <div className="progress-task-preview__empty">
            <Target size={18} />
            <strong>No tasks shape this ring yet</strong>
            <p>Add tasks in the editable list below.</p>
          </div>
        ) : (
          <div className="progress-task-preview__groups">
            {visibleFocuses.map((focus) => {
              const focusTasks = visibleTasks.filter((task) => task.focusId === focus.id);
              const focusProgress = getTaskProgress(focusTasks);
              return (
                <section className="progress-task-preview__group" key={focus.id}>
                  {selection === "goal" && (
                    <header>
                      <h4>{focus.title}</h4>
                      <small>
                        {focusProgress.completed}/{focusProgress.total}
                      </small>
                    </header>
                  )}
                  <ul>
                    {focusTasks.map((task) => (
                      <li className={task.completed ? "is-completed" : ""} key={task.id}>
                        <span aria-hidden="true">
                          {task.completed ? <Check size={12} /> : <Circle size={12} />}
                        </span>
                        <span>{task.title}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
