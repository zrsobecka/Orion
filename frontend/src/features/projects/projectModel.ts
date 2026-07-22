import type { FeatureStatus, ProjectFocus, ProjectSnapshot, ProjectTask } from "./types";

export const featureStatusLabels: Record<FeatureStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  working: "Working",
  blocked: "Blocked",
};

export function getFeatureCounts(snapshot: ProjectSnapshot) {
  return snapshot.features.reduce(
    (counts, feature) => {
      counts[feature.status] += 1;
      return counts;
    },
    { planned: 0, in_progress: 0, working: 0, blocked: 0 } as Record<FeatureStatus, number>,
  );
}

export function getTaskCompletionPercent(snapshot: ProjectSnapshot) {
  const activeFocus = snapshot.focuses.find((focus) => focus.status === "active");
  if (!activeFocus) return 0;
  const focusTasks = snapshot.tasks.filter((task) => task.focusId === activeFocus.id);
  return getTaskProgress(focusTasks).percent;
}

export function getTaskProgress(tasks: ProjectTask[]) {
  const completed = tasks.filter((task) => task.completed).length;
  return {
    completed,
    percent: tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100),
    total: tasks.length,
  };
}

export function getGoalTasks(focuses: ProjectFocus[], tasks: ProjectTask[]) {
  const focusIds = new Set(focuses.map((focus) => focus.id));
  return tasks.filter((task) => task.focusId !== null && focusIds.has(task.focusId));
}

export function getDashboardMetrics(projects: ProjectSnapshot[]) {
  return projects.reduce(
    (metrics, snapshot) => {
      if (snapshot.project.status === "active") metrics.activeProjects += 1;
      if (snapshot.git.isDirty) metrics.dirtyRepositories += 1;
      metrics.blockedFeatures += getFeatureCounts(snapshot).blocked;
      metrics.workingFeatures += getFeatureCounts(snapshot).working;
      return metrics;
    },
    { activeProjects: 0, dirtyRepositories: 0, blockedFeatures: 0, workingFeatures: 0 },
  );
}

export function formatRelativeTime(isoDate: string, now = new Date()) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  const diffMinutes = Math.round((date.getTime() - now.getTime()) / 60_000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");

  return formatter.format(Math.round(diffHours / 24), "day");
}
