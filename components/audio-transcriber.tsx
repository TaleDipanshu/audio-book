'use client'

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function AudioTranscriber() {
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).audio as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      setError("Please select an audio file");
      return;
    }

    setLoading(true);
    setError(null);
    setTranscript(null);

    try {
      // Create form data to send the file
      const formData = new FormData();
      formData.append("file", file);

      // Send to our API route
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to transcribe audio");
      }

      const data = await response.json();
      setTranscript(data.text);
    } catch (err) {
      console.error("Transcription error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 shadow-xl mb-8">
      <h2 className="text-xl font-semibold mb-4 text-slate-200">Audio to Text Transcription</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="audio" className="block text-sm font-medium text-slate-300 mb-2">
            Upload audio file
          </label>
          <input 
            type="file" 
            name="audio" 
            id="audio"
            accept="audio/*" 
            required 
            className="block w-full text-sm text-slate-300
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-slate-700 file:text-slate-300
                      hover:file:bg-slate-600"
          />
          <p className="mt-1 text-xs text-slate-400">
            Supported formats: MP3, WAV, M4A, FLAC (max 25MB)
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Transcribing...
            </>
          ) : (
            "Transcribe Audio"
          )}
        </Button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-md">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {transcript && (
        <div className="mt-6">
          <h3 className="text-md font-medium text-slate-300 mb-2">Transcription Result:</h3>
          <div className="p-4 bg-slate-700 rounded-md text-slate-200 whitespace-pre-wrap">
            {transcript}
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(transcript)}
              className="text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Copy to Clipboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
