import { useEffect, useRef } from "react";
import { useGameStore } from "@/lib/chess/store";
import { cn } from "@/lib/utils";

export function MoveList() {
  const history = useGameStore((s) => s.history);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [history.length]);

  const rows: Array<{ n: number; w?: string; b?: string }> = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push({ n: i / 2 + 1, w: history[i]?.san, b: history[i + 1]?.san });
  }

  if (rows.length === 0) {
    return <p className="px-1 py-2 text-sm text-muted-foreground">Moves will land here.</p>;
  }

  return (
    <div ref={scroller} className="max-h-56 overflow-auto pr-1 font-mono text-sm leading-7">
      {rows.map((row, idx) => {
        const isLast = idx === rows.length - 1;
        return (
          <div key={row.n} className="grid grid-cols-[2rem_1fr_1fr] gap-2">
            <span className="text-muted-foreground tabular-nums">{row.n}.</span>
            <span className={cn(isLast && !row.b && "rounded-sm bg-surface-2 px-1")}>{row.w}</span>
            <span className={cn(isLast && row.b && "rounded-sm bg-surface-2 px-1")}>{row.b ?? ""}</span>
          </div>
        );
      })}
    </div>
  );
}
