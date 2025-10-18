import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"

export async function GET() {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from("floor_status")
      .select("*")
      .order("floor_name")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch floor status" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { floorName, action } = await request.json()
    
    if (!floorName || !action) {
      return NextResponse.json(
        { error: "Floor name and action are required" },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const floorId = floorName.toLowerCase().replace(/\s+/g, '_')
    const now = new Date().toISOString()

    // Get current status
    const { data: currentData, error: fetchError } = await supabase
      .from("floor_status")
      .select("*")
      .eq("id", floorId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    let updateData: any = {
      id: floorId,
      floor_name: floorName,
      updated_at: now,
    }

    if (action === "toggle_ready") {
      const newReadyStatus = !currentData?.is_ready
      updateData.is_ready = newReadyStatus
      updateData.is_completed = currentData?.is_completed || false
      updateData.ready_at = newReadyStatus ? now : null
      updateData.completed_at = currentData?.completed_at || null
    } else if (action === "toggle_complete") {
      const newCompleteStatus = !currentData?.is_completed
      updateData.is_ready = currentData?.is_ready || false
      updateData.is_completed = newCompleteStatus
      updateData.ready_at = currentData?.ready_at || null
      updateData.completed_at = newCompleteStatus ? now : null
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'toggle_ready' or 'toggle_complete'" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("floor_status")
      .upsert(updateData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update floor status" },
      { status: 500 }
    )
  }
}