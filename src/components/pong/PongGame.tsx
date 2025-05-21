"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Ball as BallType, Paddle as PaddleType, Score, GameStatus, GameMode, PlayerKey } from '@/types/pong';
import PaddleComponent from './Paddle';
import BallComponent from './Ball';
import ScoreDisplay from './ScoreDisplay';
import { Button } from '@/components/ui/button';
import type { pongAiInputSchema } from '@/ai/flows/pongAi';
import { useToast } from '@/hooks/use-toast';

const BOARD_WIDTH = 800;
const BOARD_HEIGHT = 600;
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_RADIUS = 10;
const PADDLE_SPEED = 10; // Increased speed for responsiveness
const INITIAL_BALL_SPEED = 5;
const MAX_BALL_SPEED = 15;
const WINNING_SCORE = 5;

const PongGame: React.FC = () => {
  const { toast } = useToast();
  const [paddle1, setPaddle1] = useState<PaddleType>({ y: BOARD_HEIGHT / 2, height: PADDLE_HEIGHT, width: PADDLE_WIDTH, speed: PADDLE_SPEED });
  const [paddle2, setPaddle2] = useState<PaddleType>({ y: BOARD_HEIGHT / 2, height: PADDLE_HEIGHT, width: PADDLE_WIDTH, speed: PADDLE_SPEED });
  const [ball, setBall] = useState<BallType>({ x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2, radius: BALL_RADIUS, dx: INITIAL_BALL_SPEED, dy: INITIAL_BALL_SPEED, speed: INITIAL_BALL_SPEED });
  const [score, setScore] = useState<Score>({ player1: 0, player2: 0 });
  const [gameStatus, setGameStatus] = useState<GameStatus>("menu");
  const [gameMode, setGameMode] = useState<GameMode>("humanVsAi");
  
  const keysPressed = useRef<Set<string>>(new Set());
  const gameLoopRef = useRef<number>();
  const aiUpdateTimeoutRef = useRef<NodeJS.Timeout>();

  const resetBall = useCallback((servedTo: PlayerKey) => {
    setBall({
      x: BOARD_WIDTH / 2,
      y: BOARD_HEIGHT / 2,
      radius: BALL_RADIUS,
      dx: servedTo === 'player1' ? -INITIAL_BALL_SPEED : INITIAL_BALL_SPEED,
      dy: Math.random() > 0.5 ? INITIAL_BALL_SPEED : -INITIAL_BALL_SPEED,
      speed: INITIAL_BALL_SPEED,
    });
  }, []);

  const resetGame = useCallback(() => {
    setScore({ player1: 0, player2: 0 });
    setPaddle1({ y: BOARD_HEIGHT / 2, height: PADDLE_HEIGHT, width: PADDLE_WIDTH, speed: PADDLE_SPEED });
    setPaddle2({ y: BOARD_HEIGHT / 2, height: PADDLE_HEIGHT, width: PADDLE_WIDTH, speed: PADDLE_SPEED });
    resetBall('player1');
    setGameStatus("playing");
  }, [resetBall]);

  const fetchAiMove = useCallback(async (currentPaddle2Y: number) => {
    if (gameMode !== 'humanVsAi' || ball.dx < 0) { // Only if ball is moving towards AI (right paddle)
      return;
    }

    const payload: z.infer<typeof pongAiInputSchema> = {
      ballX: ball.x,
      ballY: ball.y,
      ballDX: ball.dx,
      ballDY: ball.dy,
      paddleY: currentPaddle2Y,
      opponentPaddleY: paddle1.y,
      boardHeight: BOARD_HEIGHT,
      paddleHeight: PADDLE_HEIGHT,
      isBallMovingTowardsAi: ball.dx > 0,
      paddleSpeed: PADDLE_SPEED,
    };

    try {
      const response = await fetch('/api/pong-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('AI Error:', errorData);
        // toast({ title: "AI Error", description: errorData.details || errorData.error || "Could not get AI move.", variant: "destructive" });
        return; // Don't update paddle if AI fails
      }
      const data = await response.json();
      if (data.targetY !== undefined) {
        // Smoothly move paddle towards targetY
        setPaddle2(prev => {
            const diff = data.targetY - prev.y;
            const move = Math.max(-PADDLE_SPEED, Math.min(PADDLE_SPEED, diff));
            const newY = prev.y + move;
            const halfPaddleHeight = prev.height / 2;
            return {...prev, y: Math.max(halfPaddleHeight, Math.min(BOARD_HEIGHT - halfPaddleHeight, newY))};
        });
      }
    } catch (error) {
      console.error('Network error fetching AI move:', error);
      // toast({ title: "Network Error", description: "Could not connect to AI service.", variant: "destructive" });
    }
  }, [ball.x, ball.y, ball.dx, ball.dy, paddle1.y, gameMode, toast]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysPressed.current.add(e.key.toLowerCase());
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      if (aiUpdateTimeoutRef.current) clearTimeout(aiUpdateTimeoutRef.current);
    };
  }, []);

  const update = useCallback(() => {
    if (gameStatus !== "playing") return;

    // Paddle Movement
    setPaddle1(prev => {
      let newY = prev.y;
      if (keysPressed.current.has('w')) newY -= prev.speed;
      if (keysPressed.current.has('s')) newY += prev.speed;
      const halfPaddleHeight = prev.height / 2;
      return { ...prev, y: Math.max(halfPaddleHeight, Math.min(BOARD_HEIGHT - halfPaddleHeight, newY)) };
    });

    if (gameMode === 'humanVsHuman') {
      setPaddle2(prev => {
        let newY = prev.y;
        if (keysPressed.current.has('arrowup')) newY -= prev.speed;
        if (keysPressed.current.has('arrowdown')) newY += prev.speed;
        const halfPaddleHeight = prev.height / 2;
        return { ...prev, y: Math.max(halfPaddleHeight, Math.min(BOARD_HEIGHT - halfPaddleHeight, newY)) };
      });
    }
    
    // Ball Movement
    setBall(prevBall => {
      let newX = prevBall.x + prevBall.dx;
      let newY = prevBall.y + prevBall.dy;
      let newDx = prevBall.dx;
      let newDy = prevBall.dy;
      let newSpeed = prevBall.speed;

      // Wall collision (top/bottom)
      if (newY - prevBall.radius < 0 || newY + prevBall.radius > BOARD_HEIGHT) {
        newDy = -newDy;
        newY = prevBall.y + newDy; // adjust to prevent sticking
      }

      // Paddle collision
      // Player 1 (left paddle)
      if (newDx < 0 && 
          newX - prevBall.radius < PADDLE_WIDTH && 
          newX - prevBall.radius > 0 &&
          newY > paddle1.y - PADDLE_HEIGHT / 2 && 
          newY < paddle1.y + PADDLE_HEIGHT / 2) {
        newDx = -newDx;
        newX = PADDLE_WIDTH + prevBall.radius; // prevent sticking
        // Change angle based on where it hit the paddle
        const deltaY = newY - paddle1.y;
        newDy = deltaY * 0.25; 
        newSpeed = Math.min(MAX_BALL_SPEED, newSpeed * 1.05);
      }
      // Player 2 (right paddle)
      else if (newDx > 0 && 
               newX + prevBall.radius > BOARD_WIDTH - PADDLE_WIDTH &&
               newX + prevBall.radius < BOARD_WIDTH &&
               newY > paddle2.y - PADDLE_HEIGHT / 2 && 
               newY < paddle2.y + PADDLE_HEIGHT / 2) {
        newDx = -newDx;
        newX = BOARD_WIDTH - PADDLE_WIDTH - prevBall.radius; // prevent sticking
        const deltaY = newY - paddle2.y;
        newDy = deltaY * 0.25;
        newSpeed = Math.min(MAX_BALL_SPEED, newSpeed * 1.05);
      }
      
      // Normalize dx/dy based on newSpeed
      const magnitude = Math.sqrt(newDx * newDx + newDy * newDy);
      if (magnitude > 0) {
        newDx = (newDx / magnitude) * newSpeed;
        newDy = (newDy / magnitude) * newSpeed;
      }


      // Scoring
      if (newX - prevBall.radius < 0) { // Player 2 scores
        setScore(s => ({ ...s, player2: s.player2 + 1 }));
        if (score.player2 + 1 >= WINNING_SCORE) {
          setGameStatus("gameover");
          toast({ title: "Game Over!", description: `${gameMode === 'humanVsAi' ? 'AI' : 'Player 2'} Wins!`});
        } else {
          resetBall('player1');
        }
      } else if (newX + prevBall.radius > BOARD_WIDTH) { // Player 1 scores
        setScore(s => ({ ...s, player1: s.player1 + 1 }));
        if (score.player1 + 1 >= WINNING_SCORE) {
          setGameStatus("gameover");
          toast({ title: "Game Over!", description: "Player 1 Wins!"});
        } else {
          resetBall('player2');
        }
      }
      return { ...prevBall, x: newX, y: newY, dx: newDx, dy: newDy, speed: newSpeed };
    });
    
    gameLoopRef.current = requestAnimationFrame(update);
  }, [gameStatus, gameMode, paddle1.y, paddle2.y, resetBall, score, toast]);

  useEffect(() => {
    if (gameStatus === "playing") {
      gameLoopRef.current = requestAnimationFrame(update);
    } else {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameStatus, update]);
  
  // AI Update Loop
  useEffect(() => {
    if (gameStatus === "playing" && gameMode === "humanVsAi") {
      const aiLogic = () => {
        if (ball.dx > 0) { // Only call AI if ball is moving towards it
            fetchAiMove(paddle2.y);
        }
        aiUpdateTimeoutRef.current = setTimeout(aiLogic, 150); // AI "thinks" periodically
      };
      aiLogic(); // Initial call
      return () => {
        if (aiUpdateTimeoutRef.current) clearTimeout(aiUpdateTimeoutRef.current);
      };
    }
  }, [gameStatus, gameMode, fetchAiMove, ball.dx, paddle2.y]);


  const startGame = (mode: GameMode) => {
    setGameMode(mode);
    resetGame();
  };

  if (gameStatus === "menu") {
    return (
      <div className="flex flex-col items-center justify-center h-full font-mono">
        <h1 className="text-6xl font-bold text-primary mb-12">RetroPong</h1>
        <div className="space-y-4">
          <Button size="lg" className="w-64 text-xl py-8" onClick={() => startGame("humanVsAi")}>Player vs AI</Button>
          <Button size="lg" className="w-64 text-xl py-8" onClick={() => startGame("humanVsHuman")}>Player vs Player</Button>
        </div>
        <p className="mt-12 text-muted-foreground">P1: W (Up), S (Down) | P2: ArrowUp, ArrowDown</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-full font-mono p-4">
      <div
        className="relative bg-card border-2 border-primary shadow-2xl rounded-lg overflow-hidden"
        style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}
      >
        <ScoreDisplay score={score} />
        <PaddleComponent {...paddle1} isLeft={true} boardHeight={BOARD_HEIGHT} />
        <PaddleComponent {...paddle2} isLeft={false} boardHeight={BOARD_HEIGHT} />
        <BallComponent {...ball} />

        {/* Dashed center line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="h-[15px] w-full bg-muted-foreground/50 mb-[15px]"></div>
          ))}
        </div>

        {gameStatus === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
            <h2 className="text-5xl font-bold text-accent mb-4">
              {score.player1 >= WINNING_SCORE ? "Player 1 Wins!" : (gameMode === 'humanVsAi' ? 'AI Wins!' : 'Player 2 Wins!')}
            </h2>
            <Button size="lg" onClick={() => setGameStatus("menu")}>Back to Menu</Button>
          </div>
        )}
      </div>
      <div className="mt-4 text-muted-foreground">
          P1: W (Up), S (Down) {gameMode === "humanVsHuman" && "| P2: ArrowUp, ArrowDown"}
      </div>
    </div>
  );
};

export default PongGame;
