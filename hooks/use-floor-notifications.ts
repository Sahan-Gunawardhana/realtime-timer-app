"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

interface FloorStatus {
  id: string
  floor_name: string
  is_completed: boolean
  completed_at: string | null
  updated_at: string
}

interface UseFloorNotificationsReturn {
  floorStatuses: FloorStatus[]
  isLoading: boolean
  error: string | null
  toggleFloorStatus: (floorName: string) => Promise<void>
  resetAllFloors: () => Promise<void>
}

export function useFloorNotifications(): UseFloorNotificationsReturn {
  const [floorStatuses, setFloorStatuses] = useState<FloorStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<any>(null)
  
  const supabase = typeof window !== 'undefined' ? createClient() : null
  const isLocalMode = !supabase

  const floors = ["Basement", "1st Floor", "2nd Floor"]
  const endings = ["Right", "Wrong"]

  // Initialize floor statuses
  const initializeFloors = useCallback(async () => {
    if (isLocalMode) {
      // Local mode - initialize with default statuses
      const defaultStatuses = [
        ...floors.map(floor => ({
          id: floor.toLowerCase().replace(/\s+/g, '_'),
          floor_name: floor,
          is_completed: false,
          completed_at: null,
          updated_at: new Date().toISOString(),
        })),
        ...endings.map(ending => ({
          id: ending.toLowerCase(),
          floor_name: ending,
          is_completed: false,
          completed_at: null,
          updated_at: new Date().toISOString(),
        }))
      ]
      setFloorStatuses(defaultStatuses)
      setIsLoading(false)
      return
    }

    if (!supabase) return

    try {
      // Check if floor_status table exists and has data
      const { data, error } = await supabase
        .from("floor_status")
        .select("*")
        .order("floor_name")

      if (error) {
        // Table doesn't exist or other error - use local mode
        console.log("Floor status table not available, using local mode")
        throw new Error("Table not available")
      }

      if (!data || data.length === 0) {
        // Table exists but no data - initialize it
        const defaultItems = [
          ...floors.map(floor => ({
            id: floor.toLowerCase().replace(/\s+/g, '_'),
            floor_name: floor,
            is_completed: false,
            completed_at: null,
          })),
          ...endings.map(ending => ({
            id: ending.toLowerCase(),
            floor_name: ending,
            is_completed: false,
            completed_at: null,
          }))
        ]

        const { data: insertedData, error: insertError } = await supabase
          .from("floor_status")
          .upsert(defaultItems, { onConflict: 'id' })
          .select()

        if (insertError) {
          console.log("Could not initialize floor data, using local mode")
          throw insertError
        }
        
        setFloorStatuses(insertedData || defaultItems)
      } else {
        setFloorStatuses(data)
      }
    } catch (err) {
      // Fallback to local mode - don't log error, just use local state
      const defaultStatuses = [
        ...floors.map(floor => ({
          id: floor.toLowerCase().replace(/\s+/g, '_'),
          floor_name: floor,
          is_completed: false,
          completed_at: null,
          updated_at: new Date().toISOString(),
        })),
        ...endings.map(ending => ({
          id: ending.toLowerCase(),
          floor_name: ending,
          is_completed: false,
          completed_at: null,
          updated_at: new Date().toISOString(),
        }))
      ]
      setFloorStatuses(defaultStatuses)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, isLocalMode])

  // Set up real-time subscription
  useEffect(() => {
    initializeFloors()

    if (isLocalMode || !supabase) return

    // Create real-time subscription for floor status
    channelRef.current = supabase
      .channel("floor_status_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "floor_status",
        },
        (payload: any) => {
          if (payload.new) {
            setFloorStatuses(prev => {
              const updated = [...prev]
              const index = updated.findIndex(f => f.id === payload.new.id)
              if (index >= 0) {
                updated[index] = payload.new
              } else {
                updated.push(payload.new)
              }
              return updated.sort((a, b) => a.floor_name.localeCompare(b.floor_name))
            })
          }
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          setError(null)
        } else if (status === "CHANNEL_ERROR") {
          setError("Floor notifications connection failed")
        }
      })

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [supabase, isLocalMode, initializeFloors])

  const toggleFloorStatus = useCallback(async (floorName: string) => {
    const floorId = floorName.toLowerCase().replace(/\s+/g, '_')
    const currentStatus = floorStatuses.find(f => f.id === floorId)
    const newStatus = !currentStatus?.is_completed

    if (isLocalMode) {
      // Local mode - update state directly
      setFloorStatuses(prev => prev.map(floor => 
        floor.id === floorId 
          ? {
              ...floor,
              is_completed: newStatus,
              completed_at: newStatus ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            }
          : floor
      ))
      return
    }

    if (!supabase) return

    const now = new Date().toISOString()

    try {
      const { error } = await supabase
        .from("floor_status")
        .upsert({
          id: floorId,
          floor_name: floorName,
          is_completed: newStatus,
          completed_at: newStatus ? now : null,
          updated_at: now,
        } as any)

      if (error) {
        // If database update fails, update local state instead
        setFloorStatuses(prev => prev.map(floor => 
          floor.id === floorId 
            ? {
                ...floor,
                is_completed: newStatus,
                completed_at: newStatus ? now : null,
                updated_at: now,
              }
            : floor
        ))
      }
    } catch (err) {
      // Fallback to local update
      setFloorStatuses(prev => prev.map(floor => 
        floor.id === floorId 
          ? {
              ...floor,
              is_completed: newStatus,
              completed_at: newStatus ? now : null,
              updated_at: now,
            }
          : floor
      ))
    }
  }, [floorStatuses, supabase, isLocalMode])

  const resetAllFloors = useCallback(async () => {
    if (isLocalMode) {
      // Local mode - reset all statuses
      setFloorStatuses(prev => prev.map(floor => ({
        ...floor,
        is_completed: false,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })))
      return
    }

    if (!supabase) return

    const now = new Date().toISOString()

    try {
      const { error } = await supabase
        .from("floor_status")
        .update({
          is_completed: false,
          completed_at: null,
          updated_at: now,
        } as any)
        .neq('id', 'nonexistent') // Update all rows

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset floor statuses")
    }
  }, [supabase, isLocalMode])

  return {
    floorStatuses,
    isLoading,
    error,
    toggleFloorStatus,
    resetAllFloors,
  }
}