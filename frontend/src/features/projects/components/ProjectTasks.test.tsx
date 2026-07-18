import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectTasks } from "./ProjectTasks";
import type { ProjectFeature, ProjectTask } from "../types";

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
        features={[]}
        tasks={[]}
        onAdd={onAdd}
        onRemove={vi.fn()}
        onSetCompleted={vi.fn()}
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
        features={[]}
        tasks={tasks}
        onAdd={vi.fn()}
        onRemove={onRemove}
        onSetCompleted={onSetCompleted}
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
        features={features}
        tasks={[{ ...tasks[0], featureId: "feature-1" }]}
        onAdd={onAdd}
        onRemove={vi.fn()}
        onSetCompleted={vi.fn()}
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
});
