import { CheckCircle2, CircleAlert, Sparkles, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { featureStatusLabels } from "../projectModel";
import type {
  CommitAnalysis,
  FeatureStatus,
  ProjectFeature,
  ProjectTask,
  ReviewCommitAnalysisInput,
} from "../types";

interface CommitAnalysisPanelProps {
  analysis: CommitAnalysis;
  projectId: string;
  tasks: ProjectTask[];
  features: ProjectFeature[];
  onReview: (input: ReviewCommitAnalysisInput) => Promise<void>;
}

export function CommitAnalysisPanel({
  analysis,
  projectId,
  tasks,
  features,
  onReview,
}: CommitAnalysisPanelProps) {
  const [taskId, setTaskId] = useState(analysis.taskSuggestion?.taskId ?? "");
  const [completeTask, setCompleteTask] = useState(Boolean(analysis.taskSuggestion));
  const [featureId, setFeatureId] = useState(analysis.featureSuggestion?.featureId ?? "");
  const [featureStatus, setFeatureStatus] = useState<FeatureStatus>(
    analysis.featureSuggestion?.status ?? "in_progress",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const review = async (action: "accept" | "reject", event?: FormEvent) => {
    event?.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onReview({
        projectId,
        commitHash: analysis.commitHash,
        action,
        taskId: action === "accept" && taskId ? taskId : null,
        completeTask: action === "accept" && completeTask && Boolean(taskId),
        featureId: action === "accept" && featureId ? featureId : null,
        featureStatus: action === "accept" && featureId ? featureStatus : null,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="commit-analysis" aria-label="AI commit analysis">
      <header>
        <span>
          <Sparkles size={14} /> AI proposal
        </span>
        <small>{analysis.model}</small>
      </header>
      <div className="commit-analysis__summary">
        <AnalysisPoint label="What changed?" value={analysis.whatChanged} />
        <AnalysisPoint label="What can you do now?" value={analysis.nowPossible} />
        <AnalysisPoint
          caution
          label="What should you watch?"
          value={analysis.caution || "No specific risk found in the supplied commit evidence."}
        />
        <AnalysisPoint label="Focus impact" value={analysis.focusImpact} />
        <AnalysisPoint label="Big-goal impact" value={analysis.goalImpact} />
      </div>

      {analysis.reviewStatus === "pending" ? (
        <form
          className="commit-analysis__review"
          onSubmit={(event) => void review("accept", event)}
        >
          <p>Edit the relationships before applying them. Nothing changes until approval.</p>
          <label>
            <span>Related task</span>
            <select value={taskId} onChange={(event) => setTaskId(event.target.value)}>
              <option value="">No task update</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </label>
          {taskId && (
            <label className="commit-analysis__check">
              <input
                checked={completeTask}
                type="checkbox"
                onChange={(event) => setCompleteTask(event.target.checked)}
              />
              <span>Mark this task complete</span>
            </label>
          )}
          {analysis.taskSuggestion && <small>{analysis.taskSuggestion.reason}</small>}
          <div className="commit-analysis__feature-fields">
            <label>
              <span>Related feature</span>
              <select value={featureId} onChange={(event) => setFeatureId(event.target.value)}>
                <option value="">No feature update</option>
                {features.map((feature) => (
                  <option key={feature.id} value={feature.id}>
                    {feature.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>New status</span>
              <select
                disabled={!featureId}
                value={featureStatus}
                onChange={(event) => setFeatureStatus(event.target.value as FeatureStatus)}
              >
                {Object.entries(featureStatusLabels).map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {analysis.featureSuggestion && <small>{analysis.featureSuggestion.reason}</small>}
          {error && <p role="alert">{error}</p>}
          <div className="commit-analysis__actions">
            <button
              className="button button--ghost button--small"
              disabled={saving}
              onClick={() => void review("reject")}
              type="button"
            >
              <X size={14} /> Reject
            </button>
            <button
              className="button button--primary button--small"
              disabled={saving}
              type="submit"
            >
              <CheckCircle2 size={14} /> {saving ? "Applying…" : "Approve updates"}
            </button>
          </div>
        </form>
      ) : (
        <p className={`commit-analysis__reviewed is-${analysis.reviewStatus}`}>
          {analysis.reviewStatus === "accepted" ? (
            <CheckCircle2 size={15} />
          ) : (
            <CircleAlert size={15} />
          )}
          Proposal {analysis.reviewStatus}.{" "}
          {analysis.reviewStatus === "accepted" && "Approved updates moved the project state."}
        </p>
      )}
    </section>
  );
}

function AnalysisPoint({
  label,
  value,
  caution = false,
}: {
  label: string;
  value: string;
  caution?: boolean;
}) {
  return (
    <div className={caution ? "is-caution" : ""}>
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}
