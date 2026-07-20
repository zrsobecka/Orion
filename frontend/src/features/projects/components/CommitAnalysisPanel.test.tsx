import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CommitAnalysisPanel } from "./CommitAnalysisPanel";
import type { CommitAnalysis, ProjectFeature, ProjectTask } from "../types";

const task: ProjectTask = {
  id: "task-1",
  projectId: "project-1",
  focusId: "focus-1",
  featureId: "feature-1",
  title: "Show real commit evidence",
  completed: false,
  createdAt: "2026-07-18T10:00:00Z",
  updatedAt: "2026-07-18T10:00:00Z",
};
const feature: ProjectFeature = {
  id: "feature-1",
  projectId: "project-1",
  name: "Commit evidence",
  description: "",
  status: "in_progress",
  priority: "now",
  evidence: "",
  createdAt: "2026-07-18T10:00:00Z",
  updatedAt: "2026-07-18T10:00:00Z",
};
const analysis: CommitAnalysis = {
  commitHash: "abcdef1234567890",
  model: "local-model",
  whatChanged: "Commit details were added.",
  nowPossible: "Inspect files.",
  caution: "Verify the packaged app.",
  taskSuggestion: { taskId: task.id, reason: "Direct task evidence." },
  featureSuggestion: { featureId: feature.id, status: "working", reason: "Feature evidence." },
  focusImpact: "One focus step may be done.",
  goalImpact: "Health evidence improved.",
  reviewStatus: "pending",
  createdAt: "2026-07-18T11:00:00Z",
  reviewedAt: null,
};

describe("CommitAnalysisPanel", () => {
  it("requires explicit approval and submits the editable task and feature updates", async () => {
    const user = userEvent.setup();
    const onReview = vi.fn().mockResolvedValue(undefined);
    render(
      <CommitAnalysisPanel
        analysis={analysis}
        projectId="project-1"
        tasks={[task]}
        features={[feature]}
        onReview={onReview}
      />,
    );

    expect(
      screen.getByText("Nothing changes until approval.", { exact: false }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Approve updates" }));
    expect(onReview).toHaveBeenCalledWith({
      projectId: "project-1",
      commitHash: analysis.commitHash,
      action: "accept",
      taskId: task.id,
      completeTask: true,
      featureId: feature.id,
      featureStatus: "working",
    });
  });

  it("rejects the proposal without carrying update fields", async () => {
    const user = userEvent.setup();
    const onReview = vi.fn().mockResolvedValue(undefined);
    render(
      <CommitAnalysisPanel
        analysis={analysis}
        projectId="project-1"
        tasks={[task]}
        features={[feature]}
        onReview={onReview}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(onReview).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "reject",
        taskId: null,
        completeTask: false,
        featureId: null,
      }),
    );
  });
});
