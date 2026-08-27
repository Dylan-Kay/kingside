import type { Color, PieceSymbol } from "chess.js";
import { ChessPiece, PIECE_ORDER } from "./pieces";

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function sorted(list: PieceSymbol[]): PieceSymbol[] {
  return [...list].sort((a, b) => PIECE_ORDER.indexOf(a) - PIECE_ORDER.indexOf(b));
}

export function CapturedRow({
  by,
  pieces,
}: {
  by: Color;
  pieces: PieceSymbol[];
}) {
  const material = pieces.reduce((sum, p) => sum + (VALUE[p] ?? 0), 0);
  if (pieces.length === 0) {
    return <p className="h-8 text-xs text-muted-foreground">No captures</p>;
  }
  return (
    <div className="flex min-h-8 flex-wrap items-center gap-0.5">
      {sorted(pieces).map((p, i) => (
        <span key={`${p}-${i}`} className="size-6">
          <ChessPiece type={p} color={by === "w" ? "b" : "w"} />
        </span>
      ))}
      {material > 0 && (
        <span className="ml-1 font-mono text-xs tabular-nums text-muted-foreground">+{material}</span>
      )}
    </div>
  );
}
