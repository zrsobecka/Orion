import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { desktopRuntime } from "../../infrastructure/desktop-runtime";
import { TitleBar } from "./TitleBar";

vi.mock("../../infrastructure/desktop-runtime", () => ({
  desktopRuntime: {
    closeWindow: vi.fn().mockResolvedValue(undefined),
    minimizeWindow: vi.fn().mockResolvedValue(undefined),
    toggleMaximizeWindow: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("TitleBar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exposes familiar window controls", () => {
    render(<TitleBar />);

    expect(screen.getByRole("button", { name: "Minimize Orion" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Maximize or restore Orion" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close Orion" })).toBeInTheDocument();
  });

  it("routes each window control through the desktop runtime", async () => {
    const user = userEvent.setup();
    render(<TitleBar />);

    await user.click(screen.getByRole("button", { name: "Minimize Orion" }));
    await user.click(screen.getByRole("button", { name: "Maximize or restore Orion" }));
    await user.click(screen.getByRole("button", { name: "Close Orion" }));

    expect(desktopRuntime.minimizeWindow).toHaveBeenCalledOnce();
    expect(desktopRuntime.toggleMaximizeWindow).toHaveBeenCalledOnce();
    expect(desktopRuntime.closeWindow).toHaveBeenCalledOnce();
  });

  it("toggles maximize when the draggable area is double-clicked", () => {
    render(<TitleBar />);

    fireEvent.doubleClick(screen.getByRole("banner"));

    expect(desktopRuntime.toggleMaximizeWindow).toHaveBeenCalledOnce();
  });
});
