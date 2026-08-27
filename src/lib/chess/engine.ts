import { Chess, type Color, type Move, type PieceSymbol, type Square } from "chess.js";
import type { EndReason, GameResult, HistoryEntry } from "./types";

export function createGame(fen?: string): Chess {
  return fen ? new Chess(fen) : new Chess();
}

/** Replay the full game from PGN when we have it, otherwise a FEN snapshot. */
export function loadGame(fen?: string, pgn?: string): Chess {
  const game = new Chess();
  if (pgn?.trim()) {
    try {
      game.loadPgn(pgn);
      return game;
    } catch {
      /* fall through to FEN */
    }
  }
  if (fen) game.load(fen);
  return game;
}

export function historyFromGame(game: Chess): HistoryEntry[] {
  return game.history({ verbose: true }).map((m) => ({
    san: m.san,
    from: m.from,
    to: m.to,
    color: m.color,
    captured: m.captured,
    promotion: m.promotion,
  }));
}

export function legalMoves(fen: string, square?: Square): Move[] {
  const game = createGame(fen);
  return square
    ? game.moves({ square, verbose: true })
    : game.moves({ verbose: true });
}

export function tryMove(
  fen: string,
  from: Square,
  to: Square,
  promotion?: PieceSymbol,
  pgn = "",
): { ok: true; game: Chess; move: Move } | { ok: false } {
  const game = loadGame(fen, pgn);
  try {
    const move = game.move({ from, to, promotion });
    if (!move) return { ok: false };
    return { ok: true, game, move };
  } catch {
    return { ok: false };
  }
}


export function needsPromotion(fen: string, from: Square, to: Square): boolean {
  const game = createGame(fen);
  const moves = game.moves({ square: from, verbose: true }).filter((m) => m.to === to);
  return moves.some((m) => Boolean(m.promotion));
}

export function isLegalDest(fen: string, from: Square, to: Square): boolean {
  const game = createGame(fen);
  return game.moves({ square: from, verbose: true }).some((m) => m.to === to);
}

export function pieceAt(fen: string, square: Square) {
  return createGame(fen).get(square);
}

export function kingSquare(fen: string, color: Color): Square | null {
  const found = createGame(fen).findPiece({ type: "k", color });
  return found[0] ?? null;
}

export function historyEntries(fen: string, pgn: string): HistoryEntry[] {
  return historyFromGame(loadGame(fen, pgn));
}

export function capturedFromHistory(history: HistoryEntry[]): { w: PieceSymbol[]; b: PieceSymbol[] } {
  const w: PieceSymbol[] = [];
  const b: PieceSymbol[] = [];
  for (const move of history) {
    if (!move.captured) continue;
    if (move.color === "w") w.push(move.captured);
    else b.push(move.captured);
  }
  return { w, b };
}

export function resultOf(game: Chess): GameResult | null {
  if (!game.isGameOver()) return null;
  if (game.isCheckmate()) {
    return {
      winner: game.turn() === "w" ? "b" : "w",
      reason: "checkmate",
    };
  }
  let reason: EndReason = "agreement";
  if (game.isStalemate()) reason = "stalemate";
  else if (game.isThreefoldRepetition()) reason = "repetition";
  else if (game.isInsufficientMaterial()) reason = "insufficient";
  else if (game.isDrawByFiftyMoves()) reason = "fifty";
  return { winner: "draw", reason };
}

export function undoOnce(pgn: string): { fen: string; pgn: string } | null {
  const game = createGame();
  if (!pgn.trim()) return null;
  try {
    game.loadPgn(pgn);
  } catch {
    return null;
  }
  const undone = game.undo();
  if (!undone) return null;
  return { fen: game.fen(), pgn: game.pgn() };
}

export function formatMs(ms: number): string {
  const clamped = Math.max(0, ms);
  if (clamped < 10_000) {
    const totalTenths = Math.ceil(clamped / 100);
    const secs = Math.floor(totalTenths / 10);
    const tenths = totalTenths % 10;
    const m = Math.floor(secs / 60);
    const r = secs % 60;
    return `${m}:${r.toString().padStart(2, "0")}.${tenths}`;
  }
  const totalSecs = Math.ceil(clamped / 1000);
  const m = Math.floor(totalSecs / 60);
  const r = totalSecs % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function resultLabel(result: GameResult): string {
  if (result.winner === "draw") {
    switch (result.reason) {
      case "stalemate":
        return "Stalemate";
      case "repetition":
        return "Draw by repetition";
      case "insufficient":
        return "Draw by insufficient material";
      case "fifty":
        return "Draw by fifty-move rule";
      default:
        return "Drawn by agreement";
    }
  }
  const side = result.winner === "w" ? "White" : "Black";
  switch (result.reason) {
    case "checkmate":
      return `${side} wins by checkmate`;
    case "timeout":
      return `${side} wins on time`;
    case "resign":
      return `${side} wins by resignation`;
    default:
      return `${side} wins`;
  }
}

export function filesFor(orientation: Color): string[] {
  return orientation === "w"
    ? ["a", "b", "c", "d", "e", "f", "g", "h"]
    : ["h", "g", "f", "e", "d", "c", "b", "a"];
}

export function ranksFor(orientation: Color): number[] {
  return orientation === "w" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
}

export function isLightSquare(square: Square): boolean {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  return (file + rank) % 2 === 0;
}
