import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProgressRings } from "./ProgressRings";
import type { ProjectFeature, ProjectFocus, ProjectTask } from "../types";

const focuses: ProjectFocus[] = [
  {
    id: "focus-1",
    projectId: "project-1",
    title: "Ship the cockpit",
    status: "active",
    startedAt: "2026-07-18T10:00:00Z",
    endedAt: null,
  },
  {
    id: "focus-old",
    projectId: "project-1",
    title: "Build the foundation",
    status: "archived",
    startedAt: "2026-07-17T10:00:00Z",
    endedAt: "2026-07-18T10:00:00Z",
  },
];

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
      <ProgressRings
        features={features}
        focuses={focuses}
        tasks={tasks}
        selectedFocusId="focus-1"
        selected="focus"
        onSelect={vi.fn()}
        onSelectFocus={vi.fn()}
      />,
    );

    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(container.querySelectorAll(".progress-rings__feature")).toHaveLength(2);
    expect(container.querySelectorAll(".progress-rings__focus-value")).toHaveLength(2);
    expect(container.querySelector(".progress-rings__feature--blocked")).toBeInTheDocument();
  });

  it("lets the user choose which ring explains the project state", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ProgressRings
        features={features}
        focuses={focuses}
        tasks={tasks}
        selectedFocusId="focus-1"
        selected="features"
        onSelect={onSelect}
        onSelectFocus={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Show active focus Ship the cockpit" }));
    expect(onSelect).toHaveBeenCalledWith("focus");
  });

  it("lets the user open a previous focus from its own inner orbit", async () => {
    const user = userEvent.setup();
    const onSelectFocus = vi.fn();
    render(
      <ProgressRings
        features={features}
        focuses={focuses}
        tasks={tasks}
        selectedFocusId="focus-1"
        selected="focus"
        onSelect={vi.fn()}
        onSelectFocus={onSelectFocus}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Show previous focus Build the foundation" }),
    );
    expect(onSelectFocus).toHaveBeenCalledWith("focus-old");
  });
});
