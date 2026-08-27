import type { Color, PieceSymbol, Square } from "chess.js";

export type { Color, PieceSymbol, Square };

export type Mode = "local" | "cpu";
export type Difficulty = "easy" | "medium" | "hard";
export type Screen = "menu" | "play";

export type EndReason =
  | "checkmate"
  | "stalemate"
  | "insufficient"
  | "repetition"
  | "fifty"
  | "resign"
  | "timeout"
  | "agreement";

export type GameResult = {
  winner: Color | "draw";
  reason: EndReason;
};

export type TimeControl = {
  initialMs: number;
  incrementMs: number;
  label: string;
};

export type Clocks = {
  w: number;
  b: number;
};

export type PendingPromotion = {
  from: Square;
  to: Square;
};

export type LastMove = {
  from: Square;
  to: Square;
};

export type HistoryEntry = {
  san: string;
  from: Square;
  to: Square;
  color: Color;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
};

export const TIME_CONTROLS: Array<TimeControl | null> = [
  null,
  { initialMs: 3 * 60 * 1000, incrementMs: 2000, label: "3+2" },
  { initialMs: 5 * 60 * 1000, incrementMs: 0, label: "5 min" },
  { initialMs: 10 * 60 * 1000, incrementMs: 0, label: "10 min" },
  { initialMs: 15 * 60 * 1000, incrementMs: 10_000, label: "15+10" },
];

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
