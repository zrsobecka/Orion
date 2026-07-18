import { describe, expect, it } from "vitest";
import {
  formatRelativeTime,
  getCompletionPercent,
  getDashboardMetrics,
  getTaskCompletionPercent,
} from "./projectModel";
import type { ProjectSnapshot } from "./types";

const snapshot = (overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot => ({
  project: {
    id: "project-1",
    name: "Orion",
    path: "C:/apps/Orion",
    goal: "Remember project state",
    nextAction: "Ship the cockpit",
    status: "active",
    createdAt: "2026-07-13T10:00:00Z",
    updatedAt: "2026-07-13T10:00:00Z",
  },
  features: [
    {
      id: "feature-1",
      projectId: "project-1",
      name: "Overview",
      description: "",
      status: "working",
      priority: "now",
      evidence: "",
      createdAt: "2026-07-13T10:00:00Z",
      updatedAt: "2026-07-13T10:00:00Z",
    },
    {
      id: "feature-2",
      projectId: "project-1",
      name: "AI analyst",
      description: "",
      status: "blocked",
      priority: "later",
      evidence: "",
      createdAt: "2026-07-13T10:00:00Z",
      updatedAt: "2026-07-13T10:00:00Z",
    },
  ],
  focuses: [
    {
      id: "focus-1",
      projectId: "project-1",
      title: "Ship the cockpit",
      status: "active",
      startedAt: "2026-07-13T10:00:00Z",
      endedAt: null,
    },
  ],
  tasks: [],
  git: {
    available: true,
    error: null,
    currentBranch: "main",
    upstream: "origin/main",
    ahead: 0,
    behind: 0,
    modifiedFiles: 2,
    isDirty: true,
    branches: [],
    commits: [],
  },
  ...overrides,
});

describe("project projections", () => {
  it("calculates working-feature completion", () => {
    expect(getCompletionPercent(snapshot())).toBe(50);
    expect(getCompletionPercent(snapshot({ features: [] }))).toBe(0);
  });

  it("calculates current-focus completion from project tasks", () => {
    const tasks = [
      {
        id: "task-1",
        projectId: "project-1",
        focusId: "focus-1",
        featureId: null,
        title: "First step",
        completed: true,
        createdAt: "2026-07-13T10:00:00Z",
        updatedAt: "2026-07-13T10:00:00Z",
      },
      {
        id: "task-old",
        projectId: "project-1",
        focusId: "focus-old",
        featureId: null,
        title: "Old completed work",
        completed: true,
        createdAt: "2026-07-12T10:00:00Z",
        updatedAt: "2026-07-12T10:00:00Z",
      },
      {
        id: "task-2",
        projectId: "project-1",
        focusId: "focus-1",
        featureId: "feature-2",
        title: "Second step",
        completed: false,
        createdAt: "2026-07-13T10:00:00Z",
        updatedAt: "2026-07-13T10:00:00Z",
      },
    ];
    expect(getTaskCompletionPercent(snapshot({ tasks }))).toBe(50);
    expect(getTaskCompletionPercent(snapshot({ tasks: [] }))).toBe(0);
  });

  it("aggregates dashboard attention signals", () => {
    expect(getDashboardMetrics([snapshot()])).toEqual({
      activeProjects: 1,
      dirtyRepositories: 1,
      blockedFeatures: 1,
      workingFeatures: 1,
    });
  });

  it("formats recent timestamps without exposing raw dates", () => {
    const now = new Date("2026-07-13T12:00:00Z");
    expect(formatRelativeTime("2026-07-13T10:00:00Z", now)).toBe("2 hours ago");
    expect(formatRelativeTime("not-a-date", now)).toBe("Unknown time");
  });
});
