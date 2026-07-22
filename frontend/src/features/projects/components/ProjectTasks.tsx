import { Archive, Check, Circle, Crosshair, Plus, Trash2, Zap } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { getGoalTasks, getTaskProgress } from "../projectModel";
import type {
  AddProjectTaskInput,
  ProjectFeature,
  ProjectFocus,
  ProjectTask,
  StartProjectFocusInput,
} from "../types";

interface ProjectTasksProps {
  projectId: string;
  projectGoal: string;
  features: ProjectFeature[];
  focuses: ProjectFocus[];
  tasks: ProjectTask[];
  selectedFocusId: string | null;
  selectedScope: "goal" | "focus";
  onSelectGoal: () => void;
  onSelectFocus: (focusId: string) => void;
  onAdd: (input: AddProjectTaskInput) => Promise<void>;
  onSetCompleted: (taskId: string, completed: boolean) => Promise<void>;
  onRemove: (taskId: string) => Promise<void>;
  onStartFocus: (input: StartProjectFocusInput) => Promise<void>;
}

export function ProjectTasks({
  projectId,
  projectGoal,
  features,
  focuses,
  tasks,
  selectedFocusId,
  selectedScope,
  onSelectGoal,
  onSelectFocus,
  onAdd,
  onSetCompleted,
  onRemove,
  onStartFocus,
}: ProjectTasksProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFocusForm, setShowFocusForm] = useState(false);
  const [startingFocus, setStartingFocus] = useState(false);
  const activeFocus = focuses.find((focus) => focus.status === "active") ?? null;
  const selectedFocus =
    focuses.find((focus) => focus.id === selectedFocusId) ?? activeFocus ?? null;
  const selectedTasks =
    selectedScope === "goal"
      ? getGoalTasks(focuses, tasks)
      : selectedFocus
        ? tasks.filter((task) => task.focusId === selectedFocus.id)
        : [];
  const progress = getTaskProgress(selectedTasks);
  const selectedTitle =
    selectedScope === "goal"
      ? projectGoal || "Main project goal"
      : selectedFocus?.title || "Choose a project focus";

  const startFocus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const title = String(new FormData(form).get("focusTitle") || "").trim();
    if (!title) return;
    setStartingFocus(true);
    setError(null);
    try {
      await onStartFocus({ projectId, title });
      form.reset();
      setShowFocusForm(false);
      inputRef.current?.focus();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setStartingFocus(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("taskTitle") || "").trim();
    if (!title) return;

    setAdding(true);
    setError(null);
    try {
      const featureId = String(data.get("featureId") || "").trim() || null;
      await onAdd({ projectId, featureId, title });
      form.reset();
      inputRef.current?.focus();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setAdding(false);
    }
  };

  const runTaskAction = async (taskId: string, action: () => Promise<void>) => {
    setBusyTaskId(taskId);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusyTaskId(null);
    }
  };

  return (
    <section className="task-console" aria-labelledby="project-tasks-title">
      <header className="task-console__header">
        <div>
          <p className="eyebrow">
            <Zap size={13} /> Manual flight plan
          </p>
          <h2 id="project-tasks-title">{selectedTitle}</h2>
        </div>
        <div className="task-console__header-actions">
          {(selectedScope === "goal" || selectedFocus) && (
            <span className="task-console__count">
              {progress.completed}/{progress.total} done
            </span>
          )}
          <button
            className="button button--secondary button--small"
            onClick={() => setShowFocusForm((visible) => !visible)}
            type="button"
          >
            <Crosshair size={14} /> {activeFocus ? "New focus" : "Start focus"}
          </button>
        </div>
      </header>

      {(showFocusForm || !activeFocus) && (
        <form className="focus-composer" onSubmit={startFocus}>
          <label htmlFor="project-focus-title">What are you trying to achieve now?</label>
          <div>
            <input
              id="project-focus-title"
              maxLength={200}
              name="focusTitle"
              placeholder="e.g. Make project resume fast and reliable"
              required
            />
            <button className="button button--primary button--small" disabled={startingFocus}>
              {startingFocus ? "Starting…" : "Start"}
            </button>
          </div>
          {activeFocus && <small>The current focus and its tasks will stay in history.</small>}
        </form>
      )}

      {focuses.length > 0 && (
        <div className="task-console__history">
          <span>
            <Archive size={13} /> View plan
          </span>
          <label className="task-console__focus-switcher">
            <span className="sr-only">View task scope</span>
            <select
              aria-label="View task scope"
              onChange={(event) => {
                if (event.target.value === "goal") {
                  onSelectGoal();
                  return;
                }
                onSelectFocus(event.target.value);
              }}
              value={selectedScope === "goal" ? "goal" : (selectedFocus?.id ?? "goal")}
            >
              <option value="goal">Main goal · all focus tasks</option>
              {focuses.map((focus) => (
                <option key={focus.id} value={focus.id}>
                  {focus.title} · {focus.status === "active" ? "active" : "previous"}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {activeFocus && (selectedScope === "goal" || selectedFocus?.status === "active") && (
        <form className="task-composer" onSubmit={submit}>
          <label className="sr-only" htmlFor="project-task-title">
            New task
          </label>
          <input
            ref={inputRef}
            id="project-task-title"
            maxLength={200}
            name="taskTitle"
            placeholder="Add something you want to do…"
            required
          />
          <label className="task-composer__feature">
            <span className="sr-only">Related feature</span>
            <select aria-label="Related feature" defaultValue="" name="featureId">
              <option value="">No feature</option>
              {features.map((feature) => (
                <option key={feature.id} value={feature.id}>
                  {feature.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button button--primary task-composer__submit" disabled={adding}>
            <Plus size={16} />
            {adding ? "Adding…" : "Add"}
          </button>
          {selectedScope === "goal" && (
            <small className="task-composer__scope-note">
              New tasks join the active focus: {activeFocus.title}
            </small>
          )}
        </form>
      )}

      {error && (
        <p className="task-console__error" role="alert">
          {error}
        </p>
      )}

      {!activeFocus ? (
        <div className="task-console__empty">
          <span className="task-console__empty-orbit">
            <Crosshair size={18} />
          </span>
          <strong>Start with one clear outcome</strong>
          <p>Tasks added afterward will measure only this focus, not the whole project.</p>
        </div>
      ) : selectedTasks.length === 0 ? (
        <div className="task-console__empty">
          <span className="task-console__empty-orbit">
            <Circle size={18} />
          </span>
          <strong>Your flight plan is empty</strong>
          <p>
            {selectedScope === "goal"
              ? "Add the first task that contributes to this goal."
              : selectedFocus?.status === "active"
                ? "Add the first thing you want to remember for this project."
                : "No tasks were saved in this previous focus."}
          </p>
        </div>
      ) : (
        <div className="task-list">
          {selectedTasks.map((task) => {
            const busy = busyTaskId === task.id;
            const taskFocus = focuses.find((focus) => focus.id === task.focusId);
            const taskFeature = features.find((feature) => feature.id === task.featureId);
            const taskContext = [
              selectedScope === "goal" ? taskFocus?.title : null,
              taskFeature?.name,
            ].filter((value): value is string => Boolean(value));
            return (
              <article
                key={task.id}
                className={`task-item ${task.completed ? "is-completed" : ""}`}
              >
                <button
                  aria-label={task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`}
                  aria-pressed={task.completed}
                  className="task-item__toggle"
                  disabled={busy}
                  onClick={() =>
                    void runTaskAction(task.id, () => onSetCompleted(task.id, !task.completed))
                  }
                  type="button"
                >
                  {task.completed ? <Check size={15} /> : <Circle size={15} />}
                </button>
                <span className="task-item__content">
                  <span>{task.title}</span>
                  {taskContext.length > 0 && <small>{taskContext.join(" · ")}</small>}
                </span>
                <button
                  aria-label={`Remove ${task.title}`}
                  className="task-item__remove"
                  disabled={busy}
                  onClick={() => void runTaskAction(task.id, () => onRemove(task.id))}
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
