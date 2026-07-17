import { Check, Circle, Plus, Trash2, Zap } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import type { AddProjectTaskInput, ProjectTask } from "../types";

interface ProjectTasksProps {
  projectId: string;
  tasks: ProjectTask[];
  onAdd: (input: AddProjectTaskInput) => Promise<void>;
  onSetCompleted: (taskId: string, completed: boolean) => Promise<void>;
  onRemove: (taskId: string) => Promise<void>;
}

export function ProjectTasks({
  projectId,
  tasks,
  onAdd,
  onSetCompleted,
  onRemove,
}: ProjectTasksProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const completedCount = tasks.filter((task) => task.completed).length;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("taskTitle") || "").trim();
    if (!title) return;

    setAdding(true);
    setError(null);
    try {
      await onAdd({ projectId, title });
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
          <h2 id="project-tasks-title">Project tasks</h2>
        </div>
        <span className="task-console__count">
          {completedCount}/{tasks.length} done
        </span>
      </header>

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
        <button className="button button--primary task-composer__submit" disabled={adding}>
          <Plus size={16} />
          {adding ? "Adding…" : "Add"}
        </button>
      </form>

      {error && (
        <p className="task-console__error" role="alert">
          {error}
        </p>
      )}

      {tasks.length === 0 ? (
        <div className="task-console__empty">
          <span className="task-console__empty-orbit">
            <Circle size={18} />
          </span>
          <strong>Your flight plan is empty</strong>
          <p>Add the first thing you want to remember for this project.</p>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map((task) => {
            const busy = busyTaskId === task.id;
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
                <span>{task.title}</span>
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
