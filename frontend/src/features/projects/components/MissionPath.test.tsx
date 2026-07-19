import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ProjectFeature, ProjectFocus } from "../types";
import { MissionPath } from "./MissionPath";

const focuses: ProjectFocus[] = [
  {
    id: "focus-current",
    projectId: "project-1",
    title: "Make resuming effortless",
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

const features: ProjectFeature[] = [
  {
    id: "feature-next",
    projectId: "project-1",
    name: "Commit evidence",
    description: "",
    status: "planned",
    priority: "next",
    evidence: "",
    createdAt: "2026-07-18T10:00:00Z",
    updatedAt: "2026-07-18T10:00:00Z",
  },
  {
    id: "feature-done",
    projectId: "project-1",
    name: "Working foundation",
    description: "",
    status: "working",
    priority: "later",
    evidence: "",
    createdAt: "2026-07-18T10:00:00Z",
    updatedAt: "2026-07-18T10:00:00Z",
  },
];

describe("MissionPath", () => {
  it("shows history, the current focus, and real future feature branches", () => {
    render(
      <MissionPath
        features={features}
        focuses={focuses}
        selectedFocusId="focus-current"
        onSelectFocus={vi.fn()}
      />,
    );

    expect(screen.getByText("Previous focus")).toBeInTheDocument();
    expect(screen.getByText("Current focus")).toBeInTheDocument();
    expect(screen.getByText("Possible next")).toBeInTheDocument();
    expect(screen.getByText("Commit evidence")).toBeInTheDocument();
    expect(screen.queryByText("Working foundation")).not.toBeInTheDocument();
    expect(screen.queryByText("Completed focus")).not.toBeInTheDocument();
  });

  it("keeps focus selection synchronized", async () => {
    const user = userEvent.setup();
    const onSelectFocus = vi.fn();
    render(
      <MissionPath
        features={features}
        focuses={focuses}
        selectedFocusId="focus-current"
        onSelectFocus={onSelectFocus}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Build the foundation/i }));
    expect(onSelectFocus).toHaveBeenCalledWith("focus-previous");
  });

  it("offers a clear waypoint when no focus exists", () => {
    render(
      <MissionPath features={[]} focuses={[]} selectedFocusId={null} onSelectFocus={vi.fn()} />,
    );

    expect(screen.getByText("Start a focus")).toBeInTheDocument();
  });
});
