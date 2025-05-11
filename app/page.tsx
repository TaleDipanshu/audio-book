import { TextToSpeechForm } from "@/components/text-to-speech-form"
import { AudioVisualizer } from "@/components/audio-visualizer"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
          Text to Speech Visualizer
        </h1>
        <p className="text-center text-slate-300 mb-12">
          Enter your text below and listen to it with a beautiful audio visualization
        </p>

        <div className="max-w-3xl mx-auto">
          <TextToSpeechForm />
          <AudioVisualizer />
        </div>
      </div>
    </main>
  )
}
