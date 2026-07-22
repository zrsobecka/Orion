import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import type {
  AcceptFeatureSuggestionsInput,
  AddFeatureInput,
  AddProjectTaskInput,
  CommitAnalysis,
  Dashboard,
  FeatureAnalysisResult,
  FeatureStatus,
  GitCommitDetails,
  ProjectSnapshot,
  ReviewCommitAnalysisInput,
  StartProjectFocusInput,
  UpdateProjectInput,
} from "../features/projects/types";
import { demoDashboard } from "./demo-dashboard";

const isTauri = () => "__TAURI_INTERNALS__" in window;
const browserDashboard = structuredClone(demoDashboard);
const browserCommitAnalyses = new Map<string, CommitAnalysis>();

function findBrowserSnapshot(projectId: string) {
  const snapshot = browserDashboard.projects.find(({ project }) => project.id === projectId);
  if (!snapshot) throw new Error("The project is no longer available.");
  return snapshot;
}

export const desktopRuntime = {
  async minimizeWindow(): Promise<void> {
    if (!isTauri()) return;
    await getCurrentWindow().minimize();
  },

  async toggleMaximizeWindow(): Promise<void> {
    if (!isTauri()) return;
    await getCurrentWindow().toggleMaximize();
  },

  async closeWindow(): Promise<void> {
    if (!isTauri()) return;
    await getCurrentWindow().close();
  },

  async getDashboard(): Promise<Dashboard> {
    if (!isTauri()) return structuredClone(browserDashboard);
    return invoke<Dashboard>("get_dashboard");
  },

  async getCommitDetails(projectId: string, hash: string): Promise<GitCommitDetails> {
    if (isTauri()) return invoke<GitCommitDetails>("get_commit_details", { projectId, hash });
    const snapshot = findBrowserSnapshot(projectId);
    const commit = snapshot.git.commits.find((candidate) => candidate.hash === hash);
    if (!commit) throw new Error("The commit is no longer available.");
    return {
      hash,
      files: [
        {
          path: "frontend/src/features/projects/components/ProjectCockpit.tsx",
          status: "modified",
          additions: commit.additions,
          deletions: commit.deletions,
        },
      ],
      changeTypes: ["modified"],
      diff: "diff --git a/frontend/src/features/projects/components/ProjectCockpit.tsx b/frontend/src/features/projects/components/ProjectCockpit.tsx\n",
      diffTruncated: false,
    };
  },

  async analyzeCommit(projectId: string, hash: string): Promise<CommitAnalysis> {
    if (isTauri()) return invoke<CommitAnalysis>("analyze_commit", { projectId, hash });
    const cacheKey = `${projectId}:${hash}`;
    const cached = browserCommitAnalyses.get(cacheKey);
    if (cached) return structuredClone(cached);
    const snapshot = findBrowserSnapshot(projectId);
    const task = snapshot.tasks.find(({ completed }) => !completed) ?? null;
    const feature = snapshot.features.find(({ status }) => status === "in_progress") ?? null;
    const analysis: CommitAnalysis = {
      commitHash: hash,
      model: "browser-preview/local-model",
      whatChanged: "The commit added concrete repository evidence to the project cockpit.",
      nowPossible: "You can inspect changed files and line totals without leaving Orion.",
      caution: "The commit proves implementation changed, not that every user path was verified.",
      taskSuggestion: task
        ? { taskId: task.id, reason: "The commit appears to implement this task's outcome." }
        : null,
      featureSuggestion: feature
        ? {
            featureId: feature.id,
            status: "working",
            reason: "The commit contains implementation evidence for this feature.",
          }
        : null,
      focusImpact: "This may complete one step in the active focus.",
      goalImpact: "The project has stronger health and resume-work evidence.",
      reviewStatus: "pending",
      createdAt: new Date().toISOString(),
      reviewedAt: null,
    };
    browserCommitAnalyses.set(cacheKey, analysis);
    return structuredClone(analysis);
  },

  async reviewCommitAnalysis(input: ReviewCommitAnalysisInput): Promise<ProjectSnapshot> {
    if (isTauri()) return invoke<ProjectSnapshot>("review_commit_analysis", { input });
    const snapshot = findBrowserSnapshot(input.projectId);
    const analysis = browserCommitAnalyses.get(`${input.projectId}:${input.commitHash}`);
    if (!analysis) throw new Error("Analyze this commit before reviewing its proposals.");
    if (input.action === "accept") {
      if (input.completeTask && input.taskId) {
        const task = snapshot.tasks.find(({ id }) => id === input.taskId);
        if (task) task.completed = true;
      }
      if (input.featureId && input.featureStatus) {
        const feature = snapshot.features.find(({ id }) => id === input.featureId);
        if (feature) feature.status = input.featureStatus;
      }
    }
    analysis.reviewStatus = input.action === "accept" ? "accepted" : "rejected";
    analysis.reviewedAt = new Date().toISOString();
    return structuredClone(snapshot);
  },

  async selectProjectFolder(): Promise<string | null> {
    if (!isTauri()) return null;
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Add a Git repository",
    });
    return typeof selected === "string" ? selected : null;
  },

  async addProject(path: string): Promise<ProjectSnapshot> {
    if (!isTauri()) throw new Error("Adding folders is available in the desktop app.");
    return invoke<ProjectSnapshot>("add_project", { path });
  },

  async updateProject(input: UpdateProjectInput): Promise<ProjectSnapshot> {
    if (isTauri()) return invoke<ProjectSnapshot>("update_project", { input });

    const snapshot = findBrowserSnapshot(input.id);
    snapshot.project = { ...snapshot.project, ...input, updatedAt: new Date().toISOString() };
    return structuredClone(snapshot);
  },

  async removeProject(projectId: string): Promise<void> {
    if (isTauri()) return invoke<void>("remove_project", { projectId });
    browserDashboard.projects = browserDashboard.projects.filter(
      ({ project }) => project.id !== projectId,
    );
  },

  async addFeature(input: AddFeatureInput): Promise<ProjectSnapshot> {
    if (isTauri()) return invoke<ProjectSnapshot>("add_feature", { input });

    const snapshot = findBrowserSnapshot(input.projectId);
    const now = new Date().toISOString();
    snapshot.features.unshift({
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
    return structuredClone(snapshot);
  },

  async analyzeProjectFeatures(projectId: string): Promise<FeatureAnalysisResult> {
    if (isTauri()) return invoke<FeatureAnalysisResult>("analyze_project_features", { projectId });
    const snapshot = findBrowserSnapshot(projectId);
    return {
      model: "browser-preview/local-model",
      scannedFiles: 24,
      truncated: false,
      suggestions: snapshot.features.some(({ name }) => name === "Repository feature analysis")
        ? []
        : [
            {
              name: "Repository feature analysis",
              description: "Scans project evidence and proposes missing capabilities for review.",
              suggestedStatus: "working",
              evidence: "src-tauri/src/features/projects/repository_analysis.rs",
              confidence: 0.94,
            },
          ],
    };
  },

  async acceptFeatureSuggestions(input: AcceptFeatureSuggestionsInput): Promise<ProjectSnapshot> {
    if (isTauri()) return invoke<ProjectSnapshot>("accept_feature_suggestions", { input });
    const snapshot = findBrowserSnapshot(input.projectId);
    const now = new Date().toISOString();
    const knownNames = new Set(snapshot.features.map(({ name }) => name.trim().toLowerCase()));
    for (const suggestion of input.suggestions) {
      if (knownNames.has(suggestion.name.trim().toLowerCase())) continue;
      knownNames.add(suggestion.name.trim().toLowerCase());
      snapshot.features.unshift({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        name: suggestion.name,
        description: suggestion.description,
        status: suggestion.suggestedStatus,
        priority: "later",
        evidence: suggestion.evidence,
        createdAt: now,
        updatedAt: now,
      });
    }
    return structuredClone(snapshot);
  },

  async updateFeatureStatus(featureId: string, status: FeatureStatus): Promise<ProjectSnapshot> {
    if (isTauri()) return invoke<ProjectSnapshot>("update_feature_status", { featureId, status });

    const snapshot = browserDashboard.projects.find(({ features }) =>
      features.some(({ id }) => id === featureId),
    );
    if (!snapshot) throw new Error("The feature is no longer available.");
    const feature = snapshot.features.find(({ id }) => id === featureId);
    if (feature) {
      feature.status = status;
      feature.updatedAt = new Date().toISOString();
    }
    return structuredClone(snapshot);
  },

  async addProjectTask(input: AddProjectTaskInput): Promise<ProjectSnapshot> {
    if (isTauri()) return invoke<ProjectSnapshot>("add_project_task", { input });

    const snapshot = findBrowserSnapshot(input.projectId);
    const focus = snapshot.focuses.find(({ status }) => status === "active");
    if (!focus) throw new Error("Start a project focus before adding tasks.");
    const now = new Date().toISOString();
    snapshot.tasks.unshift({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      focusId: focus.id,
      featureId: input.featureId,
      title: input.title.trim(),
      completed: false,
      createdAt: now,
      updatedAt: now,
    });
    return structuredClone(snapshot);
  },

  async startProjectFocus(input: StartProjectFocusInput): Promise<ProjectSnapshot> {
    if (isTauri()) return invoke<ProjectSnapshot>("start_project_focus", { input });
    const snapshot = findBrowserSnapshot(input.projectId);
    const now = new Date().toISOString();
    for (const focus of snapshot.focuses) {
      if (focus.status === "active") {
        focus.status = "archived";
        focus.endedAt = now;
      }
    }
    snapshot.focuses.unshift({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      title: input.title.trim(),
      status: "active",
      startedAt: now,
      endedAt: null,
    });
    return structuredClone(snapshot);
  },

  async setProjectTaskCompleted(taskId: string, completed: boolean): Promise<ProjectSnapshot> {
    if (isTauri()) {
      return invoke<ProjectSnapshot>("set_project_task_completed", { taskId, completed });
    }

    const snapshot = browserDashboard.projects.find(({ tasks }) =>
      tasks.some(({ id }) => id === taskId),
    );
    if (!snapshot) throw new Error("The project task is no longer available.");
    const task = snapshot.tasks.find(({ id }) => id === taskId);
    if (task) {
      task.completed = completed;
      task.updatedAt = new Date().toISOString();
    }
    return structuredClone(snapshot);
  },

  async removeProjectTask(taskId: string): Promise<ProjectSnapshot> {
    if (isTauri()) return invoke<ProjectSnapshot>("remove_project_task", { taskId });

    const snapshot = browserDashboard.projects.find(({ tasks }) =>
      tasks.some(({ id }) => id === taskId),
    );
    if (!snapshot) throw new Error("The project task is no longer available.");
    snapshot.tasks = snapshot.tasks.filter(({ id }) => id !== taskId);
    return structuredClone(snapshot);
  },

  async openProjectFolder(path: string): Promise<void> {
    if (!isTauri()) return;
    await openPath(path);
  },
};
