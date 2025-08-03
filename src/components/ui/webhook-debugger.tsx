'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  Send, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Copy,
  RefreshCw,
  Zap
} from 'lucide-react'

interface WebhookResponse {
  success: boolean
  status: number
  response: any
  timestamp: string
  debug?: any
}

export function WebhookDebugger() {
  const [webhookUrl, setWebhookUrl] = useState('https://willem4130.app.n8n.cloud/webhook-test/ee7f2e9-9c2f-4c31-8faf-76c0b3f749e')
  const [message, setMessage] = useState('Test message from YAYA dashboard - please respond with creative fashion advice!')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<WebhookResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testWebhook = async () => {
    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const payload = {
        workflowId: 'yaya-creative-assistant',
        message: message,
        context: 'dashboard-test',
        timestamp: new Date().toISOString(),
        yayaTest: {
          source: 'yaya-dashboard-debugger',
          userAgent: navigator.userAgent,
          testId: `test_${Date.now()}`
        }
      }

      console.log('🧪 Testing webhook with payload:', payload)

      const response = await fetch('/api/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl,
          payload
        }),
      })

      const result = await response.json()
      console.log('📡 Webhook response:', result)

      setResponse({
        success: result.success,
        status: result.status,
        response: result.response,
        timestamp: result.debug?.timestamp || new Date().toISOString(),
        debug: result.debug
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ Webhook test failed:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const copyResponse = async () => {
    if (response) {
      await navigator.clipboard.writeText(JSON.stringify(response, null, 2))
    }
  }

  const formatResponseValue = (value: any): string => {
    if (typeof value === 'string') return value
    return JSON.stringify(value, null, 2)
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 yaya-heading">
          <Zap className="w-5 h-5 text-primary" />
          n8n Webhook Debugger
        </CardTitle>
        <p className="text-sm text-muted-foreground yaya-body">
          Test your n8n webhook and see real responses
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Webhook URL */}
        <div className="space-y-2">
          <Label htmlFor="webhook-url" className="yaya-subheading">
            Webhook URL
          </Label>
          <Input
            id="webhook-url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-n8n-instance.com/webhook/your-endpoint"
            className="font-mono text-sm"
          />
        </div>

        {/* Test Message */}
        <div className="space-y-2">
          <Label htmlFor="test-message" className="yaya-subheading">
            Test Message
          </Label>
          <Textarea
            id="test-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your test message..."
            rows={3}
            className="yaya-body"
          />
        </div>

        {/* Test Button */}
        <Button 
          onClick={testWebhook} 
          disabled={isLoading || !webhookUrl}
          className="w-full yaya-button"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing Webhook...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Test n8n Webhook
            </>
          )}
        </Button>

        {/* Results */}
        {(response || error) && (
          <>
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium yaya-heading">Response</h3>
                <div className="flex items-center gap-2">
                  {response?.success ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Success
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                  {response && (
                    <Button variant="outline" size="sm" onClick={copyResponse}>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm text-destructive yaya-body">
                    ❌ Error: {error}
                  </p>
                </div>
              )}

              {response && (
                <div className="space-y-4">
                  {/* Status Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status Code:</span>
                      <span className="ml-2 font-mono">{response.status}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timestamp:</span>
                      <span className="ml-2 font-mono text-xs">
                        {new Date(response.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* n8n Response */}
                  <div className="space-y-2">
                    <Label className="yaya-subheading">n8n Workflow Response</Label>
                    <div className="bg-muted/50 border rounded-lg p-4 max-h-96 overflow-auto">
                      <pre className="text-sm yaya-body whitespace-pre-wrap">
                        {formatResponseValue(response.response)}
                      </pre>
                    </div>
                  </div>

                  {/* Debug Info */}
                  {response.debug && (
                    <div className="space-y-2">
                      <Label className="yaya-subheading">Debug Information</Label>
                      <div className="bg-muted/30 border rounded-lg p-3 text-xs">
                        <div className="grid grid-cols-2 gap-2 font-mono">
                          <span>URL: {response.debug.url}</span>
                          <span>Method: {response.debug.method}</span>
                          <span>Response Size: {response.debug.responseSize} bytes</span>
                          <span>Duration: ~2-5s</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}