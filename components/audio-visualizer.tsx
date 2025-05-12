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
      // Reset setup flag to ensure we reconnect to the new audio element
      isSetupRef.current = false;
      
      // Give the DOM a moment to update with the new audio element
      setTimeout(() => {
        // Find the audio element - try multiple selectors
        const audioElement = 
          document.getElementById("audio-player") || 
          document.querySelector("audio") as HTMLAudioElement;
          
        if (!audioElement) {
          console.error("Audio player element not found after generation");
          return;
        }

        console.log("Found audio element:", audioElement);
        
        // Store reference to the audio element
        audioElementRef.current = audioElement;

        // Remove existing event listeners if any
        audioElement.removeEventListener("play", handlePlay);
        audioElement.removeEventListener("pause", handlePause);
        audioElement.removeEventListener("ended", handleEnded);

        // Set up event listeners for this audio element
        audioElement.addEventListener("play", handlePlay);
        audioElement.addEventListener("pause", handlePause);
        audioElement.addEventListener("ended", handleEnded);

        // Resume audio context if it's suspended
        if (audioContextRef.current) {
          if (audioContextRef.current.state === "suspended") {
            audioContextRef.current.resume().catch(console.error);
          }
          
          setupAudioNode(audioElement);
          
          // If audio is already playing, start visualization
          if (!audioElement.paused) {
            setIsPlaying(true);
            startVisualization();
          }
        }
      }, 300); // Increased delay to ensure DOM is updated
    };

    // Rest of the event handlers remain the same
    const handlePlay = () => {
      console.log("Audio play event triggered");
      setIsPlaying(true);
      startVisualization();
    };

    const handlePause = () => {
      console.log("Audio pause event triggered");
      setIsPlaying(false);
      stopVisualization();
    };

    const handleEnded = () => {
      console.log("Audio ended event triggered");
      setIsPlaying(false);
      stopVisualization();
    };

    // Add event listener for the custom event
    window.addEventListener("audioGenerated", handleAudioGenerated);
    
    // Try to find existing audio element on mount with multiple selectors
    const findAudioElement = () => {
      const existingAudio = 
        document.getElementById("audio-player") || 
        document.querySelector("audio") as HTMLAudioElement;
        
      if (existingAudio) {
        console.log("Found existing audio on mount:", existingAudio);
        audioElementRef.current = existingAudio;
        
        // Remove any existing listeners first
        existingAudio.removeEventListener("play", handlePlay);
        existingAudio.removeEventListener("pause", handlePause);
        existingAudio.removeEventListener("ended", handleEnded);
        
        // Add listeners
        existingAudio.addEventListener("play", handlePlay);
        existingAudio.addEventListener("pause", handlePause);
        existingAudio.addEventListener("ended", handleEnded);
        
        setupAudioNode(existingAudio);
      } else {
        console.log("No audio element found on mount, will wait for generation");
      }
    };
    
    // Try immediately and also with a delay to ensure DOM is ready
    findAudioElement();
    setTimeout(findAudioElement, 500);

    return () => {
      window.removeEventListener("audioGenerated", handleAudioGenerated);
      // Clean up event listeners from any audio element
      if (audioElementRef.current) {
        audioElementRef.current.removeEventListener("play", handlePlay);
        audioElementRef.current.removeEventListener("pause", handlePause);
        audioElementRef.current.removeEventListener("ended", handleEnded);
      }
    };
  }, []);

  // Setup canvas size on mount and resize
  useEffect(() => {
    const resizeCanvas = () => {
      if (!canvasRef.current) return
      const canvas = canvasRef.current
      const container = canvas.parentElement
      if (!container) return

      // Set canvas dimensions to match container's client dimensions
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }

    // Initial resize
    resizeCanvas()

    // Add resize listener
    window.addEventListener('resize', resizeCanvas)
    
    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  const setupAudioNode = (audioElement: HTMLAudioElement) => {
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

  const startVisualization = () => {
    if (!canvasRef.current || !analyserRef.current) {
      console.error("Canvas or analyser not available");
      return;
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      console.error("Could not get canvas context");
      return;
    }

    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const width = canvas.width
    const height = canvas.height
    
    // Create random values for more dynamic visualization
    const randomValues = Array.from({ length: bufferLength }, () => Math.random() * 0.5 + 0.5)
    let phase = 0

    // Force canvas to be visible
    canvas.style.display = 'block';
    canvas.style.opacity = '1';

    const renderFrame = () => {
      // Only continue animation if we're still playing
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(renderFrame)
      } else {
        return;
      }

      // Get frequency data from the analyser
      try {
        analyser.getByteFrequencyData(dataArray)
      } catch (error) {
        console.error("Error getting frequency data:", error)
      }

      // Clear the canvas
      ctx.clearRect(0, 0, width, height)

      // Create a gradient background
      const gradient = ctx.createLinearGradient(0, 0, width, 0)
      gradient.addColorStop(0, "rgba(14, 165, 233, 0.7)") // sky-500
      gradient.addColorStop(1, "rgba(168, 85, 247, 0.7)") // purple-500

      const barWidth = Math.max(1, (width / bufferLength) * 2.5)
      let x = 0
      
      // Increment phase for wave-like movement
      phase += 0.05
      
      // Draw bars
      for (let i = 0; i < bufferLength; i++) {
        // Generate random movement
        const randomFactor = 0.2 + Math.sin(phase + i * 0.15) * 0.1
        const randomMultiplier = randomValues[i] * randomFactor
        
        // Ensure minimum height for visualization
        let value = 0.2 + randomMultiplier * 0.3
        
        // Add audio data if available
        const audioValue = dataArray[i] / 255
        if (audioValue > 0.05) {
          value = Math.max(value, audioValue * 0.7 + randomMultiplier * 0.3)
        }
        
        const barHeight = value * height

        ctx.fillStyle = gradient
        ctx.fillRect(x, height - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }
      
      // Occasionally update random values for more variation
      if (Math.random() < 0.03) {
        for (let i = 0; i < randomValues.length; i++) {
          if (Math.random() < 0.1) {
            randomValues[i] = Math.random() * 0.5 + 0.5
          }
        }
      }
    }

    // Stop any existing animation before starting a new one
    stopVisualization()
    
    // Start the animation loop
    console.log("Starting visualization, canvas dimensions:", width, "x", height);
    renderFrame()
  }

  const stopVisualization = () => {
    if (animationRef.current !== null) {
      console.log("Stopping visualization");
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
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      <p className="text-slate-400 text-sm mt-4 text-center">
        Generate and play audio to see the visualization come to life
      </p>
    </div>
  )
}
