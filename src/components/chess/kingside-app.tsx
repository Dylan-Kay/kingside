import { useEffect } from "react";
import { Toaster } from "sonner";
import { unlockAudio } from "@/lib/chess/sounds";
import { useGameStore } from "@/lib/chess/store";
import { Menu } from "./menu";
import { TableView } from "./table-view";

export function KingsideApp() {
  const screen = useGameStore((s) => s.screen);
  const hydrate = useGameStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    const onVis = () => {
      if (document.visibilityState === "visible") unlockAudio();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [hydrate]);

  return (
    <div className="felt min-h-dvh text-foreground">
      {screen === "menu" ? <Menu /> : <TableView />}
      <Toaster
        theme="dark"
        position="bottom-center"
        toastOptions={{
          className: "bg-surface text-foreground border border-border-strong",
        }}
      />
    </div>
  );
}
