"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useRealtimeTimer } from "@/hooks/use-realtime-timer"

export default function TimerPage() {
  const [hasWarned, setHasWarned] = useState<Set<number>>(new Set())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  
  const {
    timerState,
    isLoading,
    error,
    startTimer,
    pauseTimer,
    resetTimer,
    createTimer,
    applyHint,
  } = useRealtimeTimer()

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Get current values from real-time state
  const timeLeft = timerState?.remaining_seconds ?? 1500
  const initialTime = timerState?.total_seconds ?? 1500
  const isRunning = timerState?.is_running ?? false

  const handleCreateTimer = async (minutes: number) => {
    if (isRunning) return
    setHasWarned(new Set())
    await createTimer(minutes)
  }

  const handleStart = async () => {
    if (timeLeft > 0) {
      if (isRunning) {
        await pauseTimer()
      } else {
        await startTimer()
      }
    }
  }

  const handleReset = async () => {
    setHasWarned(new Set())
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    await resetTimer()
  }

  const handleHint = async () => {
    if (timeLeft > 120) {
      await applyHint()
    }
  }

  // Timer completion and warning effects
  useEffect(() => {
    if (timeLeft === 0 && isRunning && initialTime > 0) {
      toast({
        title: "Time's Up!",
        description: "Your timer has finished.",
      })
    }
  }, [timeLeft, isRunning, initialTime, toast])

  // 5-minute interval warnings
  useEffect(() => {
    if (timeLeft > 0 && timeLeft % 300 === 0 && isRunning) {
      const minutesLeft = Math.floor(timeLeft / 60)
      if (!hasWarned.has(timeLeft)) {
        toast({
          title: "Time Warning",
          description: `${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""} remaining!`,
        })
        setHasWarned((prev) => new Set([...prev, timeLeft]))
      }
    }
  }, [timeLeft, isRunning, hasWarned, toast])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center">Loading timer...</div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center text-red-500">Error: {error}</div>
      </main>
    )
  }

  const progressPercent = initialTime > 0 ? (timeLeft / initialTime) * 100 : 0

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {isRunning && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-accent text-sm font-semibold z-50">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          Running
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="bg-card/60 shadow-lg p-6 sm:p-8">
          <div className="mb-8">
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg p-6 sm:p-8">
              <div className="text-center">
                <div className="text-6xl sm:text-7xl font-bold text-primary mb-4 font-mono">{formatTime(timeLeft)}</div>
                {initialTime > 0 && (
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button
              onClick={() => handleCreateTimer(25)}
              disabled={isRunning}
              variant={initialTime === 1500 ? "default" : "outline"}
              className="font-semibold text-base py-6"
            >
              25 Min
            </Button>
            <Button
              onClick={() => handleCreateTimer(30)}
              disabled={isRunning}
              variant={initialTime === 1800 ? "default" : "outline"}
              className="font-semibold text-base py-6"
            >
              30 Min
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={handleStart}
              disabled={timeLeft === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base py-6"
            >
              {isRunning ? "Pause" : "Start"}
            </Button>
            <Button onClick={handleReset} variant="outline" className="font-semibold text-base py-6 bg-transparent">
              Reset
            </Button>
            <Button
              onClick={handleHint}
              disabled={timeLeft <= 120}
              variant="outline"
              className="font-semibold text-base py-6 bg-transparent"
            >
              Hint (-2m)
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
