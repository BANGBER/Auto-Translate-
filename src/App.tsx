/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Mic, 
  MicOff, 
  Copy, 
  Check, 
  Languages, 
  Trash2, 
  Moon, 
  Sun, 
  Loader2,
  Volume2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debouncedInput = useDebounce(input, 500);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "id-ID"; // Default to Indonesian, but it can detect others

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join("");
        
        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setError("Microphone access denied or not supported.");
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Handle Translation
  const translateText = useCallback(async (text: string) => {
    if (!text.trim()) {
      setOutput("");
      setIsLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();
      setOutput(data.translation);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Translation error:", err);
      setError("Translation error, please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger translation when debounced input changes
  useEffect(() => {
    translateText(debouncedInput);
  }, [debouncedInput, translateText]);

  // Handle Recording
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setError("Microphone access denied or not supported.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setError(null);
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  // Handle Copy
  const copyToClipboard = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Handle Clear
  const clearInput = () => {
    setInput("");
    setOutput("");
    setError(null);
  };

  // Handle Text-to-Speech
  const speak = (text: string) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  // Toggle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"}`}>
      {/* Header */}
      <header className="max-w-6xl mx-auto px-6 py-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <Languages className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Linguify AI</h1>
        </div>
        
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-2.5 rounded-full transition-all hover:scale-110 active:scale-95 ${isDarkMode ? "bg-zinc-800 text-yellow-400" : "bg-white text-zinc-600 shadow-sm border border-zinc-200"}`}
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Input Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative group rounded-3xl p-6 transition-all border ${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"}`}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Source Text</span>
              <div className="flex gap-2">
                <button 
                  onClick={clearInput}
                  className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                  title="Clear"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type something to translate..."
              className="w-full h-64 bg-transparent border-none focus:ring-0 resize-none text-xl leading-relaxed placeholder:text-zinc-400"
            />

            <div className="flex justify-between items-center mt-4">
              <button
                onClick={toggleRecording}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-medium ${
                  isRecording 
                    ? "bg-red-500 text-white animate-pulse" 
                    : isDarkMode ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isRecording ? "Recording..." : "Voice Input"}
              </button>
              
              <div className="text-xs text-zinc-400 font-medium">
                {input.length} characters
              </div>
            </div>
          </motion.div>

          {/* Output Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`relative rounded-3xl p-6 transition-all border ${isDarkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-indigo-50/30 border-indigo-100 shadow-sm"}`}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500">English Translation</span>
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-indigo-500"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-medium">Translating...</span>
                </motion.div>
              )}
            </div>

            <div className={`w-full h-64 overflow-y-auto text-xl leading-relaxed ${!output && "text-zinc-400 italic"}`}>
              {output || (isLoading ? "" : "Translation will appear here...")}
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  disabled={!output}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                    isCopied 
                      ? "bg-green-500 text-white" 
                      : isDarkMode ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {isCopied ? "Copied!" : "Copy"}
                </button>

                <button
                  onClick={() => speak(output)}
                  disabled={!output}
                  className={`p-2 rounded-full transition-all disabled:opacity-50 ${isDarkMode ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"}`}
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-center text-sm font-medium"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features Info */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center dark:bg-indigo-900/30">
              <Languages className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-bold">Auto Detect</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">Automatically detects the source language and translates it instantly to English.</p>
          </div>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center dark:bg-indigo-900/30">
              <Mic className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-bold">Voice Input</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">Speak naturally and watch your words transform into another language in real-time.</p>
          </div>
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center dark:bg-indigo-900/30">
              <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-bold">AI Powered</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">Powered by Google Gemini for highly accurate and context-aware translations.</p>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-zinc-200 dark:border-zinc-800 text-center text-zinc-400 text-sm">
        <p>© 2026 Linguify AI. Modern Real-time Translation.</p>
      </footer>
    </div>
  );
}

