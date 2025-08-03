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

  const handleRunWorkflow = (id: string) => {
    console.log('Running workflow:', id)
    // Here you would trigger the n8n workflow
  }

  const handleConfigureWorkflow = (id: string) => {
    console.log('Configuring workflow:', id)
    // Here you would open workflow configuration
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
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-tight">
                YAYA <span className="text-muted-foreground font-normal">Workflow Hub</span>
              </h1>
              <p className="text-muted-foreground mt-1">
                Streamline your creative processes with AI-powered workflows
              </p>
            </div>
            <Button className="bg-accent hover:bg-accent/90">
              <Plus className="w-4 h-4 mr-2" />
              New Workflow
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4" />
                Active Workflows
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light">{mockWorkflows.length}</div>
              <p className="text-xs text-muted-foreground">
                {runningCount} currently running
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Completed Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light">{completedToday}</div>
              <p className="text-xs text-muted-foreground">
                +12% from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Team Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light">94%</div>
              <p className="text-xs text-muted-foreground">
                Average success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light">23</div>
              <p className="text-xs text-muted-foreground">
                Optimization suggestions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search workflows..."
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
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="social-media">Social Media</SelectItem>
                <SelectItem value="content-creation">Content Creation</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
                <SelectItem value="automation">Automation</SelectItem>
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
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No workflows found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or create a new workflow
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Workflow
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
