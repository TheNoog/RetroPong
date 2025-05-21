// This is an AI-powered function that will help adapt the AI strategy based on the game's difficulty level.

'use server';

/**
 * @fileOverview AI opponent strategy adjustment for Pong.
 *
 * - adjustAiStrategy - A function that adjusts the AI's strategy based on game difficulty.
 * - AdjustAiStrategyInput - The input type for the adjustAiStrategy function.
 * - AdjustAiStrategyOutput - The return type for the adjustAiStrategy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdjustAiStrategyInputSchema = z.object({
  difficultyLevel: z
    .enum(['easy', 'medium', 'hard'])
    .describe('The difficulty level of the game.'),
  ballPositionX: z.number().describe('The x-coordinate of the ball.'),
  ballPositionY: z.number().describe('The y-coordinate of the ball.'),
  paddlePosition: z.number().describe('The current position of the AI paddle.'),
  ballSpeedX: z.number().describe('The x-axis speed of the ball'),
  ballSpeedY: z.number().describe('The y-axis speed of the ball'),
});
export type AdjustAiStrategyInput = z.infer<typeof AdjustAiStrategyInputSchema>;

const AdjustAiStrategyOutputSchema = z.object({
  suggestedPaddlePosition: z
    .number()
    .describe('The suggested position for the AI paddle to move to.'),
  reactionTimeMultiplier: z
    .number()
    .describe(
      'A multiplier to adjust the AI reaction time, lower values mean faster reactions.'
    ),
  accuracyOffset: z
    .number()
    .describe(
      'A value to offset the AI paddle position, simulating imperfect accuracy.'
    ),
});
export type AdjustAiStrategyOutput = z.infer<typeof AdjustAiStrategyOutputSchema>;

export async function adjustAiStrategy(input: AdjustAiStrategyInput): Promise<AdjustAiStrategyOutput> {
  return adjustAiStrategyFlow(input);
}

const adjustAiStrategyPrompt = ai.definePrompt({
  name: 'adjustAiStrategyPrompt',
  input: {schema: AdjustAiStrategyInputSchema},
  output: {schema: AdjustAiStrategyOutputSchema},
  prompt: `You are an AI that helps adjust the pong AI's strategy based on the game's difficulty.

  Based on the difficulty level, ball position, ball speed, and current paddle position, suggest an ideal paddle position to intercept the ball.

  Difficulty Level: {{{difficultyLevel}}}
  Ball Position X: {{{ballPositionX}}}
  Ball Position Y: {{{ballPositionY}}}
  Paddle Position: {{{paddlePosition}}}
  Ball Speed X: {{{ballSpeedX}}}
  Ball Speed Y: {{{ballSpeedY}}}

  Return the "suggestedPaddlePosition" as the ideal location of the paddle, the "reactionTimeMultiplier" to simulate the speed of the AI, and the "accuracyOffset" to make the AI imperfect. The "reactionTimeMultiplier" and "accuracyOffset" are most important to adjust for the difficulty level.

  For an easy difficulty, increase the reactionTimeMultiplier and increase the accuracyOffset.
  For a medium difficulty, provide moderate reactionTimeMultiplier and accuracyOffset.
  For a hard difficulty, provide a low reactionTimeMultiplier and low accuracyOffset.

  Return the response as a JSON object.
  `,
});

const adjustAiStrategyFlow = ai.defineFlow(
  {
    name: 'adjustAiStrategyFlow',
    inputSchema: AdjustAiStrategyInputSchema,
    outputSchema: AdjustAiStrategyOutputSchema,
  },
  async input => {
    const {output} = await adjustAiStrategyPrompt(input);
    return output!;
  }
);
