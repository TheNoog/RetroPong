export interface Paddle {
  y: number;
  height: number;
  width: number;
  speed: number;
}

export interface Ball {
  x: number;
  y: number;
  radius: number;
  dx: number;
  dy: number;
  speed: number;
}

export interface Score {
  player1: number;
  player2: number;
}

export type GameStatus = "instructions" | "menu" | "playing" | "paused" | "gameover";
export type GameMode = "humanVsHuman" | "humanVsAi";
export type PlayerKey = "player1" | "player2";
