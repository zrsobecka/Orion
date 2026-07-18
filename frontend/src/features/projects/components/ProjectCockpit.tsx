import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  Clock3,
  FolderOpen,
  GitBranch,
  GitCommitHorizontal,
  Orbit,
  Pencil,
  Plus,
  Radio,
  Satellite,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { desktopRuntime } from "../../../infrastructure/desktop-runtime";
import { Modal } from "../../../shared/ui/Modal";
import { featureStatusLabels, formatRelativeTime, getFeatureCounts } from "../projectModel";
import type {
  AcceptFeatureSuggestionsInput,
  AddFeatureInput,
  AddProjectTaskInput,
  FeatureAnalysisResult,
  FeaturePriority,
  FeatureSuggestion,
  FeatureStatus,
  ProjectSnapshot,
  ProjectStatus,
  UpdateProjectInput,
} from "../types";
import { FeatureSuggestionsModal } from "./FeatureSuggestionsModal";
import { ProjectTasks } from "./ProjectTasks";

interface ProjectCockpitProps {
  snapshot: ProjectSnapshot;
  onBack: () => void;
  onRefresh: () => void;
  onUpdateProject: (input: UpdateProjectInput) => Promise<void>;
  onAddFeature: (input: AddFeatureInput) => Promise<void>;
  onAnalyzeFeatures: (projectId: string) => Promise<FeatureAnalysisResult>;
  onAcceptFeatureSuggestions: (input: AcceptFeatureSuggestionsInput) => Promise<void>;
  onAddProjectTask: (input: AddProjectTaskInput) => Promise<void>;
  onSetProjectTaskCompleted: (taskId: string, completed: boolean) => Promise<void>;
  onRemoveProjectTask: (taskId: string) => Promise<void>;
  onUpdateFeatureStatus: (featureId: string, status: FeatureStatus) => void;
  onRemoveProject: (projectId: string) => Promise<void>;
}

const priorityOrder: Record<FeaturePriority, number> = { now: 0, next: 1, later: 2 };

