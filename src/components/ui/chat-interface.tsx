'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  Paperclip, 
  X, 
  Bot, 
  User, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  attachments?: ChatAttachment[]
  workflowUpdate?: WorkflowUpdate
}

interface ChatAttachment {
  id: string
  type: 'image' | 'file' | 'url'
  name: string
  url: string
  size?: number
}

interface WorkflowUpdate {
  type: 'status' | 'output' | 'error'
  status?: 'running' | 'completed' | 'failed'
  outputId?: string
  outputType?: 'image' | 'video' | 'text' | 'file'
  outputUrl?: string
  outputFilename?: string
  errorMessage?: string
}

interface ChatInterfaceProps {
  workflowId: string
  workflowTitle: string
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function ChatInterface({ 
  workflowId, 
  workflowTitle, 
  isOpen, 
  onClose, 
  className 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'assistant',
      content: `Hello! I'm here to help you with the "${workflowTitle}" workflow. You can ask me questions, provide additional context, or request modifications to the outputs.`,
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      // Start listening for workflow updates
      const eventSource = new EventSource(`/api/workflows/${workflowId}/chat/stream`)
      
      eventSource.onmessage = (event) => {
        const update = JSON.parse(event.data)
        handleWorkflowUpdate(update)
      }

      return () => {
        eventSource.close()
      }
    }
  }, [isOpen, workflowId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachments.length === 0) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      attachments: attachments.map(file => ({
        id: `att-${Date.now()}-${Math.random()}`,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        url: URL.createObjectURL(file),
        size: file.size
      }))
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setAttachments([])
    setIsLoading(true)

    try {
      // Send message to chat API
      const formData = new FormData()
      formData.append('message', inputValue)
      formData.append('workflowId', workflowId)
      
      attachments.forEach((file, index) => {
        formData.append(`attachment-${index}`, file)
      })

      const response = await fetch(`/api/workflows/${workflowId}/chat`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const result = await response.json()
      
      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: result.response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      // If the message triggered a workflow execution, add system message
      if (result.executionTriggered) {
        const systemMessage: ChatMessage = {
          id: `system-${Date.now()}`,
          type: 'system',
          content: 'Workflow execution started based on your request.',
          timestamp: new Date(),
          workflowUpdate: {
            type: 'status',
            status: 'running'
          }
        }
        setMessages(prev => [...prev, systemMessage])
      }

    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: 'Sorry, there was an error processing your message. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleWorkflowUpdate = (update: any) => {
    const systemMessage: ChatMessage = {
      id: `update-${Date.now()}`,
      type: 'system',
      content: getUpdateMessage(update),
      timestamp: new Date(),
      workflowUpdate: update
    }
    setMessages(prev => [...prev, systemMessage])
  }

  const getUpdateMessage = (update: WorkflowUpdate): string => {
    switch (update.type) {
      case 'status':
        switch (update.status) {
          case 'running': return 'Workflow is processing your request...'
          case 'completed': return 'Workflow completed successfully!'
          case 'failed': return `Workflow failed: ${update.errorMessage}`
          default: return 'Workflow status updated'
        }
      case 'output':
        return `New ${update.outputType} output generated: ${update.outputFilename}`
      case 'error':
        return `Error: ${update.errorMessage}`
      default:
        return 'Workflow updated'
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <div className={cn(
      'fixed inset-y-0 right-0 w-96 bg-background border-l shadow-lg z-50 flex flex-col',
      className
    )}>
      {/* Header */}
      <CardHeader className="border-b bg-card">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Bot className="w-5 h-5 text-accent" />
            {workflowTitle}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3',
              message.type === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.type !== 'user' && (
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                message.type === 'assistant' ? 'bg-accent text-accent-foreground' : 'bg-muted'
              )}>
                {message.type === 'assistant' ? (
                  <Bot className="w-4 h-4" />
                ) : message.workflowUpdate ? (
                  message.workflowUpdate.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  ) : message.workflowUpdate.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
            )}

            <div className={cn(
              'flex flex-col space-y-2 max-w-[280px]',
              message.type === 'user' ? 'items-end' : 'items-start'
            )}>
              <div className={cn(
                'rounded-lg px-3 py-2 text-sm',
                message.type === 'user' 
                  ? 'bg-primary text-primary-foreground'
                  : message.type === 'assistant'
                  ? 'bg-muted'
                  : 'bg-accent/10 text-accent-foreground border border-accent/20'
              )}>
                {message.content}
              </div>

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="space-y-1">
                  {message.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-2 text-xs bg-muted rounded px-2 py-1"
                    >
                      <Paperclip className="w-3 h-3" />
                      <span className="truncate">{attachment.name}</span>
                      {attachment.size && (
                        <span className="text-muted-foreground">
                          ({(attachment.size / 1024).toFixed(1)}KB)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Workflow Output */}
              {message.workflowUpdate?.type === 'output' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-800">
                    <CheckCircle className="w-4 h-4" />
                    Output Generated
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {message.workflowUpdate.outputFilename}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline">
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>

            {message.type === 'user' && (
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input Area */}
      <div className="border-t p-4 bg-card">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="mb-3 space-y-1">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-xs bg-muted rounded px-2 py-1"
              >
                <Paperclip className="w-3 h-3" />
                <span className="flex-1 truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(index)}
                  className="h-4 w-4 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about this workflow..."
            disabled={isLoading}
            className="flex-1"
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || (!inputValue.trim() && attachments.length === 0)}
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.txt,.json"
        />
      </div>
    </div>
  )
}