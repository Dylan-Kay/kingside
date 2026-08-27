import { create } from "zustand";
import type { Color, PieceSymbol, Square } from "chess.js";
import { requestAiMove } from "./ai";
import {
  capturedFromHistory,
  createGame,
  historyEntries,
  isLegalDest,
  needsPromotion,
  resultOf,
  tryMove,
  undoOnce,
} from "./engine";
import { clearSave, loadSave, loadSettings, writeSave, writeSettings } from "./persist";
import { playSfx, setSoundEnabled, unlockAudio } from "./sounds";
import type {
  Clocks,
  Difficulty,
  GameResult,
  HistoryEntry,
  LastMove,
  Mode,
  PendingPromotion,
  Screen,
  TimeControl,
} from "./types";
import { START_FEN } from "./types";

type GameState = {
  screen: Screen;
  fen: string;
  pgn: string;
  turn: Color;
  mode: Mode;
  difficulty: Difficulty;
  playerColor: Color;
  selected: Square | null;
  pendingPromotion: PendingPromotion | null;
  lastMove: LastMove | null;
  history: HistoryEntry[];
  captured: { w: PieceSymbol[]; b: PieceSymbol[] };
  orientation: Color;
  autoFlip: boolean;
  showCoords: boolean;
  sound: boolean;
  inCheck: boolean;
  result: GameResult | null;
  thinking: boolean;
  clocks: Clocks | null;
  incrementMs: number;
  timeLabel: string | null;
  timeControl: TimeControl | null;
  clockSyncAt: number | null;
  hasSave: boolean;
  hydrate: () => void;
  startGame: (opts: {
    mode: Mode;
    difficulty: Difficulty;
    playerColor: Color;
    timeControl: TimeControl | null;
  }) => void;
  resumeGame: () => void;
  goMenu: () => void;
  selectSquare: (square: Square) => void;
  dropOn: (from: Square, to: Square) => void;
  promote: (piece: PieceSymbol) => void;
  cancelPromotion: () => void;
  undo: () => void;
  resign: () => void;
  agreeDraw: () => void;
  flipBoard: () => void;
  setAutoFlip: (value: boolean) => void;
  setSound: (value: boolean) => void;
  setShowCoords: (value: boolean) => void;
  flagTimeout: (color: Color) => void;
};

function persistNow(state: GameState) {
  if (state.screen !== "play" || state.result) {
    if (state.result) clearSave();
    return;
  }
  writeSave({
    fen: state.fen,
    pgn: state.pgn,
    mode: state.mode,
    difficulty: state.difficulty,
    playerColor: state.playerColor,
    clocks: state.clocks,
    incrementMs: state.incrementMs,
    timeLabel: state.timeLabel,
    timeControl: state.timeControl,
    orientation: state.orientation,
    autoFlip: state.autoFlip,
    version: 1,
  });
}

function persistSettings(state: Pick<GameState, "sound" | "autoFlip" | "showCoords">) {
  writeSettings({
    version: 1,
    sound: state.sound,
    autoFlip: state.autoFlip,
    showCoords: state.showCoords,
  });
}

function orientationFor(state: {
  mode: Mode;
  autoFlip: boolean;
  turn: Color;
  playerColor: Color;
  result: GameResult | null;
}): Color {
  if (state.result) return state.mode === "cpu" ? state.playerColor : "w";
  if (state.mode === "cpu") return state.playerColor;
  if (state.autoFlip) return state.turn;
  return "w";
}

function playForMove(move: {
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  san: string;
  isKingsideCastle?: () => boolean;
  isQueensideCastle?: () => boolean;
  isCastle?: () => boolean;
}, check: boolean, ended: boolean) {
  if (ended) {
    playSfx("end");
    return;
  }
  if (move.promotion) playSfx("promote");
  else if (move.isCastle?.() || move.san.startsWith("O-O")) playSfx("castle");
  else if (move.captured) playSfx("capture");
  else playSfx("move");
  if (check) playSfx("check");
}

