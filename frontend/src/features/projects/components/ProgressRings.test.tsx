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
    expect(container.querySelectorAll(".progress-rings__focus-track")).toHaveLength(2);
    expect(container.querySelectorAll(".progress-rings__focus-value")).toHaveLength(1);
    expect(container.querySelector(".progress-rings__feature--blocked")).toBeInTheDocument();
  });

  it("presents feature evidence as progress toward one main goal", () => {
    render(
      <ProgressRings
        features={features}
        focuses={focuses}
        tasks={tasks}
        selectedFocusId="focus-1"
        selected="features"
        onSelect={vi.fn()}
        onSelectFocus={vi.fn()}
      />,
    );

    expect(screen.getByText("Main goal")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show main goal progress" })).toBePressed();
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

  it("gives sequential focuses distinct colors and marks the selected ring without relying on color", () => {
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

    const focusGroups = [...container.querySelectorAll("[data-focus-tone]")];
    const selectedGroup = container.querySelector("[data-focus-tone].is-selected");

    expect(focusGroups).toHaveLength(2);
    expect(new Set(focusGroups.map((group) => group.getAttribute("data-focus-tone"))).size).toBe(2);
    expect(selectedGroup).toHaveClass("is-current-focus");
    expect(
      screen.getByRole("button", { name: "Show active focus Ship the cockpit" }),
    ).toBePressed();
  });

  it("adds one inner orbit for every visible focus", () => {
    const extraFocuses = Array.from({ length: 3 }, (_, index): ProjectFocus => ({
      ...focuses[1],
      id: `focus-extra-${index}`,
      title: `Previous focus ${index + 1}`,
      startedAt: `2026-07-${String(16 - index).padStart(2, "0")}T10:00:00Z`,
    }));
    const allFocuses = [...focuses, ...extraFocuses];
    const { container } = render(
      <ProgressRings
        features={features}
        focuses={allFocuses}
        tasks={tasks}
        selectedFocusId="focus-1"
        selected="focus"
        onSelect={vi.fn()}
        onSelectFocus={vi.fn()}
      />,
    );

    expect(container.querySelectorAll(".progress-rings__focus-track")).toHaveLength(
      allFocuses.length,
    );
  });

  it("does not draw a misleading progress marker when a focus is at zero percent", () => {
    const { container } = render(
      <ProgressRings
        features={features}
        focuses={[focuses[0]]}
        tasks={tasks.map((task) => ({ ...task, completed: false }))}
        selectedFocusId="focus-1"
        selected="focus"
        onSelect={vi.fn()}
        onSelectFocus={vi.fn()}
      />,
    );

    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(container.querySelector(".progress-rings__focus-value")).not.toBeInTheDocument();
  });
});
