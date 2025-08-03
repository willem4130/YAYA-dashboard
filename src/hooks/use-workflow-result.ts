import { useState, useEffect } from 'react'
import { getWorkflowResult } from '@/lib/workflow-polling'

interface UseWorkflowResultOptions {
  enabled?: boolean
  onSuccess?: (result: string) => void
  onError?: (error: Error) => void
  onProgress?: (attempt: number) => void
}

export function useWorkflowResult(
  workflowId: string | null,
  executionId: string | null,
  options: UseWorkflowResultOptions = {}
) {
  const [result, setResult] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!workflowId || !executionId || !options.enabled) {
      return
    }

    let isCancelled = false

    const fetchResult = async () => {
      setIsLoading(true)
      setError(null)
      setResult(null)
      setAttempt(0)

      try {
        const workflowResult = await getWorkflowResult(
          workflowId,
          executionId,
          {
            onProgress: attemptNum => {
              if (!isCancelled) {
                setAttempt(attemptNum)
                options.onProgress?.(attemptNum)
              }
            },
          }
        )

        if (!isCancelled) {
          setResult(workflowResult)
          options.onSuccess?.(workflowResult)
        }
      } catch (err) {
        if (!isCancelled) {
          const error = err instanceof Error ? err : new Error(String(err))
          setError(error)
          options.onError?.(error)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchResult()

    return () => {
      isCancelled = true
    }
  }, [workflowId, executionId, options.enabled])

  return {
    result,
    isLoading,
    error,
    attempt,
  }
}
