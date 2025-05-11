"use client"

import { useEffect, useRef, useState } from "react"

export function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const isSetupRef = useRef<boolean>(false)

  // Initialize audio context once
  useEffect(() => {
    // Create audio context only once
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 256
      } catch (error) {
        console.error("Failed to create audio context:", error)
      }
    }

    return () => {
      // Clean up on unmount
      stopVisualization()
      if (sourceRef.current) {
        sourceRef.current.disconnect()
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(console.error)
      }
    }
  }, [])

  // Handle audio generation event
  useEffect(() => {
    const handleAudioGenerated = () => {
      // Find the audio element
      const audioElement = document.getElementById("audio-player") as HTMLAudioElement
      if (!audioElement) return

      // Store reference to the audio element
      audioElementRef.current = audioElement

      // Set up audio node if not already set up
      if (!isSetupRef.current && audioContextRef.current && analyserRef.current) {
        try {
          // Clean up any existing source
          if (sourceRef.current) {
            sourceRef.current.disconnect()
          }

          // Create a new source
          sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement)
          sourceRef.current.connect(analyserRef.current)
          analyserRef.current.connect(audioContextRef.current.destination)
          isSetupRef.current = true
        } catch (error) {
          console.error("Error setting up audio node:", error)
        }
      }
    }

    window.addEventListener("audioGenerated", handleAudioGenerated)
    return () => window.removeEventListener("audioGenerated", handleAudioGenerated)
  }, [])

  // Handle audio playback events
  useEffect(() => {
    const handlePlay = () => {
      setIsPlaying(true)
      startVisualization()
    }

    const handlePause = () => {
      setIsPlaying(false)
      stopVisualization()
    }

    const handleEnded = () => {
      setIsPlaying(false)
      stopVisualization()
    }

    // Add event listeners to the audio element
    const addEventListeners = () => {
      const audioElement = audioElementRef.current
      if (!audioElement) return

      audioElement.addEventListener("play", handlePlay)
      audioElement.addEventListener("pause", handlePause)
      audioElement.addEventListener("ended", handleEnded)
    }

    // Remove event listeners from the audio element
    const removeEventListeners = () => {
      const audioElement = audioElementRef.current
      if (!audioElement) return

      audioElement.removeEventListener("play", handlePlay)
      audioElement.removeEventListener("pause", handlePause)
      audioElement.removeEventListener("ended", handleEnded)
    }

    // Add event listeners when the component mounts
    addEventListeners()

    // Clean up event listeners when the component unmounts
    return removeEventListeners
  }, [])

  const startVisualization = () => {
    if (!canvasRef.current || !analyserRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const width = canvas.width
    const height = canvas.height

    const renderFrame = () => {
      if (!isPlaying) return

      animationRef.current = requestAnimationFrame(renderFrame)

      analyser.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, width, height)

      // Create a gradient background
      const gradient = ctx.createLinearGradient(0, 0, width, 0)
      gradient.addColorStop(0, "rgba(14, 165, 233, 0.7)") // sky-500
      gradient.addColorStop(1, "rgba(168, 85, 247, 0.7)") // purple-500

      const barWidth = (width / bufferLength) * 2.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height

        ctx.fillStyle = gradient
        ctx.fillRect(x, height - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }
    }

    renderFrame()
  }

  const stopVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
      <h2 className="text-xl font-semibold mb-4 text-slate-200">Audio Visualization</h2>
      <div className="relative h-64 bg-slate-900 rounded-lg overflow-hidden">
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            {/* Show a placeholder visualization when not playing */}
            <div className="flex items-end space-x-1 h-20">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-gradient-to-t from-cyan-500 to-purple-500 opacity-30"
                  style={{
                    height: `${Math.sin(i / 3) * 50 + 30}%`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <canvas ref={canvasRef} width={800} height={300} className="w-full h-full" />
      </div>
      <p className="text-slate-400 text-sm mt-4 text-center">
        Generate and play audio to see the visualization come to life
      </p>
    </div>
  )
}
