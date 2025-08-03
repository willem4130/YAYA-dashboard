'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { WorkflowCard, type WorkflowOutput } from '@/components/ui/workflow-card'
import { ChatInterface } from '@/components/ui/chat-interface'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  Search, 
  Filter,
  BarChart3,
  Users,
  Sparkles,
  Brain,
  Target
} from 'lucide-react'

// Test inputs for YAYA workflows
const getTestInputsForWorkflow = (workflowId: string) => {
  const testInputs = {
    'spring-collection-storytelling': {
      collectionTheme: 'Natural Elegance',
      targetSeason: 'Spring 2024',
      keyPieces: ['flowing dresses', 'lightweight blazers', 'artisan accessories'],
      brandVoice: 'sophisticated',
      targetAudience: 'conscious-consumers'
    },
    'sustainable-materials-tracker': {
      reportPeriod: 'Q1-2024',
      materialCategories: ['organic cotton', 'recycled wool', 'hemp blends'],
      certificationLevel: 'GOTS'
    },
    'client-style-profiles': {
      analysisType: 'style-preferences',
      timeframe: 'last-quarter',
      customerSegment: 'vip-customers'
    },
    'boutique-visual-merchandising': {
      boutiqueLocation: 'Amsterdam-Centrum',
      displayType: 'window-display',
      currentCollection: 'Spring-Essentials',
      budgetRange: 'standard'
    },
    'seasonal-campaign-coordinator': {
      campaignSeason: 'Spring-2024',
      channels: ['digital', 'retail', 'editorial'],
      campaignObjective: 'collection-launch',
      budgetAllocation: 'enhanced'
    }
  }
  
  return testInputs[workflowId] || {}
}

