import { Minus, Square, X } from "lucide-react";
import type { MouseEvent } from "react";
import { desktopRuntime } from "../../infrastructure/desktop-runtime";
import { OrionLogo } from "../../shared/ui/OrionLogo";

function runWindowAction(action: () => Promise<void>) {
  void action().catch((error: unknown) => {
    console.error("Orion window action failed.", error);
  });
}

export function TitleBar() {
  const handleDoubleClick = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    runWindowAction(desktopRuntime.toggleMaximizeWindow);
  };

  return (
    <header className="title-bar" data-tauri-drag-region onDoubleClick={handleDoubleClick}>
      <div className="title-bar__brand" data-tauri-drag-region>
        <OrionLogo className="title-bar__logo" size={20} />
        <strong data-tauri-drag-region>ORION</strong>
        <span data-tauri-drag-region>Project Mission Control</span>
      </div>

      <div className="title-bar__controls">
        <button
          aria-label="Minimize Orion"
          className="title-bar__control"
          onClick={() => runWindowAction(desktopRuntime.minimizeWindow)}
          type="button"
        >
          <Minus size={16} strokeWidth={1.6} />
        </button>
        <button
          aria-label="Maximize or restore Orion"
          className="title-bar__control"
          onClick={() => runWindowAction(desktopRuntime.toggleMaximizeWindow)}
          type="button"
        >
          <Square size={13} strokeWidth={1.6} />
        </button>
        <button
          aria-label="Close Orion"
          className="title-bar__control title-bar__control--close"
          onClick={() => runWindowAction(desktopRuntime.closeWindow)}
          type="button"
        >
          <X size={17} strokeWidth={1.6} />
        </button>
      </div>
    </header>
  );
}
