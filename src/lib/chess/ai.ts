import type { Difficulty, PieceSymbol, Square } from "./types";
import { legalMoves } from "./engine";
import { requestStockfishMove } from "./stockfish";

type AiMove = { from: Square; to: Square; promotion?: PieceSymbol };

type WorkerReply = {
  id: number;
  from: string;
  to: string;
  promotion?: PieceSymbol;
};

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (move: AiMove | null) => void>();

function getWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  if (!worker) {
    worker = new Worker(new URL("./ai.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const resolve = pending.get(event.data.id);
      if (!resolve) return;
      pending.delete(event.data.id);
      if (!event.data.from || !event.data.to) {
        resolve(null);
        return;
      }
      resolve({
        from: event.data.from as Square,
        to: event.data.to as Square,
        promotion: event.data.promotion,
      });
    };
    worker.onerror = () => {
      for (const resolve of pending.values()) resolve(null);
      pending.clear();
    };
  }
  return worker;
}

function randomLegal(fen: string): AiMove | null {
  const moves = legalMoves(fen);
  if (moves.length === 0) return null;
  const move = moves[Math.floor(Math.random() * moves.length)]!;
  return { from: move.from, to: move.to, promotion: move.promotion };
}

function requestHouseMove(fen: string, difficulty: Difficulty): Promise<AiMove | null> {
  const w = getWorker();
  if (!w) return Promise.resolve(randomLegal(fen));

  const id = ++seq;
  const timeoutMs = difficulty === "easy" ? 2000 : difficulty === "medium" ? 4000 : 9000;
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      pending.delete(id);
      resolve(randomLegal(fen));
    }, timeoutMs);
    pending.set(id, (move) => {
      window.clearTimeout(timer);
      resolve(move ?? randomLegal(fen));
    });
    w.postMessage({ id, fen, difficulty });
  });
}

export async function requestAiMove(fen: string, difficulty: Difficulty): Promise<AiMove | null> {
  if (difficulty === "easy") return requestHouseMove(fen, "easy");
  const stockfish = await requestStockfishMove(fen, difficulty);
  if (stockfish) return stockfish;
  return requestHouseMove(fen, difficulty);
}
