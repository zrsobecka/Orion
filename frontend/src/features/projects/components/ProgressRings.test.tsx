import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProgressRings } from "./ProgressRings";
import type { ProjectFeature, ProjectTask } from "../types";

const features: ProjectFeature[] = [
  {
    id: "feature-working",
    projectId: "project-1",
    name: "Working feature",
    description: "",
    status: "working",
    priority: "now",
    evidence: "",
    createdAt: "2026-07-18T10:00:00Z",
    updatedAt: "2026-07-18T10:00:00Z",
  },
  {
    id: "feature-blocked",
    projectId: "project-1",
    name: "Blocked feature",
    description: "",
    status: "blocked",
    priority: "next",
    evidence: "",
    createdAt: "2026-07-18T10:00:00Z",
    updatedAt: "2026-07-18T10:00:00Z",
  },
];

const tasks: ProjectTask[] = [
  {
    id: "task-1",
    projectId: "project-1",
    focusId: "focus-1",
    featureId: null,
    title: "First task",
    completed: true,
    createdAt: "2026-07-18T10:00:00Z",
    updatedAt: "2026-07-18T10:00:00Z",
  },
  {
    id: "task-2",
    projectId: "project-1",
    focusId: "focus-1",
    featureId: null,
    title: "Second task",
    completed: false,
    createdAt: "2026-07-18T10:00:00Z",
    updatedAt: "2026-07-18T10:00:00Z",
  },
];

describe("ProgressRings", () => {
  it("shows feature segments and active-focus completion without merging the two measures", () => {
    const { container } = render(
      <ProgressRings features={features} focusTasks={tasks} selected="focus" onSelect={vi.fn()} />,
    );

    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(container.querySelectorAll(".progress-rings__feature")).toHaveLength(2);
    expect(container.querySelector(".progress-rings__feature--blocked")).toBeInTheDocument();
  });

  it("lets the user choose which ring explains the project state", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ProgressRings
        features={features}
        focusTasks={tasks}
        selected="features"
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Show active focus progress" }));
    expect(onSelect).toHaveBeenCalledWith("focus");
  });
});
