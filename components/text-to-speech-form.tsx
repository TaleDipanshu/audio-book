"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { generateSpeech } from "@/app/actions"
import { Loader2, Volume2, Download } from "lucide-react"

export function TextToSpeechForm() {
  const [text, setText] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [timing, setTiming] = useState<{ elapsedSeconds: number; inputLength: number } | null>(null)

  // Sample paragraphs for quick testing
  const sampleTexts = [
    "Welcome to the audio book generator. This tool converts your text into natural-sounding speech that you can listen to or download for later use.",
    "The quick brown fox jumps over the lazy dog. This pangram contains all the letters of the English alphabet.",
    "In a world of digital content, having the ability to convert text to speech opens up new possibilities for accessibility and convenience.",
    "Once upon a time, in a forest far away, there lived a wise old owl who would share stories with all the woodland creatures each evening under the moonlight.",
    "Artificial intelligence continues to transform how we interact with technology, making experiences more natural and intuitive for users around the world."
  ]

  // Clean up URLs when component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsGenerating(true);
    setError(null);
    setTiming(null);

    // Clean up previous audio URL if it exists
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setAudioBlob(null);
    }

    try {
      // Use chrome.tts API for extension
      if (typeof chrome !== 'undefined' && chrome.tts) {
        chrome.tts.speak(text, {
          voiceName: 'Fritz-PlayAI',
          onEvent: (event) => {
            if (event.type === 'end') {
              setIsGenerating(false);
            }
          }
        });
      } else {
        // Fallback to server action if not in extension context
        const result = await generateSpeech(text);
        if (result.error) {
          setError(result.error);
        } else if (result.audioBase64) {
          const byteCharacters = atob(result.audioBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "audio/wav" });
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          
          // Set timing information if available
          if (result.timing) {
            setTiming(result.timing);
          }
          
          window.dispatchEvent(new CustomEvent("audioGenerated"));
        }
      }
    } catch (err) {
      setError("An error occurred while generating speech");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
  }

  const handleSampleClick = (sample: string) => {
    setText(sample);
  }

  const handleDownload = () => {
    if (!audioBlob) return

    const a = document.createElement("a")
    a.href = audioUrl!
    a.download = "speech.wav"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 shadow-xl mb-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-slate-300 mb-2">
            Enter your text
          </label>
          <Textarea
            id="text"
            placeholder="Type something to convert to speech..."
            value={text}
            onChange={handleTextChange}
            className="min-h-[120px] bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm text-white-500"> paragraphs:</p>
          <div className="flex flex-wrap gap-2">
            {sampleTexts.map((sample, index) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSampleClick(sample)}
                className="text-xs border-blue-300 text-gray-800 hover:bg-blue-500"
              >
                Text {index + 1}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <Button
            type="submit"
            disabled={isGenerating || !text.trim()}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                Generate Speech
              </>
            )}
          </Button>

          {audioUrl && (
            <>
              <audio controls src={audioUrl} className="flex-grow" id="audio-player" />
              <Button
                type="button"
                onClick={handleDownload}
                variant="outline"
                className="border-cyan-500 text-cyan-500 hover:bg-cyan-500/10"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </>
          )}
        </div>

        {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
        
        {timing && (
          <div className="text-cyan-400 text-sm mt-2">
            Generation time: {timing.elapsedSeconds.toFixed(2)} seconds
            {timing.inputLength && (
              <span className="ml-2">
                ({(timing.inputLength / timing.elapsedSeconds).toFixed(1)} characters/second)
              </span>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
