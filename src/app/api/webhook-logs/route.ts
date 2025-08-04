import { NextRequest, NextResponse } from 'next/server'
import { WebhookLogEntry, WebhookAnalytics } from '@/lib/webhook-monitoring'

// In-memory storage for demo (replace with database in production)
let webhookLogs: WebhookLogEntry[] = []
const MAX_LOGS = 50000 // Keep last 50k logs

// POST - Add new webhook log entry
export async function POST(request: NextRequest) {
  try {
    const logEntry: WebhookLogEntry = await request.json()
    
    // Validate required fields
    if (!logEntry.id || !logEntry.workflowId || !logEntry.eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: id, workflowId, eventType' },
        { status: 400 }
      )
    }

    // Add timestamp if not provided
    if (!logEntry.timestamp) {
      logEntry.timestamp = new Date().toISOString()
    }

    // Add to logs
    webhookLogs.push(logEntry)
    
    // Maintain max log size
    if (webhookLogs.length > MAX_LOGS) {
      webhookLogs = webhookLogs.slice(-MAX_LOGS)
    }

    return NextResponse.json({ success: true, id: logEntry.id }, { status: 201 })
  } catch (error) {
    console.error('Failed to save webhook log:', error)
    return NextResponse.json(
      { error: 'Failed to save log entry' },
      { status: 500 }
    )
  }
}

// GET - Retrieve webhook logs with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Query parameters
    const workflowId = searchParams.get('workflowId')
    const eventType = searchParams.get('eventType')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const correlationId = searchParams.get('correlationId')

    // Filter logs
    let filteredLogs = webhookLogs

    if (workflowId) {
      filteredLogs = filteredLogs.filter(log => log.workflowId === workflowId)
    }

    if (eventType) {
      filteredLogs = filteredLogs.filter(log => log.eventType === eventType)
    }

    if (correlationId) {
      filteredLogs = filteredLogs.filter(
        log => log.metadata.correlationId === correlationId
      )
    }

    if (startTime) {
      const start = new Date(startTime)
      filteredLogs = filteredLogs.filter(
        log => new Date(log.timestamp) >= start
      )
    }

    if (endTime) {
      const end = new Date(endTime)
      filteredLogs = filteredLogs.filter(
        log => new Date(log.timestamp) <= end
      )
    }

    // Sort by timestamp (most recent first)
    const sortedLogs = filteredLogs.toSorted(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Apply pagination
    const paginatedLogs = sortedLogs.slice(offset, offset + limit)

    return NextResponse.json({
      logs: paginatedLogs,
      pagination: {
        total: sortedLogs.length,
        limit,
        offset,
        hasMore: offset + limit < sortedLogs.length
      }
    })
  } catch (error) {
    console.error('Failed to retrieve webhook logs:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve logs' },
      { status: 500 }
    )
  }
}

// DELETE - Clear logs (optional cleanup endpoint)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId')
    const olderThan = searchParams.get('olderThan') // ISO date string
    
    if (workflowId) {
      // Delete logs for specific workflow
      const initialCount = webhookLogs.length
      webhookLogs = webhookLogs.filter(log => log.workflowId !== workflowId)
      const deletedCount = initialCount - webhookLogs.length
      
      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} logs for workflow ${workflowId}`
      })
    }
    
    if (olderThan) {
      // Delete logs older than specified date
      const cutoff = new Date(olderThan)
      const initialCount = webhookLogs.length
      webhookLogs = webhookLogs.filter(
        log => new Date(log.timestamp) >= cutoff
      )
      const deletedCount = initialCount - webhookLogs.length
      
      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} logs older than ${olderThan}`
      })
    }
    
    // Clear all logs if no filter provided
    const deletedCount = webhookLogs.length
    webhookLogs = []
    
    return NextResponse.json({
      success: true,
      message: `Deleted all ${deletedCount} logs`
    })
  } catch (error) {
    console.error('Failed to delete webhook logs:', error)
    return NextResponse.json(
      { error: 'Failed to delete logs' },
      { status: 500 }
    )
  }
}