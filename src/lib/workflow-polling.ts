interface WorkflowResult {
  id: string
  status: 'running' | 'completed' | 'failed'
  finished: boolean
  data?: any
  error?: any
  text?: string
}

interface PollOptions {
  maxAttempts?: number
  intervalMs?: number
  onProgress?: (attempt: number, result: WorkflowResult) => void
}

export class WorkflowPoller {
  async pollForResult(
    workflowId: string,
    executionId: string,
    options: PollOptions = {}
  ): Promise<WorkflowResult> {
    const {
      maxAttempts = 60, // 5 minutes with 5s intervals
      intervalMs = 5000,
      onProgress,
    } = options

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(
          `/api/workflows/${workflowId}/status?executionId=${executionId}`
        )

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`)
        }

        const { execution } = await response.json()

        onProgress?.(attempt, execution)

        // Return result if workflow is finished
        if (execution.finished) {
          return execution
        }

        // Wait before next attempt
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs))
        }
      } catch (error) {
        console.error(`Polling attempt ${attempt} failed:`, error)

        // On last attempt, throw the error
        if (attempt === maxAttempts) {
          throw new Error(
            `Failed to get workflow result after ${maxAttempts} attempts: ${error.message}`
          )
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, intervalMs))
      }
    }

    throw new Error(
      `Workflow did not complete within ${(maxAttempts * intervalMs) / 1000} seconds`
    )
  }
}

// Utility function for easy use
export async function getWorkflowResult(
  workflowId: string,
  executionId: string,
  options?: PollOptions
): Promise<string> {
  const poller = new WorkflowPoller()
  const result = await poller.pollForResult(workflowId, executionId, options)

  if (result.error) {
    throw new Error(`Workflow failed: ${JSON.stringify(result.error)}`)
  }

  // Return the text result (as mentioned in your case)
  return result.text || result.data?.text || JSON.stringify(result.data)
}
