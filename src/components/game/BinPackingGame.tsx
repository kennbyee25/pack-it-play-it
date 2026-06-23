import { useState, useCallback, useEffect } from 'react';
import { Piece, GameState } from '@/types/game';
import {
  generateGame,
  canPlacePiece,
  placePiece,
  removePiece,
  calculateEfficiency,
} from '@/utils/gameGenerator';
import { GameBin } from './GameBin';
import { PiecesTray } from './PiecesTray';
import { GameStats } from './GameStats';
import { Button } from '@/components/ui/button';
import { RotateCcw, Shuffle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const CELL_SIZE = 40;

type Difficulty = 'easy' | 'medium' | 'hard';

export function BinPackingGame() {
  const [gameState, setGameState] = useState<GameState>(() => generateGame('medium'));
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [draggingPiece, setDraggingPiece] = useState<Piece | null>(null);
  const [dropPreview, setDropPreview] = useState<{ x: number; y: number; piece: Piece } | null>(null);
  const [isValidDrop, setIsValidDrop] = useState(false);

  const efficiency = calculateEfficiency(gameState.grid);
  const piecesPlaced = gameState.pieces.filter((p) => p.placed).length;

  const handleNewGame = useCallback((diff: Difficulty = difficulty) => {
    setGameState(generateGame(diff));
    setDifficulty(diff);
    setDraggingPiece(null);
    setDropPreview(null);
    toast.success('New puzzle generated!');
  }, [difficulty]);

  const handleReset = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      pieces: prev.pieces.map((p) => ({ ...p, placed: false, x: undefined, y: undefined })),
      grid: Array(prev.binHeight).fill(null).map(() => Array(prev.binWidth).fill(null)),
    }));
    toast.info('Puzzle reset');
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, piece: Piece) => {
    setDraggingPiece(piece);
    e.dataTransfer.effectAllowed = 'move';
    // Set a transparent drag image
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingPiece(null);
    setDropPreview(null);
    setIsValidDrop(false);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!draggingPiece) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
      const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);

      // Create a temporary grid without the dragging piece if it was placed
      let testGrid = gameState.grid;
      if (draggingPiece.placed) {
        testGrid = removePiece(gameState.grid, draggingPiece.id);
      }

      const valid = canPlacePiece(
        testGrid,
        draggingPiece,
        x,
        y,
        gameState.binWidth,
        gameState.binHeight
      );

      setDropPreview({ x, y, piece: draggingPiece });
      setIsValidDrop(valid);
    },
    [draggingPiece, gameState]
  );

  const handleDrop = useCallback(
    (x: number, y: number) => {
      if (!draggingPiece) return;

      // Remove piece from grid if it was already placed
      let newGrid = gameState.grid;
      if (draggingPiece.placed) {
        newGrid = removePiece(gameState.grid, draggingPiece.id);
      }

      const valid = canPlacePiece(
        newGrid,
        draggingPiece,
        x,
        y,
        gameState.binWidth,
        gameState.binHeight
      );

      if (valid) {
        newGrid = placePiece(newGrid, draggingPiece, x, y);
        setGameState((prev) => ({
          ...prev,
          grid: newGrid,
          pieces: prev.pieces.map((p) =>
            p.id === draggingPiece.id ? { ...p, placed: true, x, y } : p
          ),
        }));
      } else {
        toast.error('Cannot place piece here!');
      }

      setDraggingPiece(null);
      setDropPreview(null);
      setIsValidDrop(false);
    },
    [draggingPiece, gameState]
  );

  const handleTrayDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!draggingPiece || !draggingPiece.placed) return;

      // Remove piece from bin
      const newGrid = removePiece(gameState.grid, draggingPiece.id);
      setGameState((prev) => ({
        ...prev,
        grid: newGrid,
        pieces: prev.pieces.map((p) =>
          p.id === draggingPiece.id ? { ...p, placed: false, x: undefined, y: undefined } : p
        ),
      }));

      setDraggingPiece(null);
      setDropPreview(null);
    },
    [draggingPiece, gameState.grid]
  );

  // Check for win condition
  useEffect(() => {
    if (piecesPlaced === gameState.pieces.length && gameState.pieces.length > 0) {
      toast.success(`Amazing! You packed all pieces with ${efficiency}% efficiency! 🎉`);
    }
  }, [piecesPlaced, gameState.pieces.length, efficiency]);

  return (
    <div className="flex flex-col items-center gap-6 p-4 md:p-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
          Bin Packing Puzzle
        </h1>
        <p className="text-muted-foreground">
          Drag and drop pieces to pack them efficiently!
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex rounded-lg overflow-hidden border border-border">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
            <button
              key={diff}
              onClick={() => handleNewGame(diff)}
              className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
                difficulty === diff
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground hover:bg-muted'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => handleNewGame()}>
          <Shuffle className="w-4 h-4 mr-2" />
          New Game
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Stats */}
      <GameStats
        efficiency={efficiency}
        piecesPlaced={piecesPlaced}
        totalPieces={gameState.pieces.length}
      />

      {/* Game Area */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Bin */}
        <div className="relative">
          <div className="absolute -top-8 left-0 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Packing Bin ({gameState.binWidth} × {gameState.binHeight})
          </div>
          <GameBin
            width={gameState.binWidth}
            height={gameState.binHeight}
            cellSize={CELL_SIZE}
            grid={gameState.grid}
            pieces={gameState.pieces}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onPieceDragStart={handleDragStart}
            onPieceDragEnd={handleDragEnd}
            isValidDrop={isValidDrop}
            dropPreview={dropPreview}
          />
        </div>

        {/* Pieces Tray */}
        <div className="w-full lg:w-64">
          <PiecesTray
            pieces={gameState.pieces}
            cellSize={CELL_SIZE}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleTrayDrop}
          />
        </div>
      </div>

      {/* Tips */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span>Tip: Drag pieces back to the tray to remove them from the bin</span>
      </div>
    </div>
  );
}
