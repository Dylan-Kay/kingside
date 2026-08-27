import type { Difficulty, PieceSymbol, Square } from "./types";

type AiMove = { from: Square; to: Square; promotion?: PieceSymbol };

let engine: Worker | null = null;
let boot: Promise<Worker> | null = null;
let chain: Promise<unknown> = Promise.resolve();

function publicUrl(rel: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  if (base === "./") return new URL(rel, window.location.href).toString();
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}${rel}`;
}

function waitFor(worker: Worker, match: (line: string) => boolean, ms: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      worker.removeEventListener("message", onMessage);
      reject(new Error("stockfish timeout"));
    }, ms);
    function onMessage(event: MessageEvent) {
      const line = String(event.data ?? "");
      if (!match(line)) return;
      window.clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
      resolve(line);
    }
    worker.addEventListener("message", onMessage);
  });
}

function send(worker: Worker, command: string) {
  worker.postMessage(command);
}

async function bootEngine(): Promise<Worker> {
  if (engine) return engine;
  if (boot) return boot;

  const pending = (async () => {
    const worker = new Worker(publicUrl("stockfish/stockfish-18-lite-single.js"));
    try {
      send(worker, "uci");
      await waitFor(worker, (l) => l.includes("uciok"), 8000);
      send(worker, "isready");
      await waitFor(worker, (l) => l.includes("readyok"), 8000);
      engine = worker;
      return worker;
    } catch (err) {
      worker.terminate();
      engine = null;
      throw err;
    }
  })();

  boot = pending;
  try {
    return await pending;
  } catch (err) {
    boot = null;
    throw err;
  }
}

function parseBestmove(line: string): AiMove | null {
  const match = line.match(/bestmove\s+([a-h][1-8])([a-h][1-8])([qrbn])?/i);
  if (!match) return null;
  return {
    from: match[1] as Square,
    to: match[2] as Square,
    promotion: match[3] ? (match[3].toLowerCase() as PieceSymbol) : undefined,
  };
}

function strengthFor(difficulty: Difficulty): { limit: boolean; elo: number; movetime: number } {
  if (difficulty === "hard") return { limit: false, elo: 0, movetime: 2500 };
  return { limit: true, elo: 2100, movetime: 900 };
}

export function requestStockfishMove(fen: string, difficulty: Difficulty): Promise<AiMove | null> {
  const run = async () => {
    const worker = await bootEngine();
    const { limit, elo, movetime } = strengthFor(difficulty);
    send(worker, `setoption name UCI_LimitStrength value ${limit ? "true" : "false"}`);
    if (limit) {
      send(worker, `setoption name UCI_Elo value ${elo}`);
    } else {
      send(worker, "setoption name Skill Level value 20");
    }
    send(worker, "isready");
    await waitFor(worker, (l) => l.includes("readyok"), 4000);
    send(worker, "ucinewgame");
    send(worker, `position fen ${fen}`);
    const best = waitFor(worker, (l) => l.startsWith("bestmove"), movetime + 4000);
    send(worker, `go movetime ${movetime}`);
    const line = await best;
    return parseBestmove(line);
  };

  const pending = chain.then(run, run);
  chain = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending.catch(() => null);
}
