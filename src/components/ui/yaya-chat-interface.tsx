'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from './button'
import { Input } from './input'
import { Card } from './card'
import { Badge } from './badge'
import { X, Send, MessageCircle, Sparkles, Loader2 } from 'lucide-react'

interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
  context?: string
}

interface YayaChatInterfaceProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function YayaChatInterface({
  isOpen,
  onClose,
  className = '',
}: YayaChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content:
        "Hello! I'm your YAYA Creative Assistant. I can help with styling advice, brand storytelling, and creative direction. What would you like to explore today?",
      sender: 'assistant',
      timestamp: new Date(),
      context: 'general-chat',
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId] = useState(
    () => `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  )
  const [selectedContext, setSelectedContext] = useState<string>('general-chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const contextOptions = [
    { value: 'styling-advice', label: 'Styling Advice', icon: '👗' },
    { value: 'brand-storytelling', label: 'Brand Stories', icon: '📖' },
    { value: 'creative-direction', label: 'Creative Direction', icon: '🎨' },
    { value: 'general-chat', label: 'General Chat', icon: '💬' },
  ]

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      context: selectedContext,
    }

    setMessages(prev => [...prev, userMessage])
    const messageToSend = inputMessage
    setInputMessage('')
    setIsLoading(true)

    try {
      // Get workflow configuration from localStorage with fallback to defaults
      const savedConfig = localStorage.getItem(
        'yaya-workflow-yaya-creative-assistant'
      )
      let config = {
        // Default Railway production configuration for stability
        n8nWebhookUrl: 'https://primary-production-c041f.up.railway.app/webhook/ee7ff2e9-9c2f-4c31-81af-76cbb3f74a9e',
        timeout: 30000,
        retries: 2,
        enableLogging: true,
        userContext: {
          department: 'creative',
          role: 'stylist',
        },
        environment: 'production',
      }
      
      if (savedConfig) {
        try {
          const parsedConfig = JSON.parse(savedConfig)
          // Merge saved config with defaults, preferring saved values
          config = { ...config, ...parsedConfig }
        } catch (error) {
          console.error('Failed to parse saved config, using defaults:', error)
        }
      }

      // Call YAYA Creative Assistant webhook using config URL
      const response = await fetch(config.n8nWebhookUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageToSend,
            context: selectedContext,
            conversationId,
            userContext: {
              userId: 'current-user',
              department: config.userContext?.department || 'creative',
              role: config.userContext?.role || 'stylist',
            },
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to get response: ${response.status}`)
      }

      const result = await response.json()

      // Handle direct response from Railway webhook
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        content:
          result.result ||
          result.message ||
          'I received your message, but there was an issue processing it.',
        sender: 'assistant',
        timestamp: new Date(),
        context: selectedContext,
      }

      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    } catch (error) {
      console.error('Failed to send message:', error)

      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        content:
          "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'assistant',
        timestamp: new Date(),
        context: selectedContext,
      }

      setMessages(prev => [...prev, errorMessage])
      setIsLoading(false)
    }
  }

  const pollForResponse = async (
    executionId: string,
    originalMessage: string
  ) => {
    const maxAttempts = 30 // 30 attempts = ~30 seconds max wait
    let attempts = 0

    const poll = async (): Promise<void> => {
      attempts++

      try {
        const statusResponse = await fetch(
          `/api/workflows/yaya-creative-assistant/status/${executionId}`
        )

        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.status}`)
        }

        const status = await statusResponse.json()

        if (
          status.status === 'completed' &&
          status.outputs &&
          status.outputs.length > 0
        ) {
          // Workflow completed successfully
          const output = status.outputs[0]
          const assistantMessage: ChatMessage = {
            id: `msg_${Date.now()}_assistant`,
            content:
              output.content ||
              output.filename ||
              'Workflow completed successfully',
            sender: 'assistant',
            timestamp: new Date(),
            context: selectedContext,
          }

          setMessages(prev => [...prev, assistantMessage])
          setIsLoading(false)
          return
        }

        if (status.status === 'failed' || status.error) {
          // Workflow failed, show error
          throw new Error(status.error || 'Workflow execution failed')
        }

        if (status.status === 'running' && attempts < maxAttempts) {
          // Still running, continue polling
          setTimeout(poll, 1000)
          return
        }

        if (attempts >= maxAttempts) {
          // Timeout, fallback to mock response
          console.warn('Workflow polling timeout, using fallback response')
          const assistantMessage: ChatMessage = {
            id: `msg_${Date.now()}_assistant`,
            content: generateMockResponse(originalMessage, selectedContext),
            sender: 'assistant',
            timestamp: new Date(),
            context: selectedContext,
          }

          setMessages(prev => [...prev, assistantMessage])
          setIsLoading(false)
          return
        }
      } catch (error) {
        console.error('Status polling error:', error)

        if (attempts >= maxAttempts) {
          // Give up and use mock response
          const assistantMessage: ChatMessage = {
            id: `msg_${Date.now()}_assistant`,
            content: generateMockResponse(originalMessage, selectedContext),
            sender: 'assistant',
            timestamp: new Date(),
            context: selectedContext,
          }

          setMessages(prev => [...prev, assistantMessage])
          setIsLoading(false)
          return
        }

        // Continue polling on error
        setTimeout(poll, 1000)
      }
    }

    // Start polling
    setTimeout(poll, 1000) // Wait 1 second before first poll
  }

  const generateMockResponse = (userInput: string, context: string): string => {
    const responses = {
      'styling-advice': [
        `For a sophisticated YAYA look, I'd recommend focusing on our signature earth tones and natural textures. Consider pairing our organic cotton pieces with artisan accessories for that effortless elegance.`,
        `The beauty of YAYA styling lies in timeless pieces that transcend seasons. Think flowing silhouettes in neutral palettes that speak to conscious craftsmanship.`,
        `Let's explore layering with our sustainable fabrics - perhaps a lightweight blazer over a flowing dress, finished with our handcrafted jewelry.`,
      ],
      'brand-storytelling': [
        `YAYA's story is one of conscious craftsmanship meeting modern sophistication. Each piece tells a narrative of sustainable luxury and timeless design.`,
        `Our brand voice should always reflect the gentle confidence of the modern woman who values both style and substance. Think 'refined yet approachable'.`,
        `When crafting YAYA narratives, remember we're not just selling clothes - we're sharing a philosophy of mindful living and authentic self-expression.`,
      ],
      'creative-direction': [
        `For YAYA's creative direction, always start with our core values: sustainability, craftsmanship, and timeless elegance. Let these guide every creative decision.`,
        `Consider the seasonal context - spring calls for flowing fabrics and organic textures, while winter embraces cozy sophistication and artisan details.`,
        `Our creative approach should balance commercial appeal with artistic integrity, always maintaining that distinctive YAYA aesthetic.`,
      ],
      'general-chat': [
        `I'm here to help with all things YAYA! Whether you need styling inspiration, brand guidance, or creative direction, let's explore together.`,
        `What aspect of YAYA's world interests you most today? I can assist with collection insights, brand storytelling, or seasonal styling advice.`,
        `YAYA represents more than fashion - it's a lifestyle of conscious choices and refined taste. How can I help you embody that today?`,
      ],
    }

    const contextResponses = responses[context] || responses['general-chat']
    return contextResponses[Math.floor(Math.random() * contextResponses.length)]
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${className}`}
    >
      <Card className="w-full max-w-2xl h-[600px] flex flex-col yaya-card bg-background border-2">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b yaya-linen-texture">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center shadow-sm">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="yaya-heading text-lg font-medium">
                YAYA Creative Assistant
              </h3>
              <p className="text-sm text-muted-foreground yaya-body">
                Intelligent styling and brand guidance
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-8 h-8 p-0 rounded-sm hover:bg-muted"
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Close chat</span>
          </Button>
        </div>

        {/* Context Selector */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex flex-wrap gap-2">
            {contextOptions.map(option => (
              <Button
                key={option.value}
                variant={
                  selectedContext === option.value ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => setSelectedContext(option.value)}
                className={`
                  yaya-button text-xs
                  ${
                    selectedContext === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  }
                `}
              >
                <span className="mr-1">{option.icon}</span>
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[80%] rounded-lg p-3 yaya-body text-sm
                  ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground ml-4'
                      : 'bg-muted mr-4'
                  }
                `}
              >
                {message.sender === 'assistant' && message.context && (
                  <Badge
                    variant="secondary"
                    className="mb-2 text-xs yaya-subheading"
                  >
                    {contextOptions.find(opt => opt.value === message.context)
                      ?.label || message.context}
                  </Badge>
                )}
                <p className="leading-relaxed">{message.content}</p>
                <div
                  className={`
                  text-xs mt-2 opacity-70
                  ${message.sender === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'}
                `}
                >
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3 mr-4 flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm yaya-body text-muted-foreground">
                  YAYA is crafting your response...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Input
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about styling, branding, or creative direction..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="yaya-button bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="sr-only">Send message</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 yaya-body">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  )
}
