import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectTasks } from "./ProjectTasks";
import type { ProjectTask } from "../types";

const tasks: ProjectTask[] = [
  {
    id: "task-1",
    projectId: "project-1",
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
});
