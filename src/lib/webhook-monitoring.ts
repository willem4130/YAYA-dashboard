// Webhook execution event types
export type WebhookEventType =
  | 'webhook_started'
  | 'webhook_completed'
  | 'webhook_failed'
  | 'mapping_applied'
  | 'validation_error'
  | 'connectivity_error'
  | 'timeout_error'

// Webhook execution log entry
export interface WebhookLogEntry {
  id: string
  workflowId: string
  configurationId: string
  eventType: WebhookEventType
  timestamp: string
  duration?: number // milliseconds

  // Request/Response data
  request?: {
    url: string
    method: string
    headers: Record<string, string>
    body: any
    size: number // bytes
  }

  response?: {
    status: number
    statusText: string
    headers: Record<string, string>
    body: any
    size: number // bytes
  }

  // Transformation data
  transformations?: {
    inputMapping: {
      original: any
      transformed: any
      mappingsApplied: number
      errors?: string[]
    }
    outputMapping?: {
      original: any
      transformed: any
      mappingsApplied: number
      errors?: string[]
    }
  }

  // Error information
  error?: {
    message: string
    code?: string
    stack?: string
    context?: Record<string, any>
  }

  // Performance metrics
  metrics: {
    requestTime: number
    responseTime?: number
    totalTime: number
    retryCount: number
    bandwidth: {
      uploaded: number // bytes
      downloaded: number // bytes
    }
  }

  // Additional metadata
  metadata: {
    userAgent?: string
    ip?: string
    sessionId?: string
    correlationId: string
    environment: 'development' | 'staging' | 'production'
  }
}

// Webhook performance analytics
export interface WebhookAnalytics {
  workflowId: string
  timeRange: {
    start: string
    end: string
  }

  // Execution statistics
  executions: {
    total: number
    successful: number
    failed: number
    average_duration: number
    success_rate: number
  }

  // Performance metrics
  performance: {
    fastest_execution: number
    slowest_execution: number
    average_response_time: number
    p95_response_time: number
    p99_response_time: number
  }

  // Error analysis
  errors: {
    total: number
    by_type: Record<WebhookEventType, number>
    common_errors: Array<{
      message: string
      count: number
      last_occurred: string
    }>
  }

  // Bandwidth usage
  bandwidth: {
    total_uploaded: number
    total_downloaded: number
    average_request_size: number
    average_response_size: number
  }

  // Trending data (hourly buckets)
  trends: Array<{
    hour: string
    executions: number
    success_rate: number
    average_duration: number
    error_count: number
  }>
}

// Real-time webhook monitor
export class WebhookMonitor {
  private logs: WebhookLogEntry[] = []
  private readonly maxLogEntries = 10000 // Keep last 10k entries in memory
  private readonly listeners: Array<(entry: WebhookLogEntry) => void> = []

  // Start monitoring a webhook execution
  startExecution(
    workflowId: string,
    configurationId: string,
    correlationId: string
  ): WebhookExecutionTracker {
    return new WebhookExecutionTracker(
      workflowId,
      configurationId,
      correlationId,
      this
    )
  }

