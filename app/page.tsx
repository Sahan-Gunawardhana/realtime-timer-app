"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useRealtimeTimer } from "@/hooks/use-realtime-timer"
import { useFloorNotifications } from "@/hooks/use-floor-notifications"

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

  const {
    floorStatuses,
    toggleFloorStatus,
    resetAllFloors,
  } = useFloorNotifications()

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

  const handleFloorToggle = async (floorName: string) => {
    await toggleFloorStatus(floorName)
    toast({
      title: `${floorName}`,
      description: "Status updated",
    })
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
  
  // iOS timer colors based on time remaining (softer green)
  const getTimerColor = () => {
    if (progressPercent > 60) return "text-green-400"
    if (progressPercent > 30) return "text-orange-400"
    return "text-red-500"
  }

  const getProgressColor = () => {
    if (progressPercent > 60) return "stroke-green-400"
    if (progressPercent > 30) return "stroke-orange-400"
    return "stroke-red-500"
  }

  return (
    <main className="min-h-screen bg-black text-white p-3 flex flex-col">
      <div className="flex-1 max-w-xs mx-auto w-full">
        {/* Progress Indicator at Top */}
        <div className="w-full h-1 bg-gray-800 rounded-full mb-4">
          <div 
            className={`h-full rounded-full transition-all duration-300 ${
              progressPercent > 60 ? "bg-green-400" : 
              progressPercent > 30 ? "bg-orange-400" : "bg-red-500"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* iOS-style Timer Display */}
        <div className="text-center mb-6">
          <div className={`text-5xl sm:text-6xl font-thin ${getTimerColor()} mb-4 font-mono`}>
            {formatTime(timeLeft)}
          </div>
          
          {/* Compact Circular Progress */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="45"
                stroke="rgb(55, 65, 81)" strokeWidth="3" fill="none"
              />
              <circle
                cx="50" cy="50" r="45"
                stroke="currentColor" strokeWidth="3" fill="none"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercent / 100)}`}
                className={getProgressColor()}
                style={{ transition: "stroke-dashoffset 0.3s ease" }}
              />
            </svg>
            {isRunning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* Timer Controls */}
        <div className="space-y-2 mb-6">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleCreateTimer(25)}
              disabled={isRunning}
              className="h-11 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-medium text-sm disabled:opacity-50"
            >
              25 Min
            </button>
            <button
              onClick={() => handleCreateTimer(30)}
              disabled={isRunning}
              className="h-11 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-medium text-sm disabled:opacity-50"
            >
              30 Min
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleStart}
              disabled={timeLeft === 0}
              className="h-11 bg-green-500 hover:bg-green-600 rounded-lg text-white font-medium text-sm disabled:opacity-50"
            >
              {isRunning ? "Pause" : "Start"}
            </button>
            <button
              onClick={handleHint}
              disabled={timeLeft <= 120}
              className="h-11 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-medium text-sm disabled:opacity-50"
            >
              -2 Min
            </button>
          </div>
        </div>

        {/* Floor Status */}
        <div className="mb-4">
          <h3 className="text-base font-medium mb-2">Floors</h3>
          <div className="grid grid-cols-3 gap-2">
            {floorStatuses.filter(f => !["right", "wrong"].includes(f.id)).map((floor) => (
              <button
                key={floor.id}
                onClick={() => handleFloorToggle(floor.floor_name)}
                className={`h-9 rounded-lg font-medium text-xs transition-all ${
                  floor.is_completed 
                    ? "bg-green-500 text-white" 
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {floor.floor_name.replace(" Floor", "")}
              </button>
            ))}
          </div>
        </div>

        {/* Ending Status */}
        <div>
          <h3 className="text-base font-medium mb-2">Ending</h3>
          <div className="grid grid-cols-2 gap-2">
            {floorStatuses.filter(f => ["right", "wrong"].includes(f.id)).map((ending) => (
              <button
                key={ending.id}
                onClick={() => handleFloorToggle(ending.floor_name)}
                className={`h-9 rounded-lg font-medium text-xs transition-all ${
                  ending.is_completed 
                    ? ending.id === "right" 
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {ending.floor_name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
