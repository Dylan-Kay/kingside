import { Chess, type Move, type PieceSymbol } from "chess.js";

type Difficulty = "easy" | "medium" | "hard";

type RequestMsg = {
  id: number;
  fen: string;
  difficulty: Difficulty;
};

type ResponseMsg = {
  id: number;
  from: string;
  to: string;
  promotion?: PieceSymbol;
};

const PIECE: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

const PAWN_PST = [
  0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10,
  25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10,
  10, 5, 0, 0, 0, 0, 0, 0, 0, 0,
];
const KNIGHT_PST = [
  -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0,
  -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50,
];
const BISHOP_PST = [
  -20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10,
  5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20,
];
const ROOK_PST = [
  0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0,
  0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5,
  0, 0, 0,
];
const QUEEN_PST = [
  -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0,
  5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];
const KING_MID = [
  -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50,
  -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20,
];
const KING_END = [
  -50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20,
  -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30,
  30, 20, -10, -30, -30, -20, -10, 0, 0, -10, -20, -30, -50, -40, -30, -20, -20, -30, -40, -50,
];

const TABLES: Record<string, number[]> = {
  p: PAWN_PST,
  n: KNIGHT_PST,
  b: BISHOP_PST,
  r: ROOK_PST,
  q: QUEEN_PST,
  k: KING_MID,
};

const INF = 1_000_000;

function sqIndex(square: string, color: "w" | "b"): number {
  const file = square.charCodeAt(0) - 97;
  const rank = square.charCodeAt(1) - 49;
  return color === "w" ? rank * 8 + file : (7 - rank) * 8 + file;
}

function evaluate(game: Chess): number {
  if (game.isCheckmate()) {
    return game.turn() === "w" ? -INF + game.history().length : INF - game.history().length;
  }
  if (game.isDraw()) return 0;

  const pieces: Array<{ type: string; color: "w" | "b"; square: string }> = [];
  let nonPawn = 0;
  let whiteBishops = 0;
  let blackBishops = 0;
  const board = game.board();
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      pieces.push(cell);
      if (cell.type === "b") {
        if (cell.color === "w") whiteBishops += 1;
        else blackBishops += 1;
      }
      if (cell.type !== "p" && cell.type !== "k") nonPawn += PIECE[cell.type] ?? 0;
    }
  }

  let score = 0;
  const endgame = nonPawn < 1300;
  for (const cell of pieces) {
    const mat = PIECE[cell.type] ?? 0;
    const table =
      cell.type === "k" && endgame
        ? KING_END
        : (TABLES[cell.type] ?? KING_MID);
    const pst = table[sqIndex(cell.square, cell.color)] ?? 0;
    const value = mat + pst;
    score += cell.color === "w" ? value : -value;
  }
  if (whiteBishops >= 2) score += 40;
  if (blackBishops >= 2) score -= 40;
  return score;
}

function evalSTM(game: Chess): number {
  const score = evaluate(game);
  return game.turn() === "w" ? score : -score;
}

function moveScore(move: Move): number {
  let s = 0;
  if (move.captured) s += 10_000 + (PIECE[move.captured] ?? 0) * 10 - (PIECE[move.piece] ?? 0);
  if (move.promotion) s += 800 + (PIECE[move.promotion] ?? 0);
  return s;
}

function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => moveScore(b) - moveScore(a));
}

function quiesce(game: Chess, alpha: number, beta: number, deadline: number, qdepth: number): number {
  const stand = evalSTM(game);
  if (performance.now() > deadline || qdepth <= 0) return stand;
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;

  const noisy = orderMoves(
    game.moves({ verbose: true }).filter((m) => m.captured || m.promotion),
  );
  for (const move of noisy) {
    game.move(move);
    const score = -quiesce(game, -beta, -alpha, deadline, qdepth - 1);
    game.undo();
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function negamax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  deadline: number,
): number {
  if (performance.now() > deadline) return evalSTM(game);
  if (game.isCheckmate()) return -INF + game.history().length;
  if (game.isDraw()) return 0;
  if (depth === 0) return quiesce(game, alpha, beta, deadline, 6);

  const moves = orderMoves(game.moves({ verbose: true }));
  if (moves.length === 0) return evalSTM(game);

  let best = -INF;
  for (const move of moves) {
    game.move(move);
    const extension = game.inCheck() ? 1 : 0;
    const score = -negamax(game, depth - 1 + extension, -beta, -alpha, deadline);
    game.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
    if (performance.now() > deadline) break;
  }
  return best;
}

function settings(difficulty: Difficulty): { maxDepth: number; budget: number } {
  if (difficulty === "easy") return { maxDepth: 1, budget: 80 };
  if (difficulty === "medium") return { maxDepth: 3, budget: 700 };
  return { maxDepth: 5, budget: 2800 };
}

function pickMove(fen: string, difficulty: Difficulty): Move | null {
  const game = new Chess(fen);
  const rootMoves = orderMoves(game.moves({ verbose: true }));
  if (rootMoves.length === 0) return null;

  const { maxDepth, budget } = settings(difficulty);
  const deadline = performance.now() + budget;

  let best = rootMoves[0]!;
  const scored: Array<{ move: Move; score: number }> = [];

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    if (performance.now() > deadline) break;
    let iterBest = best;
    let iterScore = -INF;
    const iterScored: Array<{ move: Move; score: number }> = [];
    const ordered = [best, ...rootMoves.filter((m) => m.san !== best.san)];

    for (const move of ordered) {
      if (performance.now() > deadline) break;
      game.move(move);
      const score = -negamax(game, depth - 1, -INF, INF, deadline);
      game.undo();
      iterScored.push({ move, score });
      if (score > iterScore) {
        iterScore = score;
        iterBest = move;
      }
    }

    if (iterScored.length === rootMoves.length || depth === 1) {
      best = iterBest;
      scored.length = 0;
      scored.push(...iterScored);
    }
  }

  if (difficulty === "easy") {
    if (Math.random() < 0.45) {
      return rootMoves[Math.floor(Math.random() * rootMoves.length)]!;
    }
    if (scored.length > 0) {
      scored.sort((a, b) => b.score - a.score);
      const pool = scored.slice(0, Math.min(6, scored.length));
      return pool[Math.floor(Math.random() * pool.length)]!.move;
    }
    return rootMoves[Math.floor(Math.random() * rootMoves.length)]!;
  }

  return best;
}

self.onmessage = (event: MessageEvent<RequestMsg>) => {
  const { id, fen, difficulty } = event.data;
  const move = pickMove(fen, difficulty);
  if (!move) {
    postMessage({ id, from: "", to: "" } satisfies ResponseMsg);
    return;
  }
  const reply: ResponseMsg = {
    id,
    from: move.from,
    to: move.to,
    promotion: move.promotion,
  };
  postMessage(reply);
};
