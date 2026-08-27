import { Chess } from "chess.js";
import { useMemo, useRef, useState } from "react";
import type { Color, PieceSymbol, Square } from "chess.js";
import { filesFor, isLightSquare, kingSquare, legalMoves, ranksFor } from "@/lib/chess/engine";
import { useGameStore } from "@/lib/chess/store";
import { cn } from "@/lib/utils";
import { ChessPiece } from "./pieces";

type BoardProps = {
  interactive?: boolean;
  fen?: string;
  orientation?: Color;
  className?: string;
};

type DragState = {
  from: Square;
  originX: number;
  originY: number;
  x: number;
  y: number;
  type: PieceSymbol;
  color: Color;
};

export function Board({ interactive = true, fen: fenProp, orientation: orientationProp, className }: BoardProps) {
  const storeFen = useGameStore((s) => s.fen);
  const storeOrientation = useGameStore((s) => s.orientation);
  const storeSelected = useGameStore((s) => s.selected);
  const storeLastMove = useGameStore((s) => s.lastMove);
  const storeInCheck = useGameStore((s) => s.inCheck);
  const turn = useGameStore((s) => s.turn);
  const showCoords = useGameStore((s) => s.showCoords);
  const thinking = useGameStore((s) => s.thinking);
  const result = useGameStore((s) => s.result);
  const storePending = useGameStore((s) => s.pendingPromotion);
  const selectSquare = useGameStore((s) => s.selectSquare);
  const dropOn = useGameStore((s) => s.dropOn);
  const promote = useGameStore((s) => s.promote);
  const cancelPromotion = useGameStore((s) => s.cancelPromotion);

  const selected = interactive ? storeSelected : null;
  const lastMove = interactive ? storeLastMove : null;
  const inCheck = interactive ? storeInCheck : false;
  const pending = interactive ? storePending : null;

  const fen = fenProp ?? storeFen;
  const orientation = orientationProp ?? storeOrientation;
  const files = filesFor(orientation);
  const ranks = ranksFor(orientation);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const pieces = useMemo(() => {
    const game = new Chess(fen);
    const map = new Map<Square, { type: PieceSymbol; color: Color }>();
    for (const row of game.board()) {
      for (const cell of row) {
        if (cell) map.set(cell.square, { type: cell.type, color: cell.color });
      }
    }
    return map;
  }, [fen]);

  const dests = useMemo(() => {
    if (!interactive || !selected) return new Set<Square>();
    return new Set(legalMoves(fen, selected).map((m) => m.to));
  }, [fen, selected, interactive]);

  const checkedKing = inCheck && interactive ? kingSquare(fen, turn) : null;
  const locked = !interactive || thinking || Boolean(result);

  function squareFromPoint(clientX: number, clientY: number): Square | null {
    const el = document.elementFromPoint(clientX, clientY);
    const sq = el?.closest<HTMLElement>("[data-square]");
    return (sq?.dataset.square as Square | undefined) ?? null;
  }

  function updateDrag(next: DragState | null) {
    dragRef.current = next;
    setDrag(next);
  }

  function onPointerDown(event: React.PointerEvent, square: Square) {
    if (locked) return;
    const piece = pieces.get(square);
    if (!piece) {
      selectSquare(square);
      return;
    }
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    updateDrag({
      from: square,
      originX: event.clientX,
      originY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      type: piece.type,
      color: piece.color,
    });
  }

  function onPointerMove(event: React.PointerEvent) {
    const current = dragRef.current;
    if (!current) return;
    updateDrag({ ...current, x: event.clientX, y: event.clientY });
  }

  function onPointerUp(event: React.PointerEvent) {
    const current = dragRef.current;
    if (!current) return;
    const dest = squareFromPoint(event.clientX, event.clientY);
    const dragged = Math.hypot(event.clientX - current.originX, event.clientY - current.originY) > 8;
    updateDrag(null);
    if (dragged && dest) dropOn(current.from, dest);
    else selectSquare(dest ?? current.from);
  }

  return (
    <div className={cn("relative", className)}>
      <div
        data-testid="board"
        className="board-frame relative grid aspect-square w-full grid-cols-8 grid-rows-8 overflow-hidden touch-none select-none"
      >
        {ranks.map((rank, ri) =>
          files.map((file, fi) => {
            const square = `${file}${rank}` as Square;
            const piece = pieces.get(square);
            const light = isLightSquare(square);
            const isLast = lastMove && (lastMove.from === square || lastMove.to === square);
            const isSel = selected === square;
            const isDest = dests.has(square);
            const isCapture = isDest && Boolean(piece);
            return (
              <button
                key={square}
                type="button"
                data-square={square}
                aria-label={
                  piece
                    ? `${square}, ${piece.color === "w" ? "white" : "black"} ${piece.type}`
                    : `${square}, empty`
                }
                disabled={locked}
                onPointerDown={(e) => onPointerDown(e, square)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => updateDrag(null)}
                className={cn(
                  "relative flex items-center justify-center",
                  light ? "bg-board-light square-light" : "bg-board-dark square-dark",
                  isLast && "sq-last",
                  isSel && "sq-selected",
                  checkedKing === square && "sq-check",
                  isCapture && "legal-capture",
                )}
              >
                {showCoords && fi === 0 && (
                  <span
                    className={cn(
                      "coord absolute top-0.5 left-1 font-mono font-medium",
                      light ? "text-board-dark/70" : "text-board-light/80",
                    )}
                  >
                    {rank}
                  </span>
                )}
                {showCoords && ri === 7 && (
                  <span
                    className={cn(
                      "coord absolute right-1 bottom-0.5 font-mono font-medium",
                      light ? "text-board-dark/70" : "text-board-light/80",
                    )}
                  >
                    {file}
                  </span>
                )}
                {isDest && !piece && <span className="legal-dot pointer-events-none" />}
                {piece && (
                  <span
                    className={cn(
                      "piece-fit pointer-events-none relative z-10 block transition-transform duration-150 ease-out",
                      isSel && !drag && "piece-selected",
                      drag?.from === square && "opacity-30",
                    )}
                  >
                    <ChessPiece type={piece.type} color={piece.color} />
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>

      {drag && (
        <div
          className="pointer-events-none fixed z-40 size-16 -translate-x-1/2 -translate-y-1/2 piece-drag"
          style={{ left: drag.x, top: drag.y }}
        >
          <ChessPiece type={drag.type} color={drag.color} />
        </div>
      )}

      {pending && interactive && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/50">
          <div className="flex gap-2 rounded-xl bg-surface p-3 shadow-lg ring-1 ring-border-strong">
            {(["q", "r", "b", "n"] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-label={`Promote to ${p}`}
                className="size-14 rounded-md bg-surface-2 p-1 hover:bg-primary/10"
                onClick={() => promote(p)}
              >
                <ChessPiece type={p} color={turn} />
              </button>
            ))}
            <button
              type="button"
              className="rounded-md px-3 text-sm text-muted-foreground hover:text-foreground"
              onClick={cancelPromotion}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
