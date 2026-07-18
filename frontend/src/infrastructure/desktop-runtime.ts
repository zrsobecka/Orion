import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import type {
  AcceptFeatureSuggestionsInput,
  AddFeatureInput,
  AddProjectTaskInput,
  Dashboard,
  FeatureAnalysisResult,
  FeatureStatus,
  ProjectSnapshot,
  UpdateProjectInput,
} from "../features/projects/types";
import { demoDashboard } from "./demo-dashboard";

const isTauri = () => "__TAURI_INTERNALS__" in window;
const browserDashboard = structuredClone(demoDashboard);

function findBrowserSnapshot(projectId: string) {
  const snapshot = browserDashboard.projects.find(({ project }) => project.id === projectId);
  if (!snapshot) throw new Error("The project is no longer available.");
  return snapshot;
}

export const desktopRuntime = {
  async getDashboard(): Promise<Dashboard> {
    if (!isTauri()) return structuredClone(browserDashboard);
    return invoke<Dashboard>("get_dashboard");
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
    const now = new Date().toISOString();
    snapshot.tasks.unshift({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      title: input.title.trim(),
      completed: false,
      createdAt: now,
      updatedAt: now,
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
