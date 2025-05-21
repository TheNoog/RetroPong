
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
const PADDLE_SPEED = 10;
const VERY_SLOW_INITIAL_SPEED = 1; // Start speed very slow
const INITIAL_BALL_SPEED_TARGET = 5; // The speed we ramp up to
const RAMP_UP_HITS = 50; // Number of hits to reach INITIAL_BALL_SPEED_TARGET
const MAX_BALL_SPEED = 15;
const WINNING_SCORE = 5;

const PongGame: React.FC = () => {
  const { toast } = useToast();
  const [paddle1, setPaddle1] = useState<PaddleType>({ y: BOARD_HEIGHT / 2, height: PADDLE_HEIGHT, width: PADDLE_WIDTH, speed: PADDLE_SPEED });
  const [paddle2, setPaddle2] = useState<PaddleType>({ y: BOARD_HEIGHT / 2, height: PADDLE_HEIGHT, width: PADDLE_WIDTH, speed: PADDLE_SPEED });
  const [ball, setBall] = useState<BallType>({ x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2, radius: BALL_RADIUS, dx: VERY_SLOW_INITIAL_SPEED, dy: VERY_SLOW_INITIAL_SPEED, speed: VERY_SLOW_INITIAL_SPEED });
  const [score, setScore] = useState<Score>({ player1: 0, player2: 0 });
  const [gameStatus, setGameStatus] = useState<GameStatus>("instructions"); // Start with instructions
  const [gameMode, setGameMode] = useState<GameMode>("humanVsAi");
  const [hitCounter, setHitCounter] = useState(0);
  
  const keysPressed = useRef<Set<string>>(new Set());
  const gameLoopRef = useRef<number>();
  const aiUpdateTimeoutRef = useRef<NodeJS.Timeout>();

  const resetBall = useCallback((servedTo: PlayerKey) => {
    setBall({
      x: BOARD_WIDTH / 2,
      y: BOARD_HEIGHT / 2,
      radius: BALL_RADIUS,
      dx: servedTo === 'player1' ? -VERY_SLOW_INITIAL_SPEED : VERY_SLOW_INITIAL_SPEED,
      dy: Math.random() > 0.5 ? VERY_SLOW_INITIAL_SPEED : -VERY_SLOW_INITIAL_SPEED,
      speed: VERY_SLOW_INITIAL_SPEED,
    });
    setHitCounter(0); // Reset hit counter
  }, []);

  const resetGame = useCallback(() => {
    setScore({ player1: 0, player2: 0 });
    setPaddle1({ y: BOARD_HEIGHT / 2, height: PADDLE_HEIGHT, width: PADDLE_WIDTH, speed: PADDLE_SPEED });
    setPaddle2({ y: BOARD_HEIGHT / 2, height: PADDLE_HEIGHT, width: PADDLE_WIDTH, speed: PADDLE_SPEED });
    resetBall('player1');
    setGameStatus("playing");
  }, [resetBall]);

  const fetchAiMove = useCallback(async (currentPaddle2Y: number) => {
    if (gameMode !== 'humanVsAi' || ball.dx < 0) { 
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
        return; 
      }
      const data = await response.json();
      if (data.targetY !== undefined) {
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
    }
  }, [ball.x, ball.y, ball.dx, ball.dy, paddle1.y, gameMode]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'escape' && gameStatus === "playing") {
        setGameStatus("menu");
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        if (aiUpdateTimeoutRef.current) clearTimeout(aiUpdateTimeoutRef.current);
      } else {
        keysPressed.current.add(e.key.toLowerCase());
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      if (aiUpdateTimeoutRef.current) clearTimeout(aiUpdateTimeoutRef.current);
    };
  }, [gameStatus]); // Added gameStatus to dependency array

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
      let newHitCounter = hitCounter;

      // Wall collision (top/bottom)
      if (newY - prevBall.radius < 0 || newY + prevBall.radius > BOARD_HEIGHT) {
        newDy = -newDy;
        newY = prevBall.y + newDy; 
      }

      // Paddle collision
      let hit = false;
      if (newDx < 0 && 
          newX - prevBall.radius < PADDLE_WIDTH && 
          newX - prevBall.radius > 0 &&
          newY > paddle1.y - PADDLE_HEIGHT / 2 && 
          newY < paddle1.y + PADDLE_HEIGHT / 2) {
        hit = true;
        newDx = -newDx;
        newX = PADDLE_WIDTH + prevBall.radius; 
        const deltaY = newY - paddle1.y;
        newDy = deltaY * 0.25; 
      }
      else if (newDx > 0 && 
               newX + prevBall.radius > BOARD_WIDTH - PADDLE_WIDTH &&
               newX + prevBall.radius < BOARD_WIDTH &&
               newY > paddle2.y - PADDLE_HEIGHT / 2 && 
               newY < paddle2.y + PADDLE_HEIGHT / 2) {
        hit = true;
        newDx = -newDx;
        newX = BOARD_WIDTH - PADDLE_WIDTH - prevBall.radius;
        const deltaY = newY - paddle2.y;
        newDy = deltaY * 0.25;
      }

      if (hit) {
        newHitCounter = hitCounter + 1;
        setHitCounter(newHitCounter); // Update state for next frame

        if (newHitCounter <= RAMP_UP_HITS) {
          const speedIncrement = (INITIAL_BALL_SPEED_TARGET - VERY_SLOW_INITIAL_SPEED) / RAMP_UP_HITS;
          newSpeed = VERY_SLOW_INITIAL_SPEED + (newHitCounter * speedIncrement);
          newSpeed = Math.min(newSpeed, INITIAL_BALL_SPEED_TARGET); // Cap at target
        } else {
          newSpeed = Math.min(MAX_BALL_SPEED, prevBall.speed * 1.05); // Existing progressive increase
        }
      }
      
      const magnitude = Math.sqrt(newDx * newDx + newDy * newDy);
      if (magnitude > 0) {
        newDx = (newDx / magnitude) * newSpeed;
        newDy = (newDy / magnitude) * newSpeed;
      }

      // Scoring
      if (newX - prevBall.radius < 0) { 
        setScore(s => ({ ...s, player2: s.player2 + 1 }));
        if (score.player2 + 1 >= WINNING_SCORE) {
          setGameStatus("gameover");
          toast({ title: "Game Over!", description: `${gameMode === 'humanVsAi' ? 'AI' : 'Player 2'} Wins!`});
        } else {
          resetBall('player1');
        }
      } else if (newX + prevBall.radius > BOARD_WIDTH) { 
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
  }, [gameStatus, gameMode, paddle1.y, paddle2.y, resetBall, score, toast, hitCounter]);

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
  
  useEffect(() => {
    if (gameStatus === "playing" && gameMode === "humanVsAi") {
      const aiLogic = () => {
        if (ball.dx > 0) { 
            fetchAiMove(paddle2.y);
        }
        aiUpdateTimeoutRef.current = setTimeout(aiLogic, 150); 
      };
      aiLogic(); 
      return () => {
        if (aiUpdateTimeoutRef.current) clearTimeout(aiUpdateTimeoutRef.current);
      };
    }
  }, [gameStatus, gameMode, fetchAiMove, ball.dx, paddle2.y]);


  const startGame = (mode: GameMode) => {
    setGameMode(mode);
    resetGame();
  };

  if (gameStatus === "instructions") {
    return (
      <div className="flex flex-col items-center justify-center h-full font-mono p-8 bg-card text-card-foreground rounded-lg shadow-xl max-w-2xl mx-auto text-center">
        <h1 className="text-5xl font-bold text-primary mb-8">Game Instructions</h1>
        <div className="text-lg space-y-4 mb-10 text-left px-4">
          <p><strong className="text-accent">Objective:</strong> Be the first to score 5 points!</p>
          <p><strong className="text-accent">Ball Speed:</strong> The ball starts slow and speeds up with each paddle hit for the first {RAMP_UP_HITS} hits, then continues to accelerate.</p>
          <div>
            <h2 className="text-2xl font-semibold text-primary mb-2">Controls:</h2>
            <ul className="list-disc list-inside space-y-1 pl-4">
              <li><strong>Player 1 (Left Paddle):</strong>
                <ul className="list-disc list-inside pl-6">
                    <li><code className="bg-muted px-2 py-1 rounded text-sm">W</code> key: Move Up</li>
                    <li><code className="bg-muted px-2 py-1 rounded text-sm">S</code> key: Move Down</li>
                </ul>
              </li>
              <li className="mt-2"><strong>Player 2 (Right Paddle - Player vs Player mode):</strong>
                 <ul className="list-disc list-inside pl-6">
                    <li><code className="bg-muted px-2 py-1 rounded text-sm">ArrowUp</code> key: Move Up</li>
                    <li><code className="bg-muted px-2 py-1 rounded text-sm">ArrowDown</code> key: Move Down</li>
                </ul>
              </li>
               <li className="mt-2"><strong>Game:</strong>
                 <ul className="list-disc list-inside pl-6">
                    <li><code className="bg-muted px-2 py-1 rounded text-sm">Escape</code> key: Quit game and return to menu</li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
        <Button size="lg" className="text-xl py-6 px-10" onClick={() => setGameStatus("menu")}>
          Proceed to Menu
        </Button>
      </div>
    );
  }

  if (gameStatus === "menu") {
    return (
      <div className="flex flex-col items-center justify-center h-full font-mono">
        <h1 className="text-6xl font-bold text-primary mb-12">RetroPong</h1>
        <div className="space-y-4">
          <Button size="lg" className="w-64 text-xl py-8" onClick={() => startGame("humanVsAi")}>Player vs AI</Button>
          <Button size="lg" className="w-64 text-xl py-8" onClick={() => startGame("humanVsHuman")}>Player vs Player</Button>
        </div>
        <p className="mt-12 text-muted-foreground">P1: W (Up), S (Down) | P2: ArrowUp, ArrowDown | Esc: Menu</p>
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
            <Button size="lg" onClick={() => setGameStatus("instructions")}>Back to Menu</Button> 
          </div>
        )}
      </div>
      <div className="mt-4 text-muted-foreground">
          P1: W (Up), S (Down) {gameMode === "humanVsHuman" && "| P2: ArrowUp, ArrowDown"} | Esc: Menu
      </div>
    </div>
  );
};

export default PongGame;

  