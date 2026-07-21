import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProjectFocus, ProjectTask } from "../types";
import { ProgressTaskPreview } from "./ProgressTaskPreview";

const focuses: ProjectFocus[] = [
  {
    id: "focus-current",
    projectId: "project-1",
    title: "Ship the cockpit",
    status: "active",
    startedAt: "2026-07-18T10:00:00Z",
    endedAt: null,
  },
  {
    id: "focus-previous",
    projectId: "project-1",
    title: "Build the foundation",
    status: "archived",
    startedAt: "2026-07-17T10:00:00Z",
    endedAt: "2026-07-18T10:00:00Z",
  },
];

const tasks: ProjectTask[] = [
  {
    id: "task-current",
    projectId: "project-1",
    focusId: "focus-current",
    featureId: null,
    title: "Polish the current view",
    completed: false,
    createdAt: "2026-07-18T10:00:00Z",
    updatedAt: "2026-07-18T10:00:00Z",
  },
  {
    id: "task-previous",
    projectId: "project-1",
    focusId: "focus-previous",
    featureId: null,
    title: "Create the project shell",
    completed: true,
    createdAt: "2026-07-17T10:00:00Z",
    updatedAt: "2026-07-17T10:00:00Z",
  },
  {
    id: "task-without-focus",
    projectId: "project-1",
    focusId: null,
    featureId: null,
    title: "Legacy unassigned task",
    completed: true,
    createdAt: "2026-07-16T10:00:00Z",
    updatedAt: "2026-07-16T10:00:00Z",
  },
];

describe("ProgressTaskPreview", () => {
  it("shows every focus task grouped under the selected goal ring", () => {
    render(
      <ProgressTaskPreview
        focuses={focuses}
        projectGoal="Make every project easy to resume"
        selectedFocusId="focus-current"
        selection="goal"
        tasks={tasks}
      />,
    );

    expect(screen.getByText("Make every project easy to resume")).toBeInTheDocument();
    expect(screen.getByLabelText("50% complete")).toBeInTheDocument();
    expect(screen.getByText("Ship the cockpit")).toBeInTheDocument();
    expect(screen.getByText("Build the foundation")).toBeInTheDocument();
    expect(screen.getByText("Polish the current view")).toBeInTheDocument();
    expect(screen.getByText("Create the project shell")).toBeInTheDocument();
    expect(screen.queryByText("Legacy unassigned task")).not.toBeInTheDocument();
  });

  it("shows only the tasks belonging to a selected focus ring", () => {
    render(
      <ProgressTaskPreview
        focuses={focuses}
        projectGoal="Make every project easy to resume"
        selectedFocusId="focus-previous"
        selection="focus"
        tasks={tasks}
      />,
    );

    expect(screen.getByText("Previous focus")).toBeInTheDocument();
    expect(screen.getByText("Build the foundation")).toBeInTheDocument();
    expect(screen.getByLabelText("100% complete")).toBeInTheDocument();
    expect(screen.getByText("Create the project shell")).toBeInTheDocument();
    expect(screen.queryByText("Polish the current view")).not.toBeInTheDocument();
  });

  it("explains that tasks must be added in the editable list when a ring is empty", () => {
    render(
      <ProgressTaskPreview
        focuses={focuses}
        projectGoal="Make every project easy to resume"
        selectedFocusId="focus-current"
        selection="focus"
        tasks={[]}
      />,
    );

    expect(screen.getByText("No tasks shape this ring yet")).toBeInTheDocument();
    expect(screen.getByText("Add tasks in the editable list below.")).toBeInTheDocument();
  });
});
