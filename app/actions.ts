"use server"

export async function generateSpeech(input: string) {
  try {
    // Start timing the operation
    const startTime = Date.now();

    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not set in the environment variables.");
      return { error: "Server configuration error: API key is missing." };
    }

    const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "playai-tts",
        input: input,
        voice: "Fritz-PlayAI",
        response_format: "wav",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error("Groq API error:", errorData || response.statusText)
      return { error: `Error generating speech: ${response.statusText}` }
    }

    // Get the audio data as an ArrayBuffer
    const audioBuffer = await response.arrayBuffer()

    // Convert the ArrayBuffer to a base64 string
    const base64Audio = Buffer.from(audioBuffer).toString("base64")

    // Calculate elapsed time in seconds
    const elapsedTime = (Date.now() - startTime) / 1000;

    return { 
      audioBase64: base64Audio,
      timing: {
        elapsedSeconds: elapsedTime,
        inputLength: input.length
      }
    }
  } catch (error) {
    console.error("Error generating speech:", error)
    return { error: "Failed to generate speech. Please try again." }
  }
}
