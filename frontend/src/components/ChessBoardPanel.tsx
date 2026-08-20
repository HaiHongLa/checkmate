"use client";

import { Chessboard } from "react-chessboard";
import { Square } from "chess.js";

interface ChessBoardProps {
  fen: string;
  onMove: (from: Square, to: Square) => boolean;
  orientation?: "white" | "black";
  readOnly?: boolean;
}

export function ChessBoardPanel({
  fen,
  onMove,
  orientation = "white",
  readOnly = false,
}: ChessBoardProps) {
  function onDrop(sourceSquare: Square, targetSquare: Square): boolean {
    if (readOnly) return false;
    return onMove(sourceSquare, targetSquare);
  }

  return (
    <div className="w-full max-w-[560px] aspect-square shadow-2xl rounded-lg overflow-hidden">
      <Chessboard
        position={fen}
        onPieceDrop={onDrop}
        arePiecesDraggable={!readOnly}
        boardOrientation={orientation}
        customBoardStyle={{
          borderRadius: "8px",
        }}
        customDarkSquareStyle={{ backgroundColor: "#769656" }}
        customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
      />
    </div>
  );
}
