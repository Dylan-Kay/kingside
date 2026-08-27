import type { Clocks, Color, Difficulty, Mode, TimeControl } from "./types";

const SAVE_KEY = "kingside.save.v1";
const SETTINGS_KEY = "kingside.settings.v1";
const VERSION = 1;

export type SaveBlob = {
  version: number;
  fen: string;
  pgn: string;
  mode: Mode;
  difficulty: Difficulty;
  playerColor: Color;
  clocks: Clocks | null;
  incrementMs: number;
  timeLabel: string | null;
  timeControl: TimeControl | null;
  orientation: Color;
  autoFlip: boolean;
};

export type SettingsBlob = {
  version: number;
  sound: boolean;
  autoFlip: boolean;
  showCoords: boolean;
};

const defaultSettings: SettingsBlob = {
  version: VERSION,
  sound: true,
  autoFlip: true,
  showCoords: true,
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota */
  }
}

export function loadSave(): SaveBlob | null {
  const save = readJson<SaveBlob>(SAVE_KEY);
  if (!save || save.version !== VERSION) return null;
  if (!save.fen || !save.mode) return null;
  return save;
}

export function writeSave(save: SaveBlob) {
  writeJson(SAVE_KEY, { ...save, version: VERSION });
}

export function clearSave() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSettings(): SettingsBlob {
  const s = readJson<SettingsBlob>(SETTINGS_KEY);
  if (!s || s.version !== VERSION) return { ...defaultSettings };
  return { ...defaultSettings, ...s, version: VERSION };
}

export function writeSettings(settings: SettingsBlob) {
  writeJson(SETTINGS_KEY, { ...settings, version: VERSION });
}
