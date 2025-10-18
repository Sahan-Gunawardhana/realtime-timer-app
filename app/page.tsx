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
    toggleFloorReady,
    toggleFloorComplete,
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

  const handleFloorReady = async (floorName: string) => {
    await toggleFloorReady(floorName)
    toast({
      title: `${floorName} Ready Status`,
      description: "Player readiness updated",
    })
  }

  const handleFloorComplete = async (floorName: string) => {
    await toggleFloorComplete(floorName)
    toast({
      title: `${floorName} Progress`,
      description: "Floor completion updated",
    })
  }

  // Timer completion and warning effects
  useEffect(() => {
    if (timeLeft === 0 && isRunning && initialTime > 0) {
      toast({
        title: "Timer Completed",
        description: "Session time has elapsed",
      })
    }
  }, [timeLeft, isRunning, initialTime, toast])

  // 5-minute interval warnings
  useEffect(() => {
    if (timeLeft > 0 && timeLeft % 300 === 0 && isRunning) {
      const minutesLeft = Math.floor(timeLeft / 60)
      if (!hasWarned.has(timeLeft)) {
        toast({
          title: "Time Checkpoint",
          description: `${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""} remaining`,
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
  
  // Smooth color gradient based on time remaining
  const getTimerColors = () => {
    if (timeLeft === 0) {
      return {
        textColor: "text-red-500",
        strokeColor: "stroke-red-500",
        rgbStroke: "rgb(239, 68, 68)" // red-500
      }
    }
    
    const percent = progressPercent / 100
    
    if (percent > 0.5) {
      // Green to Yellow transition (100% to 50%)
      const greenToYellow = (percent - 0.5) * 2 // 0 to 1
      const red = Math.round(34 + (234 - 34) * (1 - greenToYellow)) // 34 to 234
      const green = Math.round(197) // Keep green constant
      const blue = Math.round(94 * greenToYellow) // 0 to 94
      
      return {
        textColor: "text-yellow-500",
        strokeColor: "stroke-yellow-500",
        rgbStroke: `rgb(${red}, ${green}, ${blue})`
      }
    } else {
      // Yellow to Red transition (50% to 0%)
      const yellowToRed = percent * 2 // 0 to 1
      const red = Math.round(234 + (239 - 234) * (1 - yellowToRed)) // 234 to 239
      const green = Math.round(179 * yellowToRed) // 179 to 68
      const blue = Math.round(68) // Keep blue constant
      
      return {
        textColor: "text-red-500",
        strokeColor: "stroke-red-500", 
        rgbStroke: `rgb(${red}, ${green}, ${blue})`
      }
    }
  }

  const timerColors = getTimerColors()

  return (
    <main className="h-screen bg-black text-white flex flex-col overflow-hidden">
      <div className="flex-1 w-full max-w-sm mx-auto flex flex-col px-4 py-2 min-h-0">
        {/* Large Circular Timer */}
        <div className="text-center mb-3 flex-shrink-0">
          <div className="relative w-40 h-40 mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="45"
                stroke="rgb(55, 65, 81)" strokeWidth="4" fill="none"
              />
              <circle
                cx="50" cy="50" r="45"
                stroke={timerColors.rgbStroke} strokeWidth="4" fill="none"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercent / 100)}`}
                style={{ 
                  transition: "stroke-dashoffset 0.3s ease, stroke 0.5s ease"
                }}
              />
            </svg>
            
            {/* Timer and Status Inside Circle */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div 
                className={`text-3xl font-mono font-bold mb-1 transition-colors duration-500`}
                style={{ color: timerColors.rgbStroke }}
              >
                {formatTime(timeLeft)}
              </div>
              {isRunning && (
                <div className="flex items-center gap-1 text-sm">
                  <div 
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: timerColors.rgbStroke }}
                  />
                  <span style={{ color: timerColors.rgbStroke }}>Running</span>
                </div>
              )}
              {!isRunning && timeLeft > 0 && (
                <div className="text-gray-400 text-sm">Ready</div>
              )}
              {timeLeft === 0 && (
                <div className="text-red-400 text-sm font-medium">Time Up</div>
              )}
            </div>
          </div>
        </div>

        {/* Timer Controls */}
        <div className="space-y-2 mb-3 flex-shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleCreateTimer(25)}
              disabled={isRunning}
              className="h-9 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-medium disabled:opacity-50 text-sm"
            >
              25 Min
            </button>
            <button
              onClick={() => handleCreateTimer(30)}
              disabled={isRunning}
              className="h-9 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-medium disabled:opacity-50 text-sm"
            >
              30 Min
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleStart}
              disabled={timeLeft === 0}
              className="h-9 bg-green-500 hover:bg-green-600 rounded-lg text-white font-medium disabled:opacity-50 text-sm"
            >
              {isRunning ? "Pause" : "Start"}
            </button>
            <button
              onClick={handleHint}
              disabled={timeLeft <= 120}
              className="h-9 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-medium disabled:opacity-50 text-sm"
            >
              -2 Min
            </button>
            <button
              onClick={async () => {
                await pauseTimer()
                toast({
                  title: "Session Terminated",
                  description: "Timer stopped manually",
                })
              }}
              disabled={!isRunning}
              className="h-9 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-black font-medium disabled:opacity-50 text-sm"
            >
              Stop
            </button>
          </div>
        </div>

        {/* Floor Status Sections */}
        <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
          {/* Player Ready Status */}
          <div className="flex-shrink-0">
            <h3 className="text-base font-semibold mb-2 text-center text-white">Player Ready</h3>
            <div className="grid grid-cols-3 gap-2">
              {floorStatuses.filter(f => !["right", "wrong"].includes(f.id)).map((floor) => (
                <button
                  key={`ready-${floor.id}`}
                  onClick={() => handleFloorReady(floor.floor_name)}
                  className={`h-9 rounded-lg font-medium text-xs transition-all duration-200 ${
                    floor.is_ready 
                      ? "bg-yellow-500 text-black shadow-lg" 
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {floor.floor_name.replace(" Floor", "")}
                </button>
              ))}
            </div>
          </div>

          {/* Floor Progress */}
          <div className="flex-shrink-0">
            <h3 className="text-base font-semibold mb-2 text-center text-white">Floor Progress</h3>
            <div className="grid grid-cols-3 gap-2">
              {floorStatuses.filter(f => !["right", "wrong"].includes(f.id)).map((floor) => (
                <button
                  key={`complete-${floor.id}`}
                  onClick={() => handleFloorComplete(floor.floor_name)}
                  className={`h-9 rounded-lg font-medium text-xs transition-all duration-200 ${
                    floor.is_completed 
                      ? "bg-green-500 text-white shadow-lg" 
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {floor.floor_name.replace(" Floor", "")}
                </button>
              ))}
            </div>
          </div>

          {/* Ending Status */}
          <div className="flex-shrink-0">
            <h3 className="text-base font-semibold mb-2 text-center text-white">Ending</h3>
            <div className="grid grid-cols-2 gap-2">
              {floorStatuses.filter(f => ["right", "wrong"].includes(f.id)).map((ending) => (
                <button
                  key={ending.id}
                  onClick={() => handleFloorComplete(ending.floor_name)}
                  className={`h-9 rounded-lg font-medium text-xs transition-all duration-200 ${
                    ending.is_completed 
                      ? ending.id === "right" 
                        ? "bg-green-500 text-white shadow-lg"
                        : "bg-yellow-500 text-black shadow-lg"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {ending.floor_name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
