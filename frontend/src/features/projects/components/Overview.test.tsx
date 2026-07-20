import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProjectSnapshot } from "../types";
import { Overview } from "./Overview";

const snapshot: ProjectSnapshot = {
  project: {
    id: "project-1",
    name: "Orion",
    path: "C:/Orion",
    goal: "Make resuming work effortless",
    nextAction: "Legacy next action that should not be shown",
    status: "active",
    createdAt: "2026-07-18T10:00:00Z",
    updatedAt: "2026-07-18T10:00:00Z",
  },
  features: [],
  focuses: [
    {
      id: "focus-1",
      projectId: "project-1",
      title: "Ship the clearer cockpit",
      status: "active",
      startedAt: "2026-07-18T10:00:00Z",
      endedAt: null,
    },
  ],
  tasks: [
    {
      id: "task-1",
      projectId: "project-1",
      focusId: "focus-1",
      featureId: null,
      title: "Verify the new mission path",
      completed: false,
      createdAt: "2026-07-18T10:00:00Z",
      updatedAt: "2026-07-18T10:00:00Z",
    },
  ],
  git: {
    available: true,
    error: null,
    currentBranch: "main",
    upstream: null,
    ahead: 0,
    behind: 0,
    modifiedFiles: 0,
    isDirty: false,
    branches: [],
    commits: [],
  },
};

describe("Overview", () => {
  it("uses the active focus and first open task as the resume-work signal", () => {
    render(<Overview projects={[snapshot]} onAddProject={vi.fn()} onSelectProject={vi.fn()} />);

    expect(screen.getByText("Ship the clearer cockpit")).toBeInTheDocument();
    expect(screen.getByText(/Next move · Verify the new mission path/)).toBeInTheDocument();
    expect(
      screen.queryByText("Legacy next action that should not be shown"),
    ).not.toBeInTheDocument();
  });
});
