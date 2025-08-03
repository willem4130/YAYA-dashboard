'use client'

import { WebhookDebugger } from '@/components/ui/webhook-debugger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Zap, Code, Settings } from 'lucide-react'
import Link from 'next/link'

export default function DebugPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl yaya-heading tracking-tight">
                  n8n Debug Console
                </h1>
                <p className="text-muted-foreground mt-1 yaya-body">
                  Test webhooks and view real n8n responses
                </p>
              </div>
            </div>
            <Badge variant="secondary">
              <Code className="w-3 h-3 mr-1" />
              Development Mode
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Main Debugger */}
          <div className="xl:col-span-2">
            <WebhookDebugger />
          </div>

          {/* Instructions Sidebar */}
          <div className="space-y-6">
            
            {/* n8n Setup Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 yaya-heading">
                  <Settings className="w-4 h-4" />
                  n8n Setup Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm yaya-body">
                
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">1. Webhook Trigger</h4>
                  <ul className="text-muted-foreground space-y-1 ml-4">
                    <li>• Method: <code className="bg-muted px-1 rounded">POST</code></li>
                    <li>• Response Mode: <code className="bg-muted px-1 rounded text-xs">Using 'Respond to Webhook' Node</code></li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">2. AI Agent Node</h4>
                  <div className="bg-muted/50 p-2 rounded text-xs font-mono">
                    <div>Prompt: You are YAYA Creative Assistant</div>
                    <div>Input: {`{{ $json.message }}`}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">3. Respond to Webhook</h4>
                  <div className="bg-muted/50 p-2 rounded text-xs font-mono whitespace-pre-wrap">
{`{
  "executionId": "{{ $execution.id }}",
  "status": "completed",
  "result": "{{ $json.output }}",
  "timestamp": "{{ $now }}",
  "workflowId": "{{ $('Webhook').item.json.workflowId }}"
}`}
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Expected Response */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 yaya-heading">
                  <Zap className="w-4 h-4" />
                  Expected Response
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm yaya-body">
                <p className="text-muted-foreground mb-3">
                  If configured correctly, you should see:
                </p>
                <div className="bg-green-50 border border-green-200 rounded p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Status: 200 Success</span>
                  </div>
                  <div className="text-xs text-muted-foreground ml-4">
                    • executionId: (UUID from n8n)
                    <br />
                    • result: "AI Agent response text"
                    <br />
                    • status: "completed"
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Troubleshooting */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg yaya-heading">
                  Common Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm yaya-body space-y-3">
                
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <div className="font-medium text-yellow-800 mb-1">
                    Empty or "Workflow got started" Response
                  </div>
                  <div className="text-yellow-700 text-xs">
                    Fix: Set Response Mode to "Using 'Respond to Webhook' Node"
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <div className="font-medium text-red-800 mb-1">
                    Connection Timeout
                  </div>
                  <div className="text-red-700 text-xs">
                    Fix: Check webhook URL and ensure n8n workflow is active
                  </div>
                </div>

              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </main>
  )
}