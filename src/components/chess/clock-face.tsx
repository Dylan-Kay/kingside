import { useEffect, useState } from "react";
import type { Color } from "chess.js";
import { formatMs } from "@/lib/chess/engine";
import { useGameStore } from "@/lib/chess/store";
import { cn } from "@/lib/utils";

export function ClockFace({ color, name }: { color: Color; name: string }) {
  const clocks = useGameStore((s) => s.clocks);
  const turn = useGameStore((s) => s.turn);
  const syncAt = useGameStore((s) => s.clockSyncAt);
  const result = useGameStore((s) => s.result);
  const screen = useGameStore((s) => s.screen);
  const thinking = useGameStore((s) => s.thinking);
  const flagTimeout = useGameStore((s) => s.flagTimeout);
  const captured = useGameStore((s) => s.captured[color === "w" ? "w" : "b"]);

  const running = screen === "play" && !result && Boolean(clocks);
  const active = running && turn === color;
  const [remaining, setRemaining] = useState(clocks?.[color] ?? 0);

  useEffect(() => {
    if (!clocks) {
      setRemaining(0);
      return;
    }
    let raf = 0;
    const loop = () => {
      let value = clocks[color];
      if (running && turn === color && syncAt) {
        value = Math.max(0, clocks[color] - (performance.now() - syncAt));
      }
      setRemaining(value);
      if (running && turn === color && value <= 0) {
        flagTimeout(color);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [clocks, color, running, turn, syncAt, flagTimeout]);

  const low = Boolean(clocks) && remaining < 20_000 && active;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg px-4 py-3",
        active ? "bg-primary text-primary-foreground" : "bg-surface-2 text-foreground",
        low && "bg-danger text-danger-foreground",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className={cn("text-xs", active ? "opacity-70" : "text-muted-foreground")}>
          {captured.length > 0 ? `${captured.length} taken` : color === "w" ? "White" : "Black"}
          {thinking && color === turn ? " · thinking" : ""}
        </p>
      </div>
      {clocks ? (
        <p className="font-mono text-xl tabular-nums tracking-tight">{formatMs(remaining)}</p>
      ) : (
        <p className="font-mono text-sm tabular-nums text-muted-foreground">untimed</p>
      )}
    </div>
  );
}
