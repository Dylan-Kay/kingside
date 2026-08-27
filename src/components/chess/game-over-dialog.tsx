import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { resultLabel } from "@/lib/chess/engine";
import { useGameStore } from "@/lib/chess/store";
import type { GameResult } from "@/lib/chess/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function pgnWithResult(pgn: string, result: GameResult | null): string {
  const token =
    result?.winner === "w" ? "1-0" : result?.winner === "b" ? "0-1" : result ? "1/2-1/2" : "*";
  let text = pgn.trim() || '[Event "Kingside"]';
  if (/\[Result "/.test(text)) {
    text = text.replace(/\[Result "[^"]*"\]/, `[Result "${token}"]`);
  } else {
    text = `[Result "${token}"]\n${text}`;
  }
  if (!/(1-0|0-1|1\/2-1\/2|\*)\s*$/.test(text)) {
    text = `${text}\n${token}`;
  }
  return `${text}\n`;
}

function downloadPgn(text: string) {
  const blob = new Blob([text], { type: "application/x-chess-pgn" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kingside-${new Date().toISOString().slice(0, 10)}.pgn`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function GameOverDialog() {
  const result = useGameStore((s) => s.result);
  const pgn = useGameStore((s) => s.pgn);
  const mode = useGameStore((s) => s.mode);
  const difficulty = useGameStore((s) => s.difficulty);
  const playerColor = useGameStore((s) => s.playerColor);
  const timeControl = useGameStore((s) => s.timeControl);
  const startGame = useGameStore((s) => s.startGame);
  const goMenu = useGameStore((s) => s.goMenu);

  const exportText = () => pgnWithResult(pgn, result);

  async function copyPgn() {
    try {
      await navigator.clipboard.writeText(exportText());
      toast("PGN copied");
    } catch {
      toast("Could not copy PGN");
    }
  }

  function savePgn() {
    downloadPgn(exportText());
    toast("PGN saved");
  }

  return (
    <Dialog open={Boolean(result)}>
      <DialogContent
        showClose={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{result ? resultLabel(result) : "Game over"}</DialogTitle>
          <DialogDescription>
            Save the score, rematch with the same seats, or go back to the menu.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={savePgn}>
              <Download />
              Save PGN
            </Button>
            <Button variant="outline" onClick={copyPgn}>
              <Copy />
              Copy PGN
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={goMenu}>
              Menu
            </Button>
            <Button
              onClick={() =>
                startGame({
                  mode,
                  difficulty,
                  playerColor,
                  timeControl,
                })
              }
            >
              Rematch
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