// YAYA Atelier Workflows - Authentic brand processes
const yayaWorkflows = [
  {
    id: 'spring-collection-storytelling',
    title: 'Spring Collection Storytelling',
    description: 'Create cohesive brand narratives for new seasonal pieces, maintaining YAYA\'s sophisticated yet approachable voice across all touchpoints',
    status: 'completed' as const,
    category: 'collections' as const,
    hasChat: true,
    expectsFiles: true,
    lastRun: new Date('2024-01-15'),
    outputs: [
      {
        id: 'spring-narrative-1',
        type: 'text' as const,
        content: 'Embrace the gentle awakening of spring with YAYA\'s new collection...',
        timestamp: new Date()
      },
      {
        id: 'spring-visual-1',
        type: 'image' as const,
        filename: 'spring-2024-campaign-hero.jpg',
        url: '/mock-image',
        timestamp: new Date()
      }
    ] as WorkflowOutput[]
  },
  {
    id: 'sustainable-materials-tracker',
    title: 'Sustainable Materials Tracker',
    description: 'Monitor and report on eco-friendly fabric sourcing aligned with YAYA\'s commitment to conscious fashion and environmental responsibility',
    status: 'running' as const,
    category: 'sustainability' as const,
    hasChat: true,
    expectsFiles: false,
    lastRun: new Date('2024-01-16'),
    outputs: [
      {
        id: 'sustainability-report-q1',
        type: 'file' as const,
        filename: 'yaya-sustainability-report-q1-2024.pdf',
        url: '/mock-report',
        timestamp: new Date()
      }
    ]
  },
  {
    id: 'client-style-profiles',
    title: 'Client Style Profile Analysis',
    description: 'Understand customer preferences to enhance personal styling recommendations and guide future collection development with data-driven insights',
    status: 'completed' as const,
    category: 'client-insights' as const,
    hasChat: true,
    expectsFiles: false,
    lastRun: new Date('2024-01-14'),
    outputs: [
      {
        id: 'style-insights-1',
        type: 'text' as const,
        content: 'Client preferences trend toward timeless, versatile pieces in neutral tones...',
        timestamp: new Date()
      }
    ]
  },
  {
    id: 'boutique-visual-merchandising',
    title: 'Boutique Visual Merchandising',
    description: 'Generate seasonal window displays and in-store styling concepts that reflect YAYA\'s refined aesthetic across all retail locations',
    status: 'idle' as const,
    category: 'retail-operations' as const,
    hasChat: false,
    expectsFiles: true,
    lastRun: new Date('2024-01-10'),
    outputs: []
  },
  {
    id: 'seasonal-campaign-coordinator',
    title: 'Seasonal Campaign Coordinator',
    description: 'Orchestrate multi-channel seasonal campaigns ensuring brand consistency across digital platforms, retail spaces, and editorial content',
    status: 'idle' as const,
    category: 'brand-content' as const,
    hasChat: true,
    expectsFiles: true,
    lastRun: new Date('2024-01-12'),
    outputs: []
  },
  {
    id: 'artisan-collaboration-tracker',
    title: 'Artisan Collaboration Tracker',
    description: 'Manage partnerships with local artisans and craftspeople, ensuring authentic storytelling and ethical production practices',
    status: 'error' as const,
    category: 'sustainability' as const,
    hasChat: true,
    expectsFiles: false,
    outputs: []
  }
]

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [chatWorkflowId, setChatWorkflowId] = useState<string | null>(null)
  const [chatWorkflowTitle, setChatWorkflowTitle] = useState<string>('')

  const filteredWorkflows = yayaWorkflows.filter(workflow => {
    const matchesSearch = workflow.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || workflow.category === selectedCategory
    const matchesStatus = selectedStatus === 'all' || workflow.status === selectedStatus
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const handleRunWorkflow = async (id: string) => {
    console.log('Running YAYA workflow:', id)
    
    try {
      // Test with minimal inputs for demo
      const testInputs = getTestInputsForWorkflow(id)
      
      const response = await fetch(`/api/workflows/${id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: testInputs,
          userContext: {
            userId: 'test-user',
            department: 'creative',
            role: 'brand-manager'
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to execute workflow: ${response.status}`)
      }

      const result = await response.json()
      console.log('Workflow execution started:', result)
      
      // Update UI to show running status
      // In a real app, you'd update the workflow state
      alert(`YAYA workflow "${result.workflow?.title}" started successfully!\nExecution ID: ${result.executionId}`)
      
    } catch (error) {
      console.error('Failed to run workflow:', error)
      alert(`Failed to start workflow: ${error.message}`)
    }
  }

  const handleConfigureWorkflow = (id: string) => {
    console.log('Configuring workflow:', id)
    // Here you would open workflow configuration
  }

  const checkWorkflowStatus = async (workflowId: string, executionId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/status/${executionId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to check status: ${response.status}`)
      }

      const status = await response.json()
      console.log('YAYA workflow status:', status)
      
      return status
    } catch (error) {
      console.error('Failed to check workflow status:', error)
      throw error
    }
  }

  const handleChatWorkflow = (id: string) => {
    const workflow = yayaWorkflows.find(w => w.id === id)
    if (workflow) {
      setChatWorkflowId(id)
      setChatWorkflowTitle(workflow.title)
    }
  }

  const handleCloseChatWorkflow = () => {
    setChatWorkflowId(null)
    setChatWorkflowTitle('')
  }

  const handleFeedback = (workflowId: string, outputId: string) => {
    console.log('Providing feedback:', workflowId, outputId)
    // Here you would open feedback interface
  }

  const runningCount = yayaWorkflows.filter(w => w.status === 'running').length
  const completedToday = yayaWorkflows.filter(w => 
    w.lastRun && w.lastRun.toDateString() === new Date().toDateString()
  ).length

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card yaya-linen-texture">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-sm flex items-center justify-center shadow-sm">
                <span className="text-primary-foreground yaya-heading text-2xl">Y</span>
              </div>
              <div>
                <h1 className="text-3xl yaya-heading tracking-tight">
                  YAYA <span className="text-muted-foreground yaya-subheading font-normal">Atelier</span>
                </h1>
                <p className="text-muted-foreground mt-1 yaya-body">
                  Creative intelligence for refined fashion
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <div className="font-medium">Spring 2024</div>
                <div className="text-muted-foreground text-xs">Current Collection</div>
              </div>
              <Button className="bg-accent hover:bg-accent/90 yaya-button">
                <Plus className="w-4 h-4 mr-2" />
                New Process
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* YAYA Atelier Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="yaya-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2 yaya-subheading">
                <Target className="w-4 h-4 yaya-spring" />
                Active Processes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light yaya-heading">{yayaWorkflows.length}</div>
              <p className="text-xs text-muted-foreground yaya-body">
                {runningCount} currently crafting
              </p>
            </CardContent>
          </Card>

          <Card className="yaya-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2 yaya-subheading">
                <span className="w-4 h-4 flex items-center justify-center text-xs yaya-summer">✏️</span>
                Design Velocity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light yaya-heading">12</div>
              <p className="text-xs text-muted-foreground yaya-body">
                pieces this week
              </p>
            </CardContent>
          </Card>

          <Card className="yaya-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2 yaya-subheading">
                <span className="w-4 h-4 flex items-center justify-center text-xs yaya-autumn">🏪</span>
                Boutique Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light yaya-heading">8</div>
              <p className="text-xs text-muted-foreground yaya-body">
                locations active
              </p>
            </CardContent>
          </Card>

          <Card className="yaya-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2 yaya-subheading">
                <span className="w-4 h-4 flex items-center justify-center text-xs yaya-winter">🌱</span>
                Sustainability Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light yaya-heading">78%</div>
              <p className="text-xs text-muted-foreground yaya-body">
                2024 progress
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search creative processes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="collections">Collections</SelectItem>
                <SelectItem value="brand-content">Brand Content</SelectItem>
                <SelectItem value="client-insights">Client Insights</SelectItem>
                <SelectItem value="sustainability">Sustainability</SelectItem>
                <SelectItem value="retail-operations">Retail Operations</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="idle">Idle</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Workflow Grid */}
        {filteredWorkflows.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredWorkflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                {...workflow}
                onRun={handleRunWorkflow}
                onConfigure={handleConfigureWorkflow}
                onChat={handleChatWorkflow}
                onFeedback={handleFeedback}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-sm flex items-center justify-center mx-auto mb-6 yaya-linen-texture">
              <span className="text-2xl yaya-heading text-muted-foreground">Y</span>
            </div>
            <h3 className="text-lg font-medium mb-2 yaya-heading">Your atelier awaits your creative vision</h3>
            <p className="text-muted-foreground mb-4 yaya-body max-w-md mx-auto">
              Refine your search to discover the perfect creative process, or begin crafting something new
            </p>
            <Button className="yaya-button">
              <Plus className="w-4 h-4 mr-2" />
              Begin Your Creative Process
            </Button>
          </div>
        )}
      </div>

      {/* Chat Interface */}
      {chatWorkflowId && (
        <ChatInterface
          workflowId={chatWorkflowId}
          workflowTitle={chatWorkflowTitle}
          isOpen={!!chatWorkflowId}
          onClose={handleCloseChatWorkflow}
        />
      )}
    </main>
  )
}
