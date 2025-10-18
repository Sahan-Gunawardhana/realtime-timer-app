"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

interface TimerState {
  id: number
  total_seconds: number
  remaining_seconds: number
  is_running: boolean
  started_at: string | null
  updated_at: string
}

interface UseRealtimeTimerReturn {
  timerState: TimerState | null
  isLoading: boolean
  error: string | null
  startTimer: () => Promise<void>
  pauseTimer: () => Promise<void>
  resetTimer: () => Promise<void>
  createTimer: (minutes: number) => Promise<void>
  applyHint: () => Promise<void>
}

export function useRealtimeTimer(): UseRealtimeTimerReturn {
  const [timerState, setTimerState] = useState<TimerState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<any>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Only create client on the client side
  const supabase = typeof window !== 'undefined' ? createClient() : null
  const isLocalMode = !supabase

  // Calculate accurate remaining time based on server timestamp
  const calculateRemainingTime = useCallback((state: TimerState): TimerState => {
    if (!state.is_running || !state.started_at) {
      return state
    }

    const startTime = new Date(state.started_at).getTime()
    const now = Date.now()
    const elapsedSeconds = Math.floor((now - startTime) / 1000)
    const remainingSeconds = Math.max(0, state.total_seconds - elapsedSeconds)

    // Auto-stop timer when it reaches zero
    if (remainingSeconds === 0 && state.is_running) {
      return {
        ...state,
        remaining_seconds: 0,
        is_running: false,
      }
    }

    return {
      ...state,
      remaining_seconds: remainingSeconds,
    }
  }, [])

  // Fetch initial timer state
  const fetchTimerState = useCallback(async () => {
    if (!supabase) {
      setError("Database connection not configured. Please check environment variables.")
      setIsLoading(false)
      return
    }
    
    try {
      const { data, error } = await supabase
        .from("global_timer")
        .select("*")
        .eq("id", 1)
        .single()

      if (error) {
        // If no timer exists, create default one
        if (error.code === "PGRST116") {
          const { data: newTimer, error: createError } = await supabase
            .from("global_timer")
            .insert({
              id: 1,
              total_seconds: 1500,
              remaining_seconds: 1500,
              is_running: false,
              started_at: null,
            } as any)
            .select()
            .single()

          if (createError) throw createError
          setTimerState(calculateRemainingTime(newTimer))
        } else {
          throw error
        }
      } else {
        setTimerState(calculateRemainingTime(data))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch timer state")
    } finally {
      setIsLoading(false)
    }
  }, [supabase, calculateRemainingTime])

  // Set up real-time subscription or local timer
  useEffect(() => {
    if (isLocalMode) {
      // Local mode - initialize with default timer
      setTimerState({
        id: 1,
        total_seconds: 1500,
        remaining_seconds: 1500,
        is_running: false,
        started_at: null,
        updated_at: new Date().toISOString(),
      })
      setIsLoading(false)
      return
    }
    
    fetchTimerState()

    // Create real-time subscription
    channelRef.current = supabase
      .channel("global_timer_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "global_timer",
          filter: "id=eq.1",
        },
        (payload: any) => {
          console.log("Real-time update received:", payload)
          if (payload.new) {
            const newState = calculateRemainingTime(payload.new as TimerState)
            setTimerState(newState)
          }
        }
      )
      .subscribe((status: string) => {
        console.log("Subscription status:", status)
        if (status === "SUBSCRIBED") {
          setError(null)
        } else if (status === "CHANNEL_ERROR") {
          setError("Real-time connection failed")
        }
      })

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [supabase, fetchTimerState, calculateRemainingTime, isLocalMode])

  // Periodic sync to ensure all devices stay in sync
  useEffect(() => {
    if (isLocalMode || !timerState?.is_running) return

    const syncInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase!
          .from("global_timer")
          .select("*")
          .eq("id", 1)
          .single()

        if (!error && data) {
          const updatedState = calculateRemainingTime(data)
          setTimerState(updatedState)
        }
      } catch (err) {
        console.error("Sync error:", err)
      }
    }, 5000) // Sync every 5 seconds as backup

    return () => clearInterval(syncInterval)
  }, [isLocalMode, timerState?.is_running, supabase, calculateRemainingTime])

  // Client-side display update - only for visual countdown
  useEffect(() => {
    if (!timerState?.is_running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setTimerState(prev => {
        if (!prev || !prev.is_running) return prev
        
        if (isLocalMode) {
          // Local mode - simple countdown
          const newRemaining = Math.max(0, prev.remaining_seconds - 1)
          
          if (newRemaining === 0) {
            return { ...prev, remaining_seconds: 0, is_running: false }
          }
          
          return { ...prev, remaining_seconds: newRemaining }
        } else {
          // Real-time mode - just calculate display time based on server timestamp
          // Don't update database here - let server handle the countdown
          return calculateRemainingTime(prev)
        }
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timerState?.is_running, isLocalMode, calculateRemainingTime])

  // Timer operations
  const startTimer = useCallback(async () => {
    if (!timerState || timerState.remaining_seconds <= 0) return

    if (isLocalMode) {
      // Local mode - update state directly
      setTimerState(prev => prev ? {
        ...prev,
        is_running: true,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } : null)
      return
    }

    const now = new Date().toISOString()
    
    try {
      const { error } = await supabase!
        .from("global_timer")
        .update({
          is_running: true,
          started_at: now,
          updated_at: now,
        } as any)
        .eq("id", 1)

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start timer")
    }
  }, [timerState, supabase, isLocalMode])

  const pauseTimer = useCallback(async () => {
    if (!timerState) return

    if (isLocalMode) {
      // Local mode - update state directly
      setTimerState(prev => prev ? {
        ...prev,
        is_running: false,
        started_at: null,
        updated_at: new Date().toISOString(),
      } : null)
      return
    }

    const now = new Date().toISOString()
    const currentRemaining = calculateRemainingTime(timerState).remaining_seconds

    try {
      const { error } = await supabase!
        .from("global_timer")
        .update({
          is_running: false,
          remaining_seconds: currentRemaining,
          started_at: null,
          updated_at: now,
        } as any)
        .eq("id", 1)

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause timer")
    }
  }, [timerState, supabase, calculateRemainingTime, isLocalMode])

  const resetTimer = useCallback(async () => {
    if (!timerState) return

    if (isLocalMode) {
      // Local mode - update state directly
      setTimerState(prev => prev ? {
        ...prev,
        is_running: false,
        remaining_seconds: prev.total_seconds,
        started_at: null,
        updated_at: new Date().toISOString(),
      } : null)
      return
    }

    const now = new Date().toISOString()

    try {
      const { error } = await supabase!
        .from("global_timer")
        .update({
          is_running: false,
          remaining_seconds: timerState.total_seconds,
          started_at: null,
          updated_at: now,
        } as any)
        .eq("id", 1)

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset timer")
    }
  }, [timerState, supabase, isLocalMode])

  const createTimer = useCallback(async (minutes: number) => {
    const seconds = minutes * 60

    if (isLocalMode) {
      // Local mode - update state directly
      setTimerState(prev => prev ? {
        ...prev,
        total_seconds: seconds,
        remaining_seconds: seconds,
        is_running: false,
        started_at: null,
        updated_at: new Date().toISOString(),
      } : null)
      return
    }
    
    const now = new Date().toISOString()

    try {
      const { error } = await supabase!
        .from("global_timer")
        .update({
          total_seconds: seconds,
          remaining_seconds: seconds,
          is_running: false,
          started_at: null,
          updated_at: now,
        } as any)
        .eq("id", 1)

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create timer")
    }
  }, [supabase, isLocalMode])

  const applyHint = useCallback(async () => {
    if (!timerState || timerState.remaining_seconds <= 120) return

    if (isLocalMode) {
      // Local mode - update state directly
      const newRemaining = Math.max(0, timerState.remaining_seconds - 120)
      setTimerState(prev => prev ? {
        ...prev,
        remaining_seconds: newRemaining,
        updated_at: new Date().toISOString(),
      } : null)
      return
    }

    const now = new Date().toISOString()
    const currentRemaining = calculateRemainingTime(timerState).remaining_seconds
    const newRemaining = Math.max(0, currentRemaining - 120)

    // Calculate new total seconds to maintain the hint reduction
    const newTotalSeconds = timerState.is_running 
      ? newRemaining // If running, set total to remaining so timer continues from reduced time
      : timerState.total_seconds // If paused, keep original total

    try {
      const { error } = await supabase!
        .from("global_timer")
        .update({
          remaining_seconds: newRemaining,
          total_seconds: newTotalSeconds,
          started_at: timerState.is_running ? now : timerState.started_at,
          updated_at: now,
        } as any)
        .eq("id", 1)

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply hint")
    }
  }, [timerState, supabase, calculateRemainingTime, isLocalMode])

  return {
    timerState,
    isLoading,
    error,
    startTimer,
    pauseTimer,
    resetTimer,
    createTimer,
    applyHint,
  }
}