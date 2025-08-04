import { NextRequest, NextResponse } from 'next/server'
import { WebhookAnalytics, WebhookEventType } from '@/lib/webhook-monitoring'

// This would typically fetch from the same data source as webhook-logs
// For now, we'll simulate the analytics calculation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId')
    const hours = parseInt(searchParams.get('hours') || '24')
    const granularity = searchParams.get('granularity') || 'hour' // hour, day, week

    if (!workflowId) {
      return NextResponse.json(
        { error: 'workflowId parameter is required' },
        { status: 400 }
      )
    }

    // Fetch logs from webhook-logs API
    const logsResponse = await fetch(
      `${request.nextUrl.origin}/api/webhook-logs?workflowId=${workflowId}&startTime=${new Date(
        Date.now() - hours * 60 * 60 * 1000
      ).toISOString()}&limit=10000`,
      { headers: { 'Content-Type': 'application/json' } }
    )

    if (!logsResponse.ok) {
      throw new Error('Failed to fetch webhook logs')
    }

    const { logs } = await logsResponse.json()

    // Calculate analytics
    const analytics = calculateWebhookAnalytics(
      workflowId,
      logs,
      hours,
      granularity
    )

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Failed to generate webhook analytics:', error)
    return NextResponse.json(
      { error: 'Failed to generate analytics' },
      { status: 500 }
    )
  }
}

interface WebhookLog {
  timestamp: string
  status: 'success' | 'error'
  responseTime: number
  workflowId?: string
  error?: string
}

// Helper function to calculate analytics from logs
function calculateWebhookAnalytics(
  workflowId: string,
  logs: WebhookLog[],
  _hours: number,
  granularity: string
): WebhookAnalytics {
  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - hours)

  const executions = logs.filter(
    log =>
      log.eventType === 'webhook_started' ||
      log.eventType === 'webhook_completed' ||
      log.eventType === 'webhook_failed'
  )

  const successful = executions.filter(
    log => log.eventType === 'webhook_completed'
  )
  const failed = executions.filter(log => log.eventType === 'webhook_failed')

  const durations = executions
    .filter(log => log.duration !== undefined)
    .map(log => log.duration)
    .toSorted((a, b) => a - b)

  const errors = logs.filter(log => log.error)
  const errorsByType = errors.reduce(
    (acc, log) => {
      acc[log.eventType] = (acc[log.eventType] || 0) + 1
      return acc
    },
    {} as Record<WebhookEventType, number>
  )

  // Calculate trending data based on granularity
  const trends = calculateTrends(logs, granularity, hours)

  return {
    workflowId,
    timeRange: {
      start: cutoff.toISOString(),
      end: new Date().toISOString(),
    },
    executions: {
      total: executions.length,
      successful: successful.length,
      failed: failed.length,
      average_duration:
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0,
      success_rate:
        executions.length > 0
          ? (successful.length / executions.length) * 100
          : 0,
    },
    performance: {
      fastest_execution: durations.length > 0 ? Math.min(...durations) : 0,
      slowest_execution: durations.length > 0 ? Math.max(...durations) : 0,
      average_response_time:
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0,
      p95_response_time:
        durations.length > 0
          ? durations[Math.floor(durations.length * 0.95)]
          : 0,
      p99_response_time:
        durations.length > 0
          ? durations[Math.floor(durations.length * 0.99)]
          : 0,
    },
    errors: {
      total: errors.length,
      by_type: errorsByType,
      common_errors: getCommonErrors(errors),
    },
    bandwidth: calculateBandwidthStats(logs),
    trends,
  }
}

function calculateTrends(
  logs: WebhookLog[],
  granularity: string,
  _hours: number
) {
  const trends: Record<
    string,
    {
      executions: number
      successful: number
      total_duration: number
      errors: number
    }
  > = {}

  // Determine time bucket format based on granularity
  const getTimeBucket = (timestamp: string) => {
    const date = new Date(timestamp)
    switch (granularity) {
      case 'day':
        return date.toISOString().slice(0, 10) + 'T00:00:00.000Z'
      case 'week': {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        return weekStart.toISOString().slice(0, 10) + 'T00:00:00.000Z'
      }
      case 'hour':
      default:
        return date.toISOString().slice(0, 13) + ':00:00.000Z'
    }
  }

  logs.forEach(log => {
    const bucket = getTimeBucket(log.timestamp)

    if (!trends[bucket]) {
      trends[bucket] = {
        executions: 0,
        successful: 0,
        total_duration: 0,
        errors: 0,
      }
    }

    if (
      log.eventType === 'webhook_completed' ||
      log.eventType === 'webhook_failed'
    ) {
      trends[bucket].executions++
      if (log.eventType === 'webhook_completed') {
        trends[bucket].successful++
      }
      if (log.duration) {
        trends[bucket].total_duration += log.duration
      }
    }

    if (log.error) {
      trends[bucket].errors++
    }
  })

  return Object.entries(trends)
    .map(([bucket, data]) => ({
      hour: bucket, // Keep "hour" for backward compatibility even if it's day/week
      executions: data.executions,
      success_rate:
        data.executions > 0 ? (data.successful / data.executions) * 100 : 0,
      average_duration:
        data.executions > 0 ? data.total_duration / data.executions : 0,
      error_count: data.errors,
    }))
    .toSorted((a, b) => a.hour.localeCompare(b.hour))
}

function getCommonErrors(errorLogs: WebhookLog[]) {
  const errorCounts: Record<string, { count: number; last_occurred: string }> =
    {}

  errorLogs.forEach(log => {
    if (log.error) {
      const message = log.error.message
      if (!errorCounts[message]) {
        errorCounts[message] = { count: 0, last_occurred: log.timestamp }
      }
      errorCounts[message].count++
      if (
        new Date(log.timestamp) > new Date(errorCounts[message].last_occurred)
      ) {
        errorCounts[message].last_occurred = log.timestamp
      }
    }
  })

  return Object.entries(errorCounts)
    .map(([message, data]) => ({ message, ...data }))
    .toSorted((a, b) => b.count - a.count)
    .slice(0, 10) // Top 10 errors
}

function calculateBandwidthStats(logs: WebhookLog[]) {
  const stats = {
    total_uploaded: 0,
    total_downloaded: 0,
    request_sizes: [] as number[],
    response_sizes: [] as number[],
  }

  logs.forEach(log => {
    if (log.metrics?.bandwidth) {
      stats.total_uploaded += log.metrics.bandwidth.uploaded
      stats.total_downloaded += log.metrics.bandwidth.downloaded
    }
    if (log.request?.size) {
      stats.request_sizes.push(log.request.size)
    }
    if (log.response?.size) {
      stats.response_sizes.push(log.response.size)
    }
  })

  return {
    total_uploaded: stats.total_uploaded,
    total_downloaded: stats.total_downloaded,
    average_request_size:
      stats.request_sizes.length > 0
        ? stats.request_sizes.reduce((a, b) => a + b, 0) /
          stats.request_sizes.length
        : 0,
    average_response_size:
      stats.response_sizes.length > 0
        ? stats.response_sizes.reduce((a, b) => a + b, 0) /
          stats.response_sizes.length
        : 0,
  }
}