export const useGameStore = create<GameState>()((set, get) => ({
  screen: "menu",
  fen: START_FEN,
  pgn: "",
  turn: "w",
  mode: "local",
  difficulty: "medium",
  playerColor: "w",
  selected: null,
  pendingPromotion: null,
  lastMove: null,
  history: [],
  captured: { w: [], b: [] },
  orientation: "w",
  autoFlip: true,
  showCoords: true,
  sound: true,
  inCheck: false,
  result: null,
  thinking: false,
  clocks: null,
  incrementMs: 0,
  timeLabel: null,
  timeControl: null,
  clockSyncAt: null,
  hasSave: false,

  hydrate: () => {
    const settings = loadSettings();
    const save = loadSave();
    setSoundEnabled(settings.sound);
    set({
      sound: settings.sound,
      autoFlip: settings.autoFlip,
      showCoords: settings.showCoords,
      hasSave: Boolean(save),
    });
  },

  startGame: ({ mode, difficulty, playerColor, timeControl }) => {
    unlockAudio();
    const game = createGame();
    game.setHeader("Event", "Kingside");
    game.setHeader("Site", "Local table");
    game.setHeader("White", mode === "cpu" && playerColor === "b" ? "House" : "White");
    game.setHeader("Black", mode === "cpu" && playerColor === "w" ? "House" : "Black");
    const clocks = timeControl
      ? { w: timeControl.initialMs, b: timeControl.initialMs }
      : null;
    const next: Partial<GameState> = {
      screen: "play",
      fen: game.fen(),
      pgn: game.pgn(),
      turn: "w",
      mode,
      difficulty,
      playerColor,
      selected: null,
      pendingPromotion: null,
      lastMove: null,
      history: [],
      captured: { w: [], b: [] },
      result: null,
      inCheck: false,
      thinking: false,
      clocks,
      incrementMs: timeControl?.incrementMs ?? 0,
      timeLabel: timeControl?.label ?? null,
      timeControl,
      clockSyncAt: clocks ? performance.now() : null,
      orientation:
        mode === "cpu" ? playerColor : get().autoFlip ? "w" : "w",
      hasSave: true,
    };
    set(next as GameState);
    persistNow({ ...get() });
    if (mode === "cpu" && playerColor === "b") {
      void getAiToMove();
    }
  },

  resumeGame: () => {
    const save = loadSave();
    if (!save) return;
    unlockAudio();
    const game = createGame();
    try {
      if (save.pgn.trim()) game.loadPgn(save.pgn);
      else game.load(save.fen);
    } catch {
      game.load(save.fen);
    }
    const history = historyEntries(game.fen(), game.pgn());
    const last = history[history.length - 1];
    const result = resultOf(game);
    set({
      screen: "play",
      fen: game.fen(),
      pgn: game.pgn(),
      turn: game.turn(),
      mode: save.mode,
      difficulty: save.difficulty,
      playerColor: save.playerColor,
      selected: null,
      pendingPromotion: null,
      lastMove: last ? { from: last.from, to: last.to } : null,
      history,
      captured: capturedFromHistory(history),
      orientation: save.orientation,
      autoFlip: save.autoFlip,
      inCheck: game.isCheck(),
      result,
      thinking: false,
      clocks: save.clocks,
      incrementMs: save.incrementMs,
      timeLabel: save.timeLabel,
      timeControl: save.timeControl ?? null,
      clockSyncAt: save.clocks && !result ? performance.now() : null,
    });
    if (!result && save.mode === "cpu" && game.turn() !== save.playerColor) {
      void getAiToMove();
    }
  },

  goMenu: () => {
    const save = loadSave();
    set({
      screen: "menu",
      selected: null,
      pendingPromotion: null,
      thinking: false,
      hasSave: Boolean(save) && !get().result,
    });
  },

  selectSquare: (square) => {
    const state = get();
    if (state.screen !== "play" || state.result || state.thinking || state.pendingPromotion) return;
    if (state.mode === "cpu" && state.turn !== state.playerColor) return;

    const game = createGame(state.fen);
    const piece = game.get(square);

    if (state.selected && state.selected !== square) {
      if (isLegalDest(state.fen, state.selected, square)) {
        applyHumanMove(state.selected, square);
        return;
      }
    }

    if (piece && piece.color === state.turn) {
      set({ selected: square });
      return;
    }

    if (state.selected) {
      playSfx("illegal");
      set({ selected: null });
    }
  },

  dropOn: (from, to) => {
    const state = get();
    if (state.screen !== "play" || state.result || state.thinking || state.pendingPromotion) return;
    if (state.mode === "cpu" && state.turn !== state.playerColor) return;
    if (from === to) {
      get().selectSquare(to);
      return;
    }
    if (!isLegalDest(state.fen, from, to)) {
      playSfx("illegal");
      set({ selected: null });
      return;
    }
    applyHumanMove(from, to);
  },

  promote: (piece) => {
    const pending = get().pendingPromotion;
    if (!pending) return;
    commitMove(pending.from, pending.to, piece);
  },

  cancelPromotion: () => set({ pendingPromotion: null, selected: null }),

  undo: () => {
    const state = get();
    if (state.screen !== "play" || state.thinking || state.result) return;
    let next = undoOnce(state.pgn);
    if (!next) return;
    if (state.mode === "cpu") {
      const twice = undoOnce(next.pgn);
      if (twice) next = twice;
    }
    const game = createGame(next.fen);
    try {
      if (next.pgn.trim()) game.loadPgn(next.pgn);
    } catch {
      game.load(next.fen);
    }
    const history = historyEntries(game.fen(), game.pgn());
    const last = history[history.length - 1];
    set({
      fen: game.fen(),
      pgn: game.pgn(),
      turn: game.turn(),
      history,
      captured: capturedFromHistory(history),
      lastMove: last ? { from: last.from, to: last.to } : null,
      selected: null,
      pendingPromotion: null,
      inCheck: game.isCheck(),
      orientation: orientationFor({
        mode: state.mode,
        autoFlip: state.autoFlip,
        turn: game.turn(),
        playerColor: state.playerColor,
        result: null,
      }),
    });
    persistNow({ ...get() });
  },

  resign: () => {
    const state = get();
    if (state.screen !== "play" || state.result) return;
    const loser = state.mode === "cpu" ? state.playerColor : state.turn;
    const winner: Color = loser === "w" ? "b" : "w";
    playSfx("end");
    set({
      result: { winner, reason: "resign" },
      selected: null,
      pendingPromotion: null,
      thinking: false,
      clockSyncAt: null,
    });
    clearSave();
  },

  agreeDraw: () => {
    const state = get();
    if (state.screen !== "play" || state.result) return;
    playSfx("end");
    set({
      result: { winner: "draw", reason: "agreement" },
      selected: null,
      pendingPromotion: null,
      thinking: false,
      clockSyncAt: null,
    });
    clearSave();
  },

  flipBoard: () => set({ orientation: get().orientation === "w" ? "b" : "w" }),

  setAutoFlip: (value) => {
    set({ autoFlip: value });
    persistSettings(get());
    const state = get();
    if (state.screen === "play" && state.mode === "local") {
      set({ orientation: orientationFor({ ...state, autoFlip: value }) });
    }
  },

  setSound: (value) => {
    setSoundEnabled(value);
    set({ sound: value });
    persistSettings(get());
  },

  setShowCoords: (value) => {
    set({ showCoords: value });
    persistSettings(get());
  },

  flagTimeout: (color) => {
    const state = get();
    if (state.result || !state.clocks) return;
    playSfx("end");
    set({
      result: { winner: color === "w" ? "b" : "w", reason: "timeout" },
      thinking: false,
      selected: null,
      pendingPromotion: null,
      clockSyncAt: null,
    });
    clearSave();
  },
}));

