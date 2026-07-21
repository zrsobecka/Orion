import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectTasks } from "./ProjectTasks";
import type { ProjectFeature, ProjectFocus, ProjectTask } from "../types";

const focuses: ProjectFocus[] = [
  {
    id: "focus-1",
    projectId: "project-1",
    title: "Ship the cockpit",
    status: "active",
    startedAt: "2026-07-17T09:00:00Z",
    endedAt: null,
  },
  {
    id: "focus-old",
    projectId: "project-1",
    title: "Build the foundation",
    status: "archived",
    startedAt: "2026-07-16T09:00:00Z",
    endedAt: "2026-07-17T09:00:00Z",
  },
];

const features: ProjectFeature[] = [
  {
    id: "feature-1",
    projectId: "project-1",
    name: "Project cockpit",
    description: "",
    status: "in_progress",
    priority: "now",
    evidence: "",
    createdAt: "2026-07-17T09:00:00Z",
    updatedAt: "2026-07-17T09:00:00Z",
  },
];

const tasks: ProjectTask[] = [
  {
    id: "task-1",
    projectId: "project-1",
    focusId: "focus-1",
    featureId: null,
    title: "Build the mission map",
    completed: false,
    createdAt: "2026-07-17T10:00:00Z",
    updatedAt: "2026-07-17T10:00:00Z",
  },
];

