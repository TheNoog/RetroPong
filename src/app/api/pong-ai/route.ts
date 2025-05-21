import { NextRequest, NextResponse } from 'next/server';
import { predictPaddleMove, pongAiInputSchema } from '@/ai/flows/pongAi';
import { runFlow } from '@genkit-ai/next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // The runFlow utility from @genkit-ai/next handles schema validation and invocation
    return await runFlow(predictPaddleMove, body);

  } catch (error: any) {
    console.error('Error in /api/pong-ai:', error);
    let errorMessage = 'Internal Server Error';
    let errorDetails = {};

    if (error.message) {
      errorMessage = error.message;
    }
    
    // Check for Zod validation issues if not handled by runFlow (it should be)
    if (error.name === 'ZodError' && error.issues) {
      errorMessage = 'Input validation failed';
      errorDetails = error.issues;
       return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to get AI prediction', details: errorMessage }, { status: 500 });
  }
}
