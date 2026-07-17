import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FolderGit2,
  GitBranch,
  Orbit,
  Plus,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  formatRelativeTime,
  getCompletionPercent,
  getDashboardMetrics,
  getFeatureCounts,
} from "../projectModel";
import type { ProjectSnapshot } from "../types";

interface OverviewProps {
  projects: ProjectSnapshot[];
  onAddProject: () => void;
  onSelectProject: (projectId: string) => void;
}

export function Overview({ projects, onAddProject, onSelectProject }: OverviewProps) {
  const metrics = getDashboardMetrics(projects);

  return (
    <div className="workspace-view overview-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            <Orbit size={14} /> Project constellation
          </p>
          <h1>Mission overview</h1>
          <p className="page-header__summary">
            One view of what is moving, what needs attention, and where to resume.
          </p>
        </div>
        <button className="button button--primary" onClick={onAddProject}>
          <Plus size={17} /> Add repository
        </button>
      </header>

      {projects.length === 0 ? (
        <EmptyOverview onAddProject={onAddProject} />
      ) : (
        <>
          <section aria-label="Workspace signals" className="metric-grid">
            <MetricCard
              accent="cyan"
              icon={<Orbit size={18} />}
              label="Active apps"
              value={metrics.activeProjects}
              detail={`${projects.length} registered locally`}
            />
            <MetricCard
              accent={metrics.dirtyRepositories > 0 ? "amber" : "green"}
              icon={<GitBranch size={18} />}
              label="Need commit"
              value={metrics.dirtyRepositories}
              detail="Repositories with local changes"
            />
            <MetricCard
              accent={metrics.blockedFeatures > 0 ? "red" : "green"}
              icon={<AlertTriangle size={18} />}
              label="Blocked"
              value={metrics.blockedFeatures}
              detail="Features requiring attention"
            />
            <MetricCard
              accent="violet"
              icon={<CheckCircle2 size={18} />}
              label="Working"
              value={metrics.workingFeatures}
              detail="Verified feature outcomes"
            />
          </section>

          <section className="projects-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Applications</p>
                <h2>Your current orbit</h2>
              </div>
              <p>Open a project to see its exact state and next move.</p>
            </div>
            <div className="project-grid">
              {projects.map((snapshot) => (
                <ProjectCard
                  key={snapshot.project.id}
                  snapshot={snapshot}
                  onOpen={() => onSelectProject(snapshot.project.id)}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  accent,
}: {
  label: string;
  value: number;
  detail: string;
  icon: ReactNode;
  accent: "cyan" | "amber" | "green" | "red" | "violet";
}) {
  return (
    <article className={`metric-card metric-card--${accent}`}>
      <div className="metric-card__top">
        <span className="metric-card__icon">{icon}</span>
        <span className="metric-card__label">{label}</span>
      </div>
      <strong>{value.toString().padStart(2, "0")}</strong>
      <p>{detail}</p>
    </article>
  );
}

function ProjectCard({ snapshot, onOpen }: { snapshot: ProjectSnapshot; onOpen: () => void }) {
  const { project, git } = snapshot;
  const counts = getFeatureCounts(snapshot);
  const completion = getCompletionPercent(snapshot);
  const lastCommit = git.commits[0];

  return (
    <button className="project-card" onClick={onOpen}>
      <div className="project-card__head">
        <span className="project-card__glyph">
          <FolderGit2 size={21} />
        </span>
        <span className={`status-pill status-pill--${project.status}`}>{project.status}</span>
        <ArrowUpRight className="project-card__arrow" size={18} />
      </div>
      <div className="project-card__identity">
        <h3>{project.name}</h3>
        <p>{project.goal || "Add a project goal to make the destination explicit."}</p>
      </div>
      <div className="project-card__next">
        <span>Next action</span>
        <strong>{project.nextAction || "Define the next concrete step"}</strong>
      </div>
      <div className="progress-row">
        <div>
          <span>Feature health</span>
          <strong>{completion}%</strong>
        </div>
        <div className="progress-track">
          <span style={{ width: `${completion}%` }} />
        </div>
        <small>
          {counts.working} working · {counts.in_progress} in progress · {counts.blocked} blocked
        </small>
      </div>
      <div className="project-card__footer">
        <span>
          <GitBranch size={14} /> {git.available ? git.currentBranch : "Git unavailable"}
        </span>
        <span className={git.isDirty ? "text-attention" : "text-success"}>
          {git.isDirty ? `${git.modifiedFiles} changed` : "Clean"}
        </span>
        <span>{lastCommit ? formatRelativeTime(lastCommit.authoredAt) : "No commits"}</span>
      </div>
    </button>
  );
}

function EmptyOverview({ onAddProject }: { onAddProject: () => void }) {
  return (
    <section className="empty-state">
      <div className="empty-state__orbit">
        <Sparkles size={30} />
      </div>
      <p className="eyebrow">Your constellation is empty</p>
      <h2>Add the first application</h2>
      <p>
        Choose a local Git repository. Orion will read technical facts without uploading your code.
      </p>
      <button className="button button--primary" onClick={onAddProject}>
        <Plus size={17} /> Choose repository folder
      </button>
    </section>
  );
}
