import { FolderGit2, LayoutDashboard, Plus } from "lucide-react";
import { OrionLogo } from "../../shared/ui/OrionLogo";
import type { ProjectSnapshot } from "../../features/projects/types";

interface SidebarProps {
  projects: ProjectSnapshot[];
  selectedProjectId: string | null;
  view: "overview" | "project";
  addingProject: boolean;
  onOverview: () => void;
  onSelectProject: (projectId: string) => void;
  onAddProject: () => void;
}

export function Sidebar({
  projects,
  selectedProjectId,
  view,
  addingProject,
  onOverview,
  onSelectProject,
  onAddProject,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-lockup__mark">
          <OrionLogo size={42} />
        </div>
        <div>
          <strong>ORION</strong>
          <span>Mission control</span>
        </div>
      </div>

      <nav aria-label="Main navigation" className="sidebar__nav">
        <p className="sidebar__section-label">Workspace</p>
        <button
          aria-label="Overview"
          className={`sidebar-link ${view === "overview" ? "is-active" : ""}`}
          onClick={onOverview}
        >
          <LayoutDashboard size={17} />
          <span>Overview</span>
          <kbd>⌘1</kbd>
        </button>

        <div className="sidebar__project-heading">
          <p className="sidebar__section-label">Applications</p>
          <span>{projects.length}</span>
        </div>
        <div className="sidebar__projects">
          {projects.map(({ project, git }) => (
            <button
              key={project.id}
              aria-label={`Open ${project.name}, branch ${git.currentBranch || "unavailable"}, ${
                git.isDirty ? "uncommitted changes" : "working tree clean"
              }`}
              className={`sidebar-project ${
                view === "project" && selectedProjectId === project.id ? "is-active" : ""
              }`}
              title={project.path}
              onClick={() => onSelectProject(project.id)}
            >
              <span className="sidebar-project__icon">
                <FolderGit2 size={15} />
              </span>
              <span className="sidebar-project__text">
                <strong>{project.name}</strong>
                <small>{git.available ? git.currentBranch : "Repository unavailable"}</small>
              </span>
              <span
                aria-label={git.isDirty ? "Uncommitted changes" : "Working tree clean"}
                className={`repo-dot ${git.isDirty ? "is-attention" : "is-clean"}`}
              />
            </button>
          ))}
        </div>
      </nav>

      <div className="sidebar__footer">
        <div className="local-status">
          <span className="local-status__signal" />
          <div>
            <strong>Local workspace</strong>
            <span>Private · offline-first</span>
          </div>
        </div>
        <button
          aria-label="Add repository"
          className="button button--primary button--full"
          disabled={addingProject}
          onClick={onAddProject}
        >
          <Plus size={17} />
          <span>{addingProject ? "Adding…" : "Add repository"}</span>
        </button>
      </div>
    </aside>
  );
}
