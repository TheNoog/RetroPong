
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const pongAiInputSchema = z.object({
  ballX: z.number().describe("The current X position of the ball."),
  ballY: z.number().describe("The current Y position of the ball."),
  ballDX: z.number().describe("The current X-axis velocity of the ball."),
  ballDY: z.number().describe("The current Y-axis velocity of the ball."),
  paddleY: z.number().describe("The AI's current paddle Y center position."),
  opponentPaddleY: z.number().describe("The opponent's paddle Y center position."),
  boardHeight: z.number().describe("The height of the game board."),
  paddleHeight: z.number().describe("The height of the AI's paddle."),
  isBallMovingTowardsAi: z.boolean().describe("True if the ball is moving towards the AI paddle."),
  paddleSpeed: z.number().describe("The maximum speed the AI paddle can move per update."),
});

export const pongAiOutputSchema = z.object({
  targetY: z.number().describe("The target Y center position for the AI paddle."),
});

// This is the Genkit flow. In a real scenario, it might call an LLM.
// For this Pong AI, it's a mock implementation with deterministic logic.
export const predictPaddleMove = ai.defineFlow(
  {
    name: 'predictPaddleMove',
    inputSchema: pongAiInputSchema,
    outputSchema: pongAiOutputSchema,
  },
  async (input) => {
    let newTargetY = input.paddleY; // Current Y center of AI paddle

    if (input.isBallMovingTowardsAi) {
      // Basic tracking: try to align paddle center with ball's Y position
      // Add a slight delay/reaction time effect for realism
      const reactionFactor = 0.75; // Slower reaction
      const difference = (input.ballY - newTargetY) * reactionFactor;
      
      // Max movement per "thought" cycle, related to paddleSpeed
      const maxMove = input.paddleSpeed * 0.8; 
      
      if (Math.abs(difference) > 1) { // Only move if significant difference
         newTargetY += Math.max(-maxMove, Math.min(maxMove, difference));
      }

    } else {
      // If ball is moving away, slowly return to center of board
      const boardCenterY = input.boardHeight / 2;
      const difference = boardCenterY - newTargetY;
      const returnSpeed = input.paddleSpeed * 0.1; // Slow return
      if (Math.abs(difference) > 1) {
        newTargetY += Math.max(-returnSpeed, Math.min(returnSpeed, difference));
      }
    }

    // Clamp targetY so paddle (center) stays within board limits considering its height
    const halfPaddleHeight = input.paddleHeight / 2;
    const minY = halfPaddleHeight;
    const maxY = input.boardHeight - halfPaddleHeight;
    newTargetY = Math.max(minY, Math.min(maxY, newTargetY));

    return { targetY: newTargetY };
  }
);
