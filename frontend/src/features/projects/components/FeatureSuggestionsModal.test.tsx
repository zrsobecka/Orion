import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FeatureAnalysisResult } from "../types";
import { FeatureSuggestionsModal } from "./FeatureSuggestionsModal";

const analysis: FeatureAnalysisResult = {
  model: "qwen/example",
  scannedFiles: 18,
  truncated: false,
  suggestions: [
    {
      name: "Export reports",
      description: "Creates downloadable reports.",
      suggestedStatus: "working",
      evidence: "src/reports.ts",
      confidence: 0.93,
    },
    {
      name: "Project search",
      description: "Finds projects by name.",
      suggestedStatus: "in_progress",
      evidence: "src/search.ts",
      confidence: 0.76,
    },
  ],
};

describe("FeatureSuggestionsModal", () => {
  it("lets the user reject individual proposals before accepting", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn().mockResolvedValue(undefined);
    render(
      <FeatureSuggestionsModal
        analysis={analysis}
        error={null}
        loading={false}
        saving={false}
        onAccept={onAccept}
        onClose={() => undefined}
        onRetry={() => undefined}
      />,
    );

    await user.click(screen.getByLabelText("Select Export reports"));
    await user.click(screen.getByRole("button", { name: "Add 1 feature" }));

    expect(onAccept).toHaveBeenCalledWith([analysis.suggestions[1]]);
  });

  it("preserves an actionable retry when LM Studio fails", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <FeatureSuggestionsModal
        analysis={null}
        error="Could not reach LM Studio."
        loading={false}
        saving={false}
        onAccept={vi.fn()}
        onClose={() => undefined}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Could not reach LM Studio.");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