describe("ProjectTasks", () => {
  it("adds a manual task to the selected project", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <ProjectTasks
        projectId="project-1"
        projectGoal="Ship a reliable mission control"
        features={[]}
        focuses={focuses}
        selectedFocusId="focus-1"
        selectedScope="focus"
        tasks={[]}
        onAdd={onAdd}
        onRemove={vi.fn()}
        onSelectGoal={vi.fn()}
        onSetCompleted={vi.fn()}
        onSelectFocus={vi.fn()}
        onStartFocus={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("New task"), "  Verify Orion.exe  ");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onAdd).toHaveBeenCalledWith({
      projectId: "project-1",
      featureId: null,
      title: "Verify Orion.exe",
    });
    expect(screen.getByLabelText("New task")).toHaveValue("");
  });

  it("completes and removes an existing task", async () => {
    const user = userEvent.setup();
    const onSetCompleted = vi.fn().mockResolvedValue(undefined);
    const onRemove = vi.fn().mockResolvedValue(undefined);
    render(
      <ProjectTasks
        projectId="project-1"
        projectGoal="Ship a reliable mission control"
        features={[]}
        focuses={focuses}
        selectedFocusId="focus-1"
        selectedScope="focus"
        tasks={tasks}
        onAdd={vi.fn()}
        onRemove={onRemove}
        onSelectGoal={vi.fn()}
        onSetCompleted={onSetCompleted}
        onSelectFocus={vi.fn()}
        onStartFocus={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Complete Build the mission map" }));
    expect(onSetCompleted).toHaveBeenCalledWith("task-1", true);

    await user.click(screen.getByRole("button", { name: "Remove Build the mission map" }));
    expect(onRemove).toHaveBeenCalledWith("task-1");
  });

  it("adds a task linked to a selected feature and shows the relationship", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <ProjectTasks
        projectId="project-1"
        projectGoal="Ship a reliable mission control"
        features={features}
        focuses={focuses}
        selectedFocusId="focus-1"
        selectedScope="focus"
        tasks={[{ ...tasks[0], featureId: "feature-1" }]}
        onAdd={onAdd}
        onRemove={vi.fn()}
        onSelectGoal={vi.fn()}
        onSetCompleted={vi.fn()}
        onSelectFocus={vi.fn()}
        onStartFocus={vi.fn()}
      />,
    );

    expect(within(screen.getByRole("article")).getByText("Project cockpit")).toBeInTheDocument();
    await user.type(screen.getByLabelText("New task"), "Polish the cockpit");
    await user.selectOptions(screen.getByLabelText("Related feature"), "feature-1");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onAdd).toHaveBeenCalledWith({
      projectId: "project-1",
      featureId: "feature-1",
      title: "Polish the cockpit",
    });
  });

  it("starts a new focus without changing old tasks", async () => {
    const user = userEvent.setup();
    const onStartFocus = vi.fn().mockResolvedValue(undefined);
    render(
      <ProjectTasks
        projectId="project-1"
        projectGoal="Ship a reliable mission control"
        features={[]}
        focuses={focuses}
        selectedFocusId="focus-1"
        selectedScope="focus"
        tasks={tasks}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onSelectGoal={vi.fn()}
        onSetCompleted={vi.fn()}
        onSelectFocus={vi.fn()}
        onStartFocus={onStartFocus}
      />,
    );

    await user.click(screen.getByRole("button", { name: "New focus" }));
    await user.type(
      screen.getByLabelText("What are you trying to achieve now?"),
      "Make commit evidence useful",
    );
    await user.click(screen.getByRole("button", { name: "Start" }));

    expect(onStartFocus).toHaveBeenCalledWith({
      projectId: "project-1",
      title: "Make commit evidence useful",
    });
  });

  it("shows every focus task in the editable main-goal view", () => {
    const previousTask = {
      ...tasks[0],
      id: "task-old",
      focusId: "focus-old",
      title: "Set up Git",
    };
    render(
      <ProjectTasks
        projectId="project-1"
        projectGoal="Ship a reliable mission control"
        features={[]}
        focuses={focuses}
        selectedFocusId="focus-1"
        selectedScope="goal"
        tasks={[tasks[0], previousTask]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onSelectGoal={vi.fn()}
        onSetCompleted={vi.fn()}
        onSelectFocus={vi.fn()}
        onStartFocus={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Ship a reliable mission control" })).toBeVisible();
    expect(screen.getByText("Build the mission map")).toBeInTheDocument();
    expect(screen.getByText("Set up Git")).toBeInTheDocument();
    expect(screen.getByText("Ship the cockpit")).toBeInTheDocument();
    expect(screen.getByText("Build the foundation")).toBeInTheDocument();
    expect(screen.getByLabelText("New task")).toBeInTheDocument();
    expect(
      screen.getByText("New tasks join the active focus: Ship the cockpit"),
    ).toBeInTheDocument();
  });

  it("switches the task list to a previous focus without allowing new tasks there", async () => {
    const user = userEvent.setup();
    const onSelectFocus = vi.fn();
    const previousTask = { ...tasks[0], id: "task-old", focusId: "focus-old", title: "Set up Git" };
    render(
      <ProjectTasks
        projectId="project-1"
        projectGoal="Ship a reliable mission control"
        features={[]}
        focuses={focuses}
        selectedFocusId="focus-old"
        selectedScope="focus"
        tasks={[tasks[0], previousTask]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onSelectGoal={vi.fn()}
        onSetCompleted={vi.fn()}
        onSelectFocus={onSelectFocus}
        onStartFocus={vi.fn()}
      />,
    );

    expect(screen.getByText("Set up Git")).toBeInTheDocument();
    expect(screen.queryByLabelText("New task")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("View task scope"), "focus-1");
    expect(onSelectFocus).toHaveBeenCalledWith("focus-1");
  });

  it("lets the user switch from a focus to the main goal", async () => {
    const user = userEvent.setup();
    const onSelectGoal = vi.fn();
    render(
      <ProjectTasks
        projectId="project-1"
        projectGoal="Ship a reliable mission control"
        features={[]}
        focuses={focuses}
        selectedFocusId="focus-1"
        selectedScope="focus"
        tasks={tasks}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onSelectGoal={onSelectGoal}
        onSetCompleted={vi.fn()}
        onSelectFocus={vi.fn()}
        onStartFocus={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText("View task scope"), "goal");
    expect(onSelectGoal).toHaveBeenCalledOnce();
  });
});
