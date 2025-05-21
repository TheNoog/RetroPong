
import { NextRequest, NextResponse } from 'next/server';
import { predictPaddleMove, pongAiInputSchema } from '@/ai/flows/pongAi';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input with Zod schema before calling the flow
    // Although defineFlow also does validation, validating here provides
    // a more specific error message if basic structure is wrong.
    try {
      pongAiInputSchema.parse(body);
    } catch (validationError: any) {
      return NextResponse.json({ error: 'Input validation failed', details: validationError.issues }, { status: 400 });
    }

    // Call the flow directly.
    const result = await predictPaddleMove(body);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error in /api/pong-ai:', error);
    let errorMessage = 'Internal Server Error';
    let errorDetails: any = {};

    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // If it's a known error structure from Genkit or other specific errors, handle them
    if (error.name === 'ZodError' && error.issues) { // This case might be caught by the inner try-catch now
      errorMessage = 'Input validation failed during flow execution.';
      errorDetails = error.issues;
       return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to get AI prediction', details: errorMessage }, { status: 500 });
  }
}