function applyHumanMove(from: Square, to: Square) {
  const state = useGameStore.getState();
  if (needsPromotion(state.fen, from, to)) {
    useGameStore.setState({ pendingPromotion: { from, to }, selected: from });
    return;
  }
  commitMove(from, to);
}

function settleClocks(prevTurn: Color): Partial<GameState> {
  const state = useGameStore.getState();
  if (!state.clocks || !state.clockSyncAt) return {};
  const elapsed = performance.now() - state.clockSyncAt;
  const remaining = Math.max(0, state.clocks[prevTurn] - elapsed);
  return {
    clocks: {
      ...state.clocks,
      [prevTurn]: remaining + state.incrementMs,
    },
    clockSyncAt: performance.now(),
  };
}

function commitMove(from: Square, to: Square, promotion?: PieceSymbol) {
  const state = useGameStore.getState();
  const applied = tryMove(state.fen, from, to, promotion, state.pgn);
  if (!applied.ok) {
    playSfx("illegal");
    useGameStore.setState({ selected: null, pendingPromotion: null });
    return;
  }
  const { game, move } = applied;
  const history = historyEntries(game.fen(), game.pgn());
  const result = resultOf(game);
  const clockPatch = settleClocks(state.turn);
  playForMove(move, game.isCheck(), Boolean(result));
  useGameStore.setState({
    fen: game.fen(),
    pgn: game.pgn(),
    turn: game.turn(),
    history,
    captured: capturedFromHistory(history),
    lastMove: { from: move.from, to: move.to },
    selected: null,
    pendingPromotion: null,
    inCheck: game.isCheck(),
    result,
    thinking: false,
    orientation: orientationFor({
      mode: state.mode,
      autoFlip: state.autoFlip,
      turn: game.turn(),
      playerColor: state.playerColor,
      result,
    }),
    clockSyncAt: result ? null : (clockPatch.clockSyncAt ?? state.clockSyncAt),
    clocks: (clockPatch.clocks as Clocks | undefined) ?? state.clocks,
  });
  const next = useGameStore.getState();
  persistNow(next);
  if (!result && next.mode === "cpu" && next.turn !== next.playerColor) {
    void getAiToMove();
  }
}

async function getAiToMove() {
  const snapshot = useGameStore.getState();
  if (snapshot.result || snapshot.mode !== "cpu") return;
  useGameStore.setState({ thinking: true, selected: null });
  const move = await requestAiMove(snapshot.fen, snapshot.difficulty);
  const latest = useGameStore.getState();
  if (latest.fen !== snapshot.fen || latest.result || latest.screen !== "play") {
    useGameStore.setState({ thinking: false });
    return;
  }
  if (!move) {
    useGameStore.setState({ thinking: false });
    return;
  }
  commitMove(move.from, move.to, move.promotion);
}
