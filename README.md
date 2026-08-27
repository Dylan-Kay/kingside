# Kingside

A two-player chess table for the browser. Sit across from a friend on the same device, or play the house engine. Full FIDE rules, optional clocks.
[Play here](https://dylan-kay.github.io/kingside/)

## Features

- **Pass & Play** on one device, with optional auto-flip after each move
- **Versus House** - easy, medium, or hard, with a search that runs off the main thread
- Full rules via [chess.js](https://github.com/jhlywa/chess.js): castling, en passant, promotion, check, checkmate, stalemate, threefold repetition, fifty-move, insufficient material
- Optional clocks (3+2, 5, 10, 15+10)
- Move list, captured pieces, undo, resign, draw, PGN copy
- Designed for a laptop and a phone

## Stack

- React 19 and TanStack Start
- Tailwind v4
- Zustand
- chess.js
- Web Worker alpha-beta search for the house player

## How to play

1. Choose **Pass & Play** or **Versus House**
2. Pick a clock - or leave it untimed
4. Tap a piece, then a highlighted square (drag works too)
5. Promote by choosing a piece when a pawn reaches the last rank


## Project layout

```
src/lib/chess/          rules helpers, store, persistence, sounds, AI worker
src/components/chess/   board, pieces, clocks, menu, table
src/routes/             TanStack Start routes
```