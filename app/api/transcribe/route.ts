import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file size (25MB limit)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 25MB limit' }, { status: 400 });
    }

    // Get API key from environment variable
    const ASSEMBLY_API_KEY = process.env.ASSEMBLYAI_API_KEY;
    
    if (!ASSEMBLY_API_KEY) {
      return NextResponse.json({ error: 'Missing API key configuration' }, { status: 500 });
    }

    // Step 1: Upload the file to AssemblyAI
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLY_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.json();
      return NextResponse.json({ error: `Upload failed: ${uploadError.error || uploadResponse.statusText}` }, { status: 500 });
    }

    const uploadResult = await uploadResponse.json();
    const audioUrl = uploadResult.upload_url;

    // Step 2: Start transcription
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLY_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
      }),
    });

    if (!transcriptResponse.ok) {
      const transcriptError = await transcriptResponse.json();
      return NextResponse.json({ error: `Transcription request failed: ${transcriptError.error || transcriptResponse.statusText}` }, { status: 500 });
    }

    const transcriptResult = await transcriptResponse.json();
    const transcriptId = transcriptResult.id;

    // Step 3: Poll for the transcription result
    let transcript = null;
    let attempts = 0;
    const maxAttempts = 60; // Maximum polling attempts (5 minutes with 5-second intervals)

    while (attempts < maxAttempts) {
      attempts++;
      
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between polling
      
      const pollingResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'Authorization': ASSEMBLY_API_KEY,
        },
      });
      
      if (!pollingResponse.ok) {
        const pollingError = await pollingResponse.json();
        return NextResponse.json({ error: `Polling failed: ${pollingError.error || pollingResponse.statusText}` }, { status: 500 });
      }
      
      const pollingResult = await pollingResponse.json();
      
      if (pollingResult.status === 'completed') {
        transcript = pollingResult.text;
        break;
      } else if (pollingResult.status === 'error') {
        return NextResponse.json({ error: `Transcription failed: ${pollingResult.error}` }, { status: 500 });
      }
      // Continue polling if status is 'queued' or 'processing'
    }

    if (!transcript) {
      return NextResponse.json({ error: 'Transcription timed out' }, { status: 500 });
    }

    return NextResponse.json({ text: transcript });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}