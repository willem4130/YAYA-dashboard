'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useWorkflowResult } from '@/hooks/use-workflow-result'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Copy, 
  Download,
  Loader2,
  X
} from 'lucide-react'

interface WorkflowResultDisplayProps {
  workflowId: string
  executionId: string
  workflowTitle: string
  isOpen: boolean
  onClose: () => void
}

export function WorkflowResultDisplay({
  workflowId,
  executionId,
  workflowTitle,
  isOpen,
  onClose
}: WorkflowResultDisplayProps) {
  const [copied, setCopied] = useState(false)

  const { result, isLoading, error, attempt } = useWorkflowResult(
    workflowId,
    executionId,
    {
      enabled: isOpen,
      onSuccess: (result) => {
        console.log('✅ Workflow completed:', result)
      },
      onError: (error) => {
        console.error('❌ Workflow failed:', error)
      },
      onProgress: (attempt) => {
        console.log(`🔄 Checking status... attempt ${attempt}`)
      }
    }
  )

  const handleCopyResult = async () => {
    if (result) {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadResult = () => {
    if (result) {
      const blob = new Blob([result], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${workflowTitle}-result-${new Date().toISOString().split('T')[0]}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="yaya-heading text-xl">
              {workflowTitle} - Result
            </CardTitle>
            <p className="text-sm text-muted-foreground yaya-body mt-1">
              Execution ID: <code className="bg-muted px-1 rounded text-xs">{executionId}</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && (
              <Badge variant="secondary">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Checking... (attempt {attempt})
              </Badge>
            )}
            {result && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
            {error && (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                Failed
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="overflow-auto max-h-[70vh] p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <h3 className="text-lg font-medium yaya-heading mb-2">
                Processing your request...
              </h3>
              <p className="text-muted-foreground yaya-body text-center">
                n8n workflow is running. This may take a few moments.
                <br />
                <small>Attempt {attempt} - Checking every 5 seconds</small>
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-8 h-8 text-destructive mb-4" />
              <h3 className="text-lg font-medium yaya-heading mb-2 text-destructive">
                Workflow Failed
              </h3>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-2xl">
                <p className="text-sm text-destructive yaya-body">
                  {error.message}
                </p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium yaya-heading">
                  Workflow Output
                </h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCopyResult}
                    disabled={copied}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadResult}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 border rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm yaya-body leading-relaxed">
                  {result}
                </pre>
              </div>

              <div className="text-xs text-muted-foreground yaya-body">
                <p>✅ Completed at {new Date().toLocaleTimeString()}</p>
                <p>📊 Result length: {result.length} characters</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}