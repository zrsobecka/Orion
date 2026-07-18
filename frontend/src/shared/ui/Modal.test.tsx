import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("focuses the intended field and closes with Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal title="Add a feature" onClose={onClose}>
        <input aria-label="Feature name" data-initial-focus />
      </Modal>,
    );

    await waitFor(() => expect(screen.getByLabelText("Feature name")).toHaveFocus());
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps Tab focus inside the dialog", async () => {
    const user = userEvent.setup();
    render(
      <Modal title="Add a feature" onClose={() => undefined}>
        <input aria-label="Feature name" data-initial-focus />
        <button type="button">Save</button>
      </Modal>,
    );

    const saveButton = screen.getByRole("button", { name: "Save" });
    saveButton.focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
  });

  it("applies the large size variant", () => {
    render(
      <Modal size="large" title="Repository feature scan" onClose={() => undefined}>
        Loading…
      </Modal>,
    );

    expect(screen.getByRole("dialog")).toHaveClass("modal--large");
  });
});