export function ProjectCockpit({
  snapshot,
  onBack,
  onRefresh,
  onUpdateProject,
  onAddFeature,
  onAnalyzeFeatures,
  onAcceptFeatureSuggestions,
  onAddProjectTask,
  onSetProjectTaskCompleted,
  onRemoveProjectTask,
  onUpdateFeatureStatus,
  onRemoveProject,
}: ProjectCockpitProps) {
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showFeatureSuggestions, setShowFeatureSuggestions] = useState(false);
  const [featureAnalysis, setFeatureAnalysis] = useState<FeatureAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyzingFeatures, setAnalyzingFeatures] = useState(false);
  const [savingSuggestions, setSavingSuggestions] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const counts = getFeatureCounts(snapshot);
  const openTaskCount = snapshot.tasks.filter((task) => !task.completed).length;
  const features = useMemo(
    () =>
      [...snapshot.features].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]),
    [snapshot.features],
  );

  const analyzeFeatures = async () => {
    setShowFeatureSuggestions(true);
    setFeatureAnalysis(null);
    setAnalysisError(null);
    setAnalyzingFeatures(true);
    try {
      setFeatureAnalysis(await onAnalyzeFeatures(snapshot.project.id));
    } catch (caught) {
      setAnalysisError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setAnalyzingFeatures(false);
    }
  };

  const acceptSuggestions = async (suggestions: FeatureSuggestion[]) => {
    setSavingSuggestions(true);
    setAnalysisError(null);
    try {
      await onAcceptFeatureSuggestions({ projectId: snapshot.project.id, suggestions });
      setShowFeatureSuggestions(false);
    } catch (caught) {
      setAnalysisError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSavingSuggestions(false);
    }
  };

  return (
    <div className="workspace-view cockpit-view">
      <header className="cockpit-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={16} /> Overview
        </button>
        <div className="cockpit-header__main">
          <div>
            <div className="cockpit-header__title-row">
              <h1>{snapshot.project.name}</h1>
              <span className={`status-pill status-pill--${snapshot.project.status}`}>
                {snapshot.project.status}
              </span>
            </div>
            <p className="repo-path" title={snapshot.project.path}>
              {snapshot.project.path}
            </p>
          </div>
          <div className="cockpit-header__actions">
            <button
              className="button button--secondary"
              onClick={() => desktopRuntime.openProjectFolder(snapshot.project.path)}
            >
              <FolderOpen size={16} /> Open folder
            </button>
            <button className="button button--secondary" onClick={() => setShowProjectModal(true)}>
              <Pencil size={16} /> Edit project
            </button>
          </div>
        </div>
      </header>

      <div className="mission-deck">
        <MissionOrbit
          openTaskCount={openTaskCount}
          snapshot={snapshot}
          workingFeatureCount={counts.working}
        />
        <ProjectTasks
          projectId={snapshot.project.id}
          tasks={snapshot.tasks}
          onAdd={onAddProjectTask}
          onRemove={onRemoveProjectTask}
          onSetCompleted={onSetProjectTaskCompleted}
        />
      </div>

      <div className="cockpit-grid">
        <main className="cockpit-main">
          <section className="panel feature-panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Capability map</p>
                <h2>Features</h2>
              </div>
              <div className="panel__header-actions">
                <button
                  className="button button--secondary button--small"
                  disabled={analyzingFeatures}
                  onClick={() => void analyzeFeatures()}
                >
                  <Sparkles size={16} />
                  {analyzingFeatures ? "Scanning…" : "Scan repository"}
                </button>
                <button
                  className="button button--primary button--small"
                  onClick={() => setShowFeatureModal(true)}
                >
                  <Plus size={16} /> Add feature
                </button>
              </div>
            </div>
            <div className="feature-summary" aria-label="Feature status summary">
              <FeatureSummary label="Working" value={counts.working} tone="working" />
              <FeatureSummary label="In progress" value={counts.in_progress} tone="in_progress" />
              <FeatureSummary label="Planned" value={counts.planned} tone="planned" />
              <FeatureSummary label="Blocked" value={counts.blocked} tone="blocked" />
            </div>

            {features.length === 0 ? (
              <div className="panel-empty">
                <CircleDot size={24} />
                <h3>No features mapped yet</h3>
                <p>Add capabilities you can later mark as working, blocked, or still planned.</p>
                <button
                  className="button button--secondary"
                  onClick={() => setShowFeatureModal(true)}
                >
                  <Plus size={16} /> Add the first feature
                </button>
              </div>
            ) : (
              <div className="feature-list">
                {features.map((feature) => (
                  <article key={feature.id} className="feature-row">
                    <span className={`feature-row__marker feature-row__marker--${feature.status}`}>
                      {feature.status === "working" ? (
                        <CheckCircle2 size={16} />
                      ) : feature.status === "blocked" ? (
                        <AlertTriangle size={16} />
                      ) : feature.status === "in_progress" ? (
                        <Radio size={16} />
                      ) : (
                        <Clock3 size={16} />
                      )}
                    </span>
                    <div className="feature-row__content">
                      <div className="feature-row__title">
                        <h3>{feature.name}</h3>
                        <span className={`priority-tag priority-tag--${feature.priority}`}>
                          {feature.priority}
                        </span>
                      </div>
                      {feature.description && <p>{feature.description}</p>}
                      {feature.evidence && (
                        <small>
                          <span>Evidence</span> {feature.evidence}
                        </small>
                      )}
                    </div>
                    <label className="status-select">
                      <span className="sr-only">Status for {feature.name}</span>
                      <select
                        value={feature.status}
                        onChange={(event) =>
                          onUpdateFeatureStatus(feature.id, event.target.value as FeatureStatus)
                        }
                      >
                        {Object.entries(featureStatusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="cockpit-telemetry">
          <GitTelemetry snapshot={snapshot} onRefresh={onRefresh} />
        </aside>
      </div>

      {showFeatureModal && (
        <FeatureModal
          projectId={snapshot.project.id}
          onClose={() => setShowFeatureModal(false)}
          onSubmit={async (input) => {
            await onAddFeature(input);
            setShowFeatureModal(false);
          }}
        />
      )}
      {showFeatureSuggestions && (
        <FeatureSuggestionsModal
          analysis={featureAnalysis}
          error={analysisError}
          loading={analyzingFeatures}
          saving={savingSuggestions}
          onAccept={acceptSuggestions}
          onClose={() => setShowFeatureSuggestions(false)}
          onRetry={() => void analyzeFeatures()}
        />
      )}
      {showProjectModal && (
        <ProjectModal
          snapshot={snapshot}
          onClose={() => setShowProjectModal(false)}
          onRemove={() => {
            setShowProjectModal(false);
            setShowRemoveModal(true);
          }}
          onSubmit={async (input) => {
            await onUpdateProject(input);
            setShowProjectModal(false);
          }}
        />
      )}
      {showRemoveModal && (
        <RemoveProjectModal
          projectName={snapshot.project.name}
          onClose={() => setShowRemoveModal(false)}
          onConfirm={() => onRemoveProject(snapshot.project.id)}
        />
      )}
    </div>
  );
}

function MissionOrbit({
  snapshot,
  openTaskCount,
  workingFeatureCount,
}: {
  snapshot: ProjectSnapshot;
  openTaskCount: number;
  workingFeatureCount: number;
}) {
  return (
    <section className="mission-map" aria-labelledby="mission-orbit-title">
      <div aria-hidden="true" className="mission-map__starfield">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <header className="mission-map__header">
        <div>
          <p className="eyebrow">
            <Sparkles size={13} /> Visual command deck
          </p>
          <h2 id="mission-orbit-title">Mission orbit</h2>
        </div>
        <span className="mission-map__live">
          <i /> Live project map
        </span>
      </header>

      <div className="mission-map__canvas">
        <svg aria-hidden="true" className="mission-map__orbits" viewBox="0 0 620 340">
          <defs>
            <linearGradient id="orbit-energy" x1="0" x2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0" />
              <stop offset="0.5" stopColor="currentColor" stopOpacity="1" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <ellipse className="orbit-line orbit-line--one" cx="310" cy="170" rx="190" ry="82" />
          <ellipse
            className="orbit-line orbit-line--two"
            cx="310"
            cy="170"
            rx="218"
            ry="112"
            transform="rotate(-22 310 170)"
          />
          <ellipse
            className="orbit-line orbit-line--three"
            cx="310"
            cy="170"
            rx="226"
            ry="92"
            transform="rotate(30 310 170)"
          />
          <path
            className="orbit-energy"
            d="M84 242 C180 55 440 30 552 184 C598 246 510 319 370 286"
            stroke="url(#orbit-energy)"
          />
        </svg>

        <div className="mission-core">
          <span aria-hidden="true" className="mission-core__ring mission-core__ring--outer" />
          <span aria-hidden="true" className="mission-core__ring mission-core__ring--inner" />
          <span className="mission-core__icon">
            <Orbit size={26} />
          </span>
          <small>Project core</small>
          <strong>{snapshot.project.name}</strong>
        </div>

        <div className="orbit-node orbit-node--tasks">
          <span className="orbit-node__icon">
            <Target size={15} />
          </span>
          <div>
            <small>Open tasks</small>
            <strong>{openTaskCount.toString().padStart(2, "0")}</strong>
          </div>
        </div>
        <div className="orbit-node orbit-node--features">
          <span className="orbit-node__icon">
            <Radio size={15} />
          </span>
          <div>
            <small>Working features</small>
            <strong>{workingFeatureCount.toString().padStart(2, "0")}</strong>
          </div>
        </div>
        <div className="orbit-node orbit-node--git">
          <span className="orbit-node__icon">
            <Satellite size={15} />
          </span>
          <div>
            <small>Active branch</small>
            <strong>{snapshot.git.available ? snapshot.git.currentBranch : "Offline"}</strong>
          </div>
        </div>
      </div>

      <div className="mission-map__brief">
        <div>
          <span>Mission goal</span>
          <strong>{snapshot.project.goal || "Add what this application should achieve."}</strong>
        </div>
        <div>
          <span>Pinned focus</span>
          <strong>{snapshot.project.nextAction || "No focus note pinned."}</strong>
        </div>
      </div>
    </section>
  );
}

function FeatureSummary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: FeatureStatus;
}) {
  return (
    <div className={`feature-summary__item feature-summary__item--${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function GitTelemetry({
  snapshot,
  onRefresh,
}: {
  snapshot: ProjectSnapshot;
  onRefresh: () => void;
}) {
  const { git } = snapshot;
  if (!git.available) {
    return (
      <section className="panel telemetry-panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Repository signal</p>
            <h2>Git unavailable</h2>
          </div>
        </div>
        <div className="git-error">
          <AlertTriangle size={20} />
          <p>{git.error || "Orion could not read this repository."}</p>
          <button className="button button--secondary button--small" onClick={onRefresh}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="panel telemetry-panel">
        <div className="panel__header panel__header--compact">
          <div>
            <p className="eyebrow">Repository signal</p>
            <h2>Git telemetry</h2>
          </div>
          <span className={`sync-state ${git.isDirty ? "is-attention" : "is-clean"}`}>
            {git.isDirty ? `${git.modifiedFiles} changed` : "Clean"}
          </span>
        </div>
        <div className="branch-hero">
          <span className="signal-icon signal-icon--cyan">
            <GitBranch size={18} />
          </span>
          <div>
            <span>Current branch</span>
            <strong>{git.currentBranch}</strong>
            <small>
              {git.upstream || "No upstream"} · ↑{git.ahead} ↓{git.behind}
            </small>
          </div>
        </div>
        <div className="branch-list">
          {git.branches.slice(0, 4).map((branch) => (
            <div key={branch.name} className={branch.isCurrent ? "is-current" : ""}>
              <span className="branch-list__line" />
              <div>
                <strong>{branch.name}</strong>
                <small>{branch.shortHash}</small>
              </div>
              <time>{formatRelativeTime(branch.updatedAt)}</time>
            </div>
          ))}
        </div>
      </section>

      <section className="panel telemetry-panel commit-panel">
        <div className="panel__header panel__header--compact">
          <div>
            <p className="eyebrow">Latest changes</p>
            <h2>Recent commits</h2>
          </div>
          <GitCommitHorizontal size={18} />
        </div>
        {git.commits.length === 0 ? (
          <p className="subtle-copy">This repository has no commits yet.</p>
        ) : (
          <div className="commit-list">
            {git.commits.slice(0, 5).map((commit) => (
              <article key={commit.hash}>
                <span className="commit-list__node" />
                <div>
                  <strong>{commit.subject}</strong>
                  <p>
                    <code>{commit.shortHash}</code>
                    <span>{formatRelativeTime(commit.authoredAt)}</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function FeatureModal({
  projectId,
  onClose,
  onSubmit,
}: {
  projectId: string;
  onClose: () => void;
  onSubmit: (input: AddFeatureInput) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await onSubmit({
        projectId,
        name: String(form.get("name") || "").trim(),
        description: String(form.get("description") || "").trim(),
        status: String(form.get("status")) as FeatureStatus,
        priority: String(form.get("priority")) as FeaturePriority,
        evidence: String(form.get("evidence") || "").trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal eyebrow="Capability map" title="Add a feature" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label>
          <span>Feature name</span>
          <input
            autoFocus
            data-initial-focus
            maxLength={120}
            name="name"
            placeholder="e.g. Local model selection"
            required
          />
        </label>
        <label>
          <span>What outcome does it create?</span>
          <textarea
            maxLength={600}
            name="description"
            placeholder="Describe behavior, not implementation."
            rows={3}
          />
        </label>
        <div className="form-grid">
          <label>
            <span>Horizon</span>
            <select defaultValue="now" name="priority">
              <option value="now">Now</option>
              <option value="next">Next</option>
              <option value="later">Later</option>
            </select>
          </label>
          <label>
            <span>Status</span>
            <select defaultValue="planned" name="status">
              {Object.entries(featureStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span>Evidence or acceptance note</span>
          <textarea
            maxLength={600}
            name="evidence"
            placeholder="What proves this works, or what remains uncertain?"
            rows={2}
          />
        </label>
        <div className="modal__actions">
          <button className="button button--ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button button--primary" disabled={saving} type="submit">
            {saving ? "Saving…" : "Add feature"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectModal({
  snapshot,
  onClose,
  onSubmit,
  onRemove,
}: {
  snapshot: ProjectSnapshot;
  onClose: () => void;
  onSubmit: (input: UpdateProjectInput) => Promise<void>;
  onRemove: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await onSubmit({
        id: snapshot.project.id,
        goal: String(form.get("goal") || "").trim(),
        nextAction: String(form.get("nextAction") || "").trim(),
        status: String(form.get("status")) as ProjectStatus,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal eyebrow="Mission settings" title={`Edit ${snapshot.project.name}`} onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label>
          <span>Project goal</span>
          <textarea defaultValue={snapshot.project.goal} maxLength={600} name="goal" rows={3} />
        </label>
        <label>
          <span>Next concrete action</span>
          <textarea
            defaultValue={snapshot.project.nextAction}
            maxLength={400}
            name="nextAction"
            rows={2}
          />
        </label>
        <label>
          <span>Lifecycle status</span>
          <select defaultValue={snapshot.project.status} name="status">
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="shipped">Shipped</option>
          </select>
        </label>
        <div className="modal__actions modal__actions--split">
          <button className="button button--danger-ghost" type="button" onClick={onRemove}>
            <Trash2 size={16} /> Remove from Orion
          </button>
          <div>
            <button className="button button--ghost" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button button--primary" disabled={saving} type="submit">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function RemoveProjectModal({
  projectName,
  onClose,
  onConfirm,
}: {
  projectName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [removing, setRemoving] = useState(false);
  return (
    <Modal size="small" title={`Remove ${projectName}?`} onClose={onClose}>
      <div className="confirmation-copy">
        <AlertTriangle size={22} />
        <p>
          Orion will forget the project plan and feature map. The repository and every file inside
          it stay untouched.
        </p>
      </div>
      <div className="modal__actions">
        <button className="button button--ghost" onClick={onClose}>
          Keep project
        </button>
        <button
          className="button button--danger"
          disabled={removing}
          onClick={async () => {
            setRemoving(true);
            try {
              await onConfirm();
            } finally {
              setRemoving(false);
            }
          }}
        >
          {removing ? "Removing…" : "Remove from Orion"}
        </button>
      </div>
    </Modal>
  );
}
