import { useCallback, useEffect, useMemo, useState } from "react";
import { desktopRuntime } from "../../../infrastructure/desktop-runtime";
import type {
  AcceptFeatureSuggestionsInput,
  AddFeatureInput,
  AddProjectTaskInput,
  FeatureAnalysisResult,
  FeatureStatus,
  GitCommitDetails,
  ProjectSnapshot,
  StartProjectFocusInput,
  UpdateProjectInput,
} from "../types";

type WorkspaceView = "overview" | "project";
const selectedProjectKey = "orion.selectedProjectId";

export function useProjects() {
  const [projects, setProjects] = useState<ProjectSnapshot[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() =>
    localStorage.getItem(selectedProjectKey),
  );
  const [view, setView] = useState<WorkspaceView>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingProject, setAddingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const replaceSnapshot = useCallback((next: ProjectSnapshot) => {
    setProjects((current) => {
      const exists = current.some(({ project }) => project.id === next.project.id);
      if (!exists) return [next, ...current];
      return current.map((snapshot) => (snapshot.project.id === next.project.id ? next : snapshot));
    });
  }, []);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const dashboard = await desktopRuntime.getDashboard();
      setProjects(dashboard.projects);
      setSelectedProjectId((current) => {
        if (current && dashboard.projects.some(({ project }) => project.id === current)) {
          return current;
        }
        localStorage.removeItem(selectedProjectKey);
        return null;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadDashboard]);

  const selectProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem(selectedProjectKey, projectId);
    setView("project");
  }, []);

  const showOverview = useCallback(() => setView("overview"), []);

  const addProject = useCallback(async () => {
    setAddingProject(true);
    setError(null);
    try {
      const path = await desktopRuntime.selectProjectFolder();
      if (!path) return;
      const snapshot = await desktopRuntime.addProject(path);
      replaceSnapshot(snapshot);
      selectProject(snapshot.project.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setAddingProject(false);
    }
  }, [replaceSnapshot, selectProject]);

  const updateProject = useCallback(
    async (input: UpdateProjectInput) => {
      setError(null);
      try {
        replaceSnapshot(await desktopRuntime.updateProject(input));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
        throw caught;
      }
    },
    [replaceSnapshot],
  );

  const addFeature = useCallback(
    async (input: AddFeatureInput) => {
      setError(null);
      try {
        replaceSnapshot(await desktopRuntime.addFeature(input));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
        throw caught;
      }
    },
    [replaceSnapshot],
  );

  const analyzeProjectFeatures = useCallback(
    (projectId: string): Promise<FeatureAnalysisResult> =>
      desktopRuntime.analyzeProjectFeatures(projectId),
    [],
  );

  const getCommitDetails = useCallback(
    (projectId: string, hash: string): Promise<GitCommitDetails> =>
      desktopRuntime.getCommitDetails(projectId, hash),
    [],
  );

  const acceptFeatureSuggestions = useCallback(
    async (input: AcceptFeatureSuggestionsInput) => {
      setError(null);
      try {
        replaceSnapshot(await desktopRuntime.acceptFeatureSuggestions(input));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
        throw caught;
      }
    },
    [replaceSnapshot],
  );

  const updateFeatureStatus = useCallback(
    async (featureId: string, status: FeatureStatus) => {
      setError(null);
      try {
        replaceSnapshot(await desktopRuntime.updateFeatureStatus(featureId, status));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    },
    [replaceSnapshot],
  );

  const addProjectTask = useCallback(
    async (input: AddProjectTaskInput) => {
      setError(null);
      try {
        replaceSnapshot(await desktopRuntime.addProjectTask(input));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
        throw caught;
      }
    },
    [replaceSnapshot],
  );

  const startProjectFocus = useCallback(
    async (input: StartProjectFocusInput) => {
      setError(null);
      try {
        replaceSnapshot(await desktopRuntime.startProjectFocus(input));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
        throw caught;
      }
    },
    [replaceSnapshot],
  );

  const setProjectTaskCompleted = useCallback(
    async (taskId: string, completed: boolean) => {
      setError(null);
      try {
        replaceSnapshot(await desktopRuntime.setProjectTaskCompleted(taskId, completed));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
        throw caught;
      }
    },
    [replaceSnapshot],
  );

  const removeProjectTask = useCallback(
    async (taskId: string) => {
      setError(null);
      try {
        replaceSnapshot(await desktopRuntime.removeProjectTask(taskId));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
        throw caught;
      }
    },
    [replaceSnapshot],
  );

  const removeProject = useCallback(async (projectId: string) => {
    setError(null);
    try {
      await desktopRuntime.removeProject(projectId);
      setProjects((current) => current.filter(({ project }) => project.id !== projectId));
      setSelectedProjectId(null);
      localStorage.removeItem(selectedProjectKey);
      setView("overview");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      throw caught;
    }
  }, []);

  const selectedProject = useMemo(
    () => projects.find(({ project }) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  return {
    projects,
    selectedProject,
    selectedProjectId,
    view,
    loading,
    refreshing,
    addingProject,
    error,
    clearError: () => setError(null),
    showOverview,
    selectProject,
    addProject,
    updateProject,
    addFeature,
    analyzeProjectFeatures,
    getCommitDetails,
    acceptFeatureSuggestions,
    updateFeatureStatus,
    addProjectTask,
    startProjectFocus,
    setProjectTaskCompleted,
    removeProjectTask,
    removeProject,
    refresh: () => loadDashboard(true),
  };
}
