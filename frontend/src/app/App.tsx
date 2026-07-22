import { Activity, RefreshCw, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { OrionLogo } from "../shared/ui/OrionLogo";
import { Overview } from "../features/projects/components/Overview";
import { ProjectCockpit } from "../features/projects/components/ProjectCockpit";
import { useProjects } from "../features/projects/hooks/useProjects";
import { Sidebar } from "./shell/Sidebar";
import { TitleBar } from "./shell/TitleBar";

export default function App() {
  const workspace = useProjects();
  const stageScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "1") {
        event.preventDefault();
        workspace.showOverview();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [workspace]);

  useEffect(() => {
    if (stageScrollRef.current) stageScrollRef.current.scrollTop = 0;
  }, [workspace.selectedProjectId, workspace.view]);

  if (workspace.loading) {
    return (
      <div className="app-frame">
        <TitleBar />
        <main className="boot-screen">
          <div className="boot-screen__mark">
            <OrionLogo size={72} />
            <span />
          </div>
          <p className="eyebrow">Local systems online</p>
          <h1>Mapping your constellation…</h1>
        </main>
      </div>
    );
  }

  const showCockpit = workspace.view === "project" && workspace.selectedProject;

  return (
    <div className="app-frame">
      <TitleBar />
      <div className="app-shell">
        <Sidebar
          addingProject={workspace.addingProject}
          projects={workspace.projects}
          selectedProjectId={workspace.selectedProjectId}
          view={workspace.view}
          onAddProject={workspace.addProject}
          onOverview={workspace.showOverview}
          onSelectProject={workspace.selectProject}
        />
        <div className="app-stage">
          <div className="stage-topbar">
            <div className="stage-topbar__signal">
              <Activity size={14} />
              <span>Workspace synchronized locally</span>
            </div>
            <button
              aria-label="Refresh Git data"
              className="button button--ghost button--small"
              disabled={workspace.refreshing}
              onClick={workspace.refresh}
            >
              <RefreshCw className={workspace.refreshing ? "is-spinning" : ""} size={15} />
              {workspace.refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {workspace.error && (
            <div className="error-banner" role="alert">
              <span>{workspace.error}</span>
              <button aria-label="Dismiss error" onClick={workspace.clearError}>
                <X size={16} />
              </button>
            </div>
          )}

          <div ref={stageScrollRef} className="stage-scroll">
            {showCockpit ? (
              <ProjectCockpit
                snapshot={workspace.selectedProject!}
                onAcceptFeatureSuggestions={workspace.acceptFeatureSuggestions}
                onAddFeature={workspace.addFeature}
                onAddProjectTask={workspace.addProjectTask}
                onBack={workspace.showOverview}
                onAnalyzeFeatures={workspace.analyzeProjectFeatures}
                onAnalyzeCommit={workspace.analyzeCommit}
                onRefresh={workspace.refresh}
                onGetCommitDetails={workspace.getCommitDetails}
                onRemoveProject={workspace.removeProject}
                onRemoveProjectTask={workspace.removeProjectTask}
                onReviewCommitAnalysis={workspace.reviewCommitAnalysis}
                onSetProjectTaskCompleted={workspace.setProjectTaskCompleted}
                onStartProjectFocus={workspace.startProjectFocus}
                onUpdateFeatureStatus={workspace.updateFeatureStatus}
                onUpdateProject={workspace.updateProject}
              />
            ) : (
              <Overview
                projects={workspace.projects}
                onAddProject={workspace.addProject}
                onSelectProject={workspace.selectProject}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