  // Log a webhook event
  logEvent(entry: WebhookLogEntry): void {
    // Add to in-memory logs
    this.logs.push(entry)

    // Maintain max log size
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries)
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(entry)
      } catch (error) {
        console.error('Webhook monitor listener error:', error)
      }
    })

    // Persist to API in background
    this.persistLogEntry(entry).catch(error => {
      console.error('Failed to persist webhook log:', error)
    })
  }

  // Subscribe to real-time webhook events
  subscribe(listener: (entry: WebhookLogEntry) => void): () => void {
    this.listeners.push(listener)

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Get recent logs
  getRecentLogs(workflowId?: string, limit: number = 100): WebhookLogEntry[] {
    let filteredLogs = this.logs

    if (workflowId) {
      filteredLogs = this.logs.filter(log => log.workflowId === workflowId)
    }

    const sortedLogs = filteredLogs.toSorted(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    return sortedLogs.slice(0, limit)
  }

  // Calculate analytics for a workflow
  calculateAnalytics(workflowId: string, hours: number = 24): WebhookAnalytics {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - hours)

    const relevantLogs = this.logs.filter(
      log => log.workflowId === workflowId && new Date(log.timestamp) >= cutoff
    )

    const executions = relevantLogs.filter(
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

    const errors = relevantLogs.filter(log => log.error)
    const errorsByType = errors.reduce(
      (acc, log) => {
        acc[log.eventType] = (acc[log.eventType] || 0) + 1
        return acc
      },
      {} as Record<WebhookEventType, number>
    )

    // Calculate trending data
    const trends = this.calculateHourlyTrends(relevantLogs)

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
        common_errors: this.getCommonErrors(errors),
      },
      bandwidth: this.calculateBandwidthStats(relevantLogs),
      trends,
    }
  }

  // Calculate hourly trends
  private calculateHourlyTrends(
    logs: WebhookLogEntry[]
  ): WebhookAnalytics['trends'] {
    const trends: Record<
      string,
      {
        executions: number
        successful: number
        total_duration: number
        errors: number
      }
    > = {}

    logs.forEach(log => {
      const hour =
        new Date(log.timestamp).toISOString().slice(0, 13) + ':00:00.000Z'

      if (!trends[hour]) {
        trends[hour] = {
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
        trends[hour].executions++
        if (log.eventType === 'webhook_completed') {
          trends[hour].successful++
        }
        if (log.duration) {
          trends[hour].total_duration += log.duration
        }
      }

      if (log.error) {
        trends[hour].errors++
      }
    })

    return Object.entries(trends)
      .map(([hour, data]) => ({
        hour,
        executions: data.executions,
        success_rate:
          data.executions > 0 ? (data.successful / data.executions) * 100 : 0,
        average_duration:
          data.executions > 0 ? data.total_duration / data.executions : 0,
        error_count: data.errors,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour))
  }

  // Get most common error messages
  private getCommonErrors(errorLogs: WebhookLogEntry[]): Array<{
    message: string
    count: number
    last_occurred: string
  }> {
    const errorCounts: Record<
      string,
      { count: number; last_occurred: string }
    > = {}

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
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 errors
  }

  // Calculate bandwidth statistics
  private calculateBandwidthStats(
    logs: WebhookLogEntry[]
  ): WebhookAnalytics['bandwidth'] {
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

  // Persist log entry to API
  private async persistLogEntry(entry: WebhookLogEntry): Promise<void> {
    try {
      await fetch('/api/webhook-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
    } catch (error) {
      // Silently fail - we don't want monitoring to break the main flow
      console.debug('Failed to persist webhook log entry:', error)
    }
  }
}

// Webhook execution tracker for individual webhook calls
export class WebhookExecutionTracker {
  private readonly startTime: number
  private readonly correlationId: string

  constructor(
    private readonly workflowId: string,
    private readonly configurationId: string,
    correlationId: string,
    private readonly monitor: WebhookMonitor
  ) {
    this.startTime = Date.now()
    this.correlationId = correlationId

    // Log execution start
    this.logEvent('webhook_started', {
      metrics: {
        requestTime: this.startTime,
        totalTime: 0,
        retryCount: 0,
        bandwidth: { uploaded: 0, downloaded: 0 },
      },
    })
  }

  // Log successful completion
  logSuccess(request: any, response: any, transformations?: any): void {
    const duration = Date.now() - this.startTime

    this.logEvent('webhook_completed', {
      duration,
      request,
      response,
      transformations,
      metrics: {
        requestTime: this.startTime,
        responseTime: Date.now(),
        totalTime: duration,
        retryCount: 0,
        bandwidth: {
          uploaded: this.calculateSize(request),
          downloaded: this.calculateSize(response),
        },
      },
    })
  }

  // Log failure
  logFailure(error: Error, request?: any, response?: any): void {
    const duration = Date.now() - this.startTime

    this.logEvent('webhook_failed', {
      duration,
      request,
      response,
      error: {
        message: error.message,
        code: (error as any).code,
        stack: error.stack,
      },
      metrics: {
        requestTime: this.startTime,
        responseTime: Date.now(),
        totalTime: duration,
        retryCount: 0,
        bandwidth: {
          uploaded: request ? this.calculateSize(request) : 0,
          downloaded: response ? this.calculateSize(response) : 0,
        },
      },
    })
  }

  // Log mapping application
  logMapping(
    type: 'input' | 'output',
    original: any,
    transformed: any,
    errors?: string[]
  ): void {
    this.logEvent('mapping_applied', {
      transformations: {
        [type === 'input' ? 'inputMapping' : 'outputMapping']: {
          original,
          transformed,
          mappingsApplied: Object.keys(transformed || {}).length,
          errors,
        },
      },
      metrics: {
        requestTime: this.startTime,
        totalTime: Date.now() - this.startTime,
        retryCount: 0,
        bandwidth: { uploaded: 0, downloaded: 0 },
      },
    })
  }

  // Log validation error
  logValidationError(message: string, context?: Record<string, any>): void {
    this.logEvent('validation_error', {
      error: {
        message,
        context,
      },
      metrics: {
        requestTime: this.startTime,
        totalTime: Date.now() - this.startTime,
        retryCount: 0,
        bandwidth: { uploaded: 0, downloaded: 0 },
      },
    })
  }

  // Generic event logging
  private logEvent(
    eventType: WebhookEventType,
    data: Partial<WebhookLogEntry>
  ): void {
    const entry: WebhookLogEntry = {
      id: `${this.correlationId}-${Date.now()}`,
      workflowId: this.workflowId,
      configurationId: this.configurationId,
      eventType,
      timestamp: new Date().toISOString(),
      metadata: {
        correlationId: this.correlationId,
        environment: (process.env.NODE_ENV as any) || 'development',
      },
      metrics: {
        requestTime: this.startTime,
        totalTime: Date.now() - this.startTime,
        retryCount: 0,
        bandwidth: { uploaded: 0, downloaded: 0 },
      },
      ...data,
    }

    this.monitor.logEvent(entry)
  }

  // Calculate approximate size of data
  private calculateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size
    } catch {
      return 0
    }
  }
}

// Singleton webhook monitor instance
export const webhookMonitor = new WebhookMonitor()

// Export types and utilities
export type { WebhookLogEntry, WebhookAnalytics, WebhookEventType }
