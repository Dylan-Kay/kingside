import {
  Copy,
  Flag,
  FlipHorizontal2,
  Handshake,
  Home,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/chess/store";
import { CapturedRow } from "./captured-row";
import { ClockFace } from "./clock-face";
import { Board } from "./board";
import { GameOverDialog } from "./game-over-dialog";
import { MoveList } from "./move-list";

export function TableView() {
  const orientation = useGameStore((s) => s.orientation);
  const turn = useGameStore((s) => s.turn);
  const inCheck = useGameStore((s) => s.inCheck);
  const thinking = useGameStore((s) => s.thinking);
  const mode = useGameStore((s) => s.mode);
  const playerColor = useGameStore((s) => s.playerColor);
  const result = useGameStore((s) => s.result);
  const sound = useGameStore((s) => s.sound);
  const autoFlip = useGameStore((s) => s.autoFlip);
  const history = useGameStore((s) => s.history);
  const captured = useGameStore((s) => s.captured);
  const pgn = useGameStore((s) => s.pgn);
  const undo = useGameStore((s) => s.undo);
  const resign = useGameStore((s) => s.resign);
  const agreeDraw = useGameStore((s) => s.agreeDraw);
  const flipBoard = useGameStore((s) => s.flipBoard);
  const setAutoFlip = useGameStore((s) => s.setAutoFlip);
  const setSound = useGameStore((s) => s.setSound);
  const goMenu = useGameStore((s) => s.goMenu);
  const selectSquare = useGameStore((s) => s.selectSquare);
  const cancelPromotion = useGameStore((s) => s.cancelPromotion);
  const [confirmResign, setConfirmResign] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        useGameStore.setState({ selected: null });
        cancelPromotion();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelPromotion, selectSquare]);

  const whiteName = mode === "cpu" && playerColor === "b" ? "House" : "White";
  const blackName = mode === "cpu" && playerColor === "w" ? "House" : "Black";
  const far = orientation === "w" ? "b" : "w";
  const near = orientation;
  const names = { w: whiteName, b: blackName } as const;
  const capturedLabels = { w: "White captured", b: "Black captured" } as const;
  const status = result
    ? "Table closed"
    : thinking
      ? "House is thinking"
      : inCheck
        ? `${turn === "w" ? "White" : "Black"} is in check`
        : `${turn === "w" ? "White" : "Black"} to move`;

  async function copyPgn() {
    try {
      await navigator.clipboard.writeText(pgn || "(no moves yet)");
      toast("PGN copied");
    } catch {
      toast("Could not copy PGN");
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-5 px-4 py-5 lg:grid lg:grid-cols-[minmax(0,18rem)_minmax(0,40rem)_minmax(0,18rem)] lg:items-start lg:gap-8 lg:px-8 lg:py-8">
      <header className="flex items-center justify-between gap-3 lg:hidden">
        <div>
          <p className="font-display text-xl font-medium tracking-tight">Kingside</p>
          <p className="text-xs text-muted-foreground">{status}</p>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn label={sound ? "Mute" : "Unmute"} onClick={() => setSound(!sound)}>
            {sound ? <Volume2 /> : <VolumeX />}
          </IconBtn>
          <IconBtn label="Menu" onClick={goMenu}>
            <Home />
          </IconBtn>
        </div>
      </header>

      <aside className="flex flex-col gap-3 order-1 lg:order-none">
        <ClockFace color={far} name={names[far]} />
        <div className="rounded-xl bg-surface p-4">
          <p className="mb-2 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            {capturedLabels[far]}
          </p>
          <CapturedRow by={far} pieces={captured[far]} />
        </div>
        <div className="hidden rounded-xl bg-surface p-4 lg:block">
          <p className="mb-2 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Table
          </p>
          <p className="font-display text-lg font-medium tracking-tight">Kingside</p>
          <p className="mt-1 text-sm text-muted-foreground">{status}</p>
        </div>
        <ClockFace color={near} name={names[near]} />
        <div className="rounded-xl bg-surface p-4">
          <p className="mb-2 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            {capturedLabels[near]}
          </p>
          <CapturedRow by={near} pieces={captured[near]} />
        </div>
      </aside>

      <section className="order-2 w-full max-w-xl mx-auto lg:order-none lg:max-w-none">
        <Board />
      </section>

      <aside className="order-3 flex flex-col gap-3 lg:order-none">
        <div className="hidden items-center justify-end gap-1 lg:flex">
          <IconBtn label={sound ? "Mute" : "Unmute"} onClick={() => setSound(!sound)}>
            {sound ? <Volume2 /> : <VolumeX />}
          </IconBtn>
          <IconBtn label="Menu" onClick={goMenu}>
            <Home />
          </IconBtn>
        </div>
        <div className="rounded-xl bg-surface p-4">
          <p className="mb-2 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Moves
          </p>
          <MoveList />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={undo} disabled={history.length === 0 || thinking || Boolean(result)}>
            <Undo2 />
            Undo
          </Button>
          <Button variant="outline" onClick={flipBoard}>
            <FlipHorizontal2 />
            Flip
          </Button>
          <Button
            variant={confirmResign ? "destructive" : "outline"}
            onClick={() => {
              if (!confirmResign) {
                setConfirmResign(true);
                window.setTimeout(() => setConfirmResign(false), 2500);
                return;
              }
              resign();
              setConfirmResign(false);
            }}
            disabled={Boolean(result)}
          >
            <Flag />
            {confirmResign ? "Confirm" : "Resign"}
          </Button>
          <Button variant="outline" onClick={agreeDraw} disabled={Boolean(result)}>
            <Handshake />
            Draw
          </Button>
          <Button variant="outline" onClick={copyPgn}>
            <Copy />
            PGN
          </Button>
          {mode === "local" && (
            <Button
              variant={autoFlip ? "secondary" : "outline"}
              onClick={() => setAutoFlip(!autoFlip)}
            >
              Auto-flip {autoFlip ? "on" : "off"}
            </Button>
          )}
        </div>
      </aside>

      <GameOverDialog />
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick}>
      {children}
    </Button>
  );
}
