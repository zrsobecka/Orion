import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CommitHistory } from "./CommitHistory";
import type { GitCommit, GitCommitDetails } from "../types";

const commit: GitCommit = {
  hash: "abcdef1234567890",
  shortHash: "abcdef1",
  subject: "Preserve focus history",
  authoredAt: "2026-07-18T10:00:00Z",
  author: "Builder",
  changedFiles: 2,
  additions: 42,
  deletions: 7,
};

const details: GitCommitDetails = {
  hash: commit.hash,
  files: [
    {
      path: "src-tauri/src/infrastructure/persistence/database.rs",
      status: "modified",
      additions: 42,
      deletions: 7,
    },
  ],
  changeTypes: ["modified"],
  diff: "@@ -1 +1 @@",
  diffTruncated: false,
};

describe("CommitHistory", () => {
  it("loads real commit details on first expansion and reuses them afterward", async () => {
    const user = userEvent.setup();
    const onLoadDetails = vi.fn().mockResolvedValue(details);
    render(
      <CommitHistory
        projectId="project-1"
        commits={[commit]}
        features={[]}
        tasks={[]}
        onAnalyzeCommit={vi.fn()}
        onLoadDetails={onLoadDetails}
        onReviewCommitAnalysis={vi.fn()}
      />,
    );

    expect(screen.getByText("2 files")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Preserve focus history/ }));
    expect(await screen.findByText(details.files[0].path)).toBeInTheDocument();
    expect(screen.getByText("+42 −7")).toBeInTheDocument();
    expect(onLoadDetails).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Preserve focus history/ }));
    await user.click(screen.getByRole("button", { name: /Preserve focus history/ }));
    expect(onLoadDetails).toHaveBeenCalledTimes(1);
  });
});
