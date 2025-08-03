import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const workflowId = params.id

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Set up SSE headers
      const encoder = new TextEncoder()
      
      const sendEvent = (event: string, data: any) => {
        const formattedData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(formattedData))
      }

      // Send initial connection event
      sendEvent('connected', { 
        workflowId, 
        timestamp: new Date().toISOString() 
      })

      // Set up workflow status monitoring
      const statusInterval = setInterval(async () => {
        try {
          const status = await checkWorkflowStatus(workflowId)
          if (status.hasUpdates) {
            sendEvent('workflow_update', status.update)
          }
        } catch (error) {
          console.error('Error checking workflow status:', error)
          sendEvent('error', { message: 'Failed to check workflow status' })
        }
      }, 2000) // Check every 2 seconds

      // Set up execution monitoring
      const executionInterval = setInterval(async () => {
        try {
          const executions = await checkActiveExecutions(workflowId)
          for (const execution of executions) {
            if (execution.hasNewOutputs) {
              sendEvent('new_output', {
                executionId: execution.id,
                outputs: execution.newOutputs,
                timestamp: new Date().toISOString()
              })
            }
            
            if (execution.statusChanged) {
              sendEvent('execution_status', {
                executionId: execution.id,
                status: execution.status,
                progress: execution.progress,
                timestamp: new Date().toISOString()
              })
            }
          }
        } catch (error) {
          console.error('Error checking executions:', error)
        }
      }, 1000) // Check every 1 second for executions

      // Set up chat message monitoring
      const chatInterval = setInterval(async () => {
        try {
          const newMessages = await checkNewChatMessages(workflowId)
          for (const message of newMessages) {
            sendEvent('new_message', {
              messageId: message.id,
              type: message.type,
              content: message.content,
              timestamp: message.timestamp
            })
          }
        } catch (error) {
          console.error('Error checking chat messages:', error)
        }
      }, 1000)

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(statusInterval)
        clearInterval(executionInterval)
        clearInterval(chatInterval)
        controller.close()
      })

      // Keep connection alive with heartbeat
      const heartbeatInterval = setInterval(() => {
        sendEvent('heartbeat', { timestamp: new Date().toISOString() })
      }, 30000) // Every 30 seconds

      // Clean up heartbeat on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

interface WorkflowStatusCheck {
  hasUpdates: boolean
  update?: {
    type: 'status_change' | 'configuration_update' | 'error'
    status?: string
    message?: string
    details?: any
  }
}

interface ExecutionCheck {
  id: string
  status: 'running' | 'completed' | 'failed'
  progress?: number
  hasNewOutputs: boolean
  newOutputs: any[]
  statusChanged: boolean
}

interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  workflowId: string
}

async function checkWorkflowStatus(workflowId: string): Promise<WorkflowStatusCheck> {
  // In a real implementation, this would check for workflow status changes
  // For now, return mock data with occasional updates
  const shouldUpdate = Math.random() < 0.1 // 10% chance of update
  
  if (shouldUpdate) {
    const updateTypes = ['status_change', 'configuration_update'] as const
    const updateType = updateTypes[Math.floor(Math.random() * updateTypes.length)]
    
    return {
      hasUpdates: true,
      update: {
        type: updateType,
        status: updateType === 'status_change' ? 'updated' : undefined,
        message: updateType === 'status_change' 
          ? 'Workflow configuration updated'
          : 'New version available',
        details: { workflowId, timestamp: new Date() }
      }
    }
  }
  
  return { hasUpdates: false }
}

async function checkActiveExecutions(workflowId: string): Promise<ExecutionCheck[]> {
  // In a real implementation, this would check the execution database
  // and compare with last known state to detect changes
  
  // Mock active executions
  const activeExecutions = await getActiveExecutions(workflowId)
  const results: ExecutionCheck[] = []
  
  for (const execution of activeExecutions) {
    const lastKnownState = await getLastKnownExecutionState(execution.id)
    
    const statusChanged = lastKnownState?.status !== execution.status
    const newOutputs = execution.outputs.filter(output => 
      !lastKnownState?.outputs.some(lastOutput => lastOutput.id === output.id)
    )
    
    if (statusChanged || newOutputs.length > 0) {
      results.push({
        id: execution.id,
        status: execution.status,
        progress: execution.progress,
        hasNewOutputs: newOutputs.length > 0,
        newOutputs,
        statusChanged
      })
      
      // Update last known state
      await updateLastKnownExecutionState(execution.id, {
        status: execution.status,
        outputs: execution.outputs,
        progress: execution.progress
      })
    }
  }
  
  return results
}

async function checkNewChatMessages(workflowId: string): Promise<ChatMessage[]> {
  // In a real implementation, this would check for new chat messages
  // since the last check timestamp
  
  const lastCheckTime = await getLastChatCheckTime(workflowId)
  const newMessages = await getChatMessagesSince(workflowId, lastCheckTime)
  
  if (newMessages.length > 0) {
    await updateLastChatCheckTime(workflowId, new Date())
  }
  
  return newMessages
}

// Mock helper functions - in real implementation these would interact with your database

async function getActiveExecutions(workflowId: string) {
  // Mock data - in real implementation, query database for active executions
  return [
    {
      id: 'exec-123',
      status: 'running' as const,
      progress: 75,
      outputs: [
        { id: 'out-1', type: 'image', url: '/mock-1.jpg' }
      ]
    }
  ]
}

async function getLastKnownExecutionState(executionId: string) {
  // Mock - in real implementation, get from cache or database
  return {
    status: 'running' as const,
    outputs: [],
    progress: 50
  }
}

async function updateLastKnownExecutionState(executionId: string, state: any) {
  // Mock - in real implementation, update cache or database
  console.log('Updating execution state:', executionId, state)
}

async function getLastChatCheckTime(workflowId: string): Promise<Date> {
  // Mock - in real implementation, get from cache or database
  return new Date(Date.now() - 5000) // 5 seconds ago
}

async function getChatMessagesSince(workflowId: string, since: Date): Promise<ChatMessage[]> {
  // Mock - in real implementation, query database for new messages
  return []
}

async function updateLastChatCheckTime(workflowId: string, time: Date) {
  // Mock - in real implementation, update cache or database
  console.log('Updating last chat check time:', workflowId, time)
}