import { Bot, RotateCcw, Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { START_FEN, TIME_CONTROLS, type Color, type Difficulty, type Mode, type TimeControl } from "@/lib/chess/types";
import { useGameStore } from "@/lib/chess/store";
import { cn } from "@/lib/utils";
import { Board } from "./board";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export function Menu() {
  const startGame = useGameStore((s) => s.startGame);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const hasSave = useGameStore((s) => s.hasSave);
  const [mode, setMode] = useState<Mode>("local");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [playerColor, setPlayerColor] = useState<Color>("w");
  const [timeControl, setTimeControl] = useState<TimeControl | null>(null);

  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-16 lg:px-10">
      <div className="flex flex-col gap-8">
        <div className="space-y-3">
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
            Over the board
          </p>
          <h1 className="font-display text-5xl font-medium tracking-tight text-foreground sm:text-6xl">
            Kingside
          </h1>
          <p className="max-w-md text-base text-muted-foreground italic font-display">
            Two seats. One table. Full rules, no accounts.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface p-2">
          <ModeCard
            active={mode === "local"}
            icon={<Users className="size-4" />}
            title="Pass & Play"
            copy="Two players, one device"
            onClick={() => setMode("local")}
          />
          <ModeCard
            active={mode === "cpu"}
            icon={<Bot className="size-4" />}
            title="Versus House"
            copy="You against the engine"
            onClick={() => setMode("cpu")}
          />
        </div>

        {mode === "cpu" && (
          <div className="space-y-4">
            <Field label="Seat">
              <Chip
                active={playerColor === "w"}
                onClick={() => setPlayerColor("w")}
              >
                White
              </Chip>
              <Chip
                active={playerColor === "b"}
                onClick={() => setPlayerColor("b")}
              >
                Black
              </Chip>
            </Field>
            <Field label="Strength">
              {DIFFICULTIES.map((d) => (
                <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
                  {d}
                </Chip>
              ))}
            </Field>
          </div>
        )}

        <Field label="Clock">
          {TIME_CONTROLS.map((tc) => (
            <Chip
              key={tc?.label ?? "off"}
              active={(timeControl?.label ?? null) === (tc?.label ?? null)}
              onClick={() => setTimeControl(tc)}
            >
              {tc?.label ?? "No clock"}
            </Chip>
          ))}
        </Field>

        <p className="text-sm text-muted-foreground">
          Tap a piece, then a highlighted square. White moves first. Castling, en passant, and
          promotion are all live.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            size="lg"
            className="sm:min-w-44"
            data-testid="start-game"
            onClick={() => startGame({ mode, difficulty, playerColor, timeControl })}
          >
            Sit down
          </Button>
          {hasSave && (
            <Button size="lg" variant="outline" onClick={resumeGame}>
              <RotateCcw className="size-4" />
              Resume table
            </Button>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-md lg:max-w-none">
        <Board interactive={false} fen={START_FEN} orientation="w" />
        <p className="mt-4 text-center text-xs tracking-wide text-muted-foreground">
          Starting position · Staunton
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 rounded-md px-3 text-sm font-medium capitalize",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-surface text-foreground hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

function ModeCard({
  active,
  icon,
  title,
  copy,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  copy: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg px-4 py-4 text-left",
        active ? "bg-primary text-primary-foreground" : "bg-surface-2 text-foreground",
      )}
    >
      <span className={active ? "opacity-80" : "text-muted-foreground"}>{icon}</span>
      <span className="font-medium">{title}</span>
      <span className={cn("text-xs", active ? "opacity-70" : "text-muted-foreground")}>{copy}</span>
    </button>
  );
}
