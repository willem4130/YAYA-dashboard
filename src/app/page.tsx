'use client'

import { useState, useEffect, useRef } from 'react'
import { useGSAPAnimations } from '@/hooks/useGSAPAnimations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  WorkflowCard,
  type WorkflowOutput,
} from '@/components/ui/workflow-card'
import { YayaCreativeAssistantCard } from '@/components/ui/yaya-creative-assistant-card'
import { YayaChatInterface } from '@/components/ui/yaya-chat-interface'
import { WorkflowSettings } from '@/components/ui/workflow-settings'
import { WorkflowResultDisplay } from '@/components/ui/workflow-result-display'
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
  Target,
} from 'lucide-react'

// Test inputs for YAYA workflows
const getTestInputsForWorkflow = (workflowId: string): Record<string, any> => {
  const testInputs: Record<string, any> = {
    'spring-collection-storytelling': {
      collectionTheme: 'Natural Elegance',
      targetSeason: 'Spring 2024',
      keyPieces: [
        'flowing dresses',
        'lightweight blazers',
        'artisan accessories',
      ],
      brandVoice: 'sophisticated',
      targetAudience: 'conscious-consumers',
    },
    'sustainable-materials-tracker': {
      reportPeriod: 'Q1-2024',
      materialCategories: ['organic cotton', 'recycled wool', 'hemp blends'],
      certificationLevel: 'GOTS',
    },
    'client-style-profiles': {
      analysisType: 'style-preferences',
      timeframe: 'last-quarter',
      customerSegment: 'vip-customers',
    },
    'boutique-visual-merchandising': {
      boutiqueLocation: 'Amsterdam-Centrum',
      displayType: 'window-display',
      currentCollection: 'Spring-Essentials',
      budgetRange: 'standard',
    },
    'seasonal-campaign-coordinator': {
      campaignSeason: 'Spring-2024',
      channels: ['digital', 'retail', 'editorial'],
      campaignObjective: 'collection-launch',
      budgetAllocation: 'enhanced',
    },
  }

  return testInputs[workflowId] || {}
}

// YAYA Atelier Workflows - Streamlined for chat focus
const yayaWorkflows = [
  {
    id: 'yaya-creative-assistant',
    title: 'Commercial Optimizer',
    description:
      "AI-powered commercial strategy advisor that analyzes market trends, optimizes product positioning, and enhances revenue potential across all YAYA collections and retail channels",
    status: 'idle' as const,
    category: 'brand-content' as const,
    hasChat: true,
    expectsFiles: false,
    lastRun: new Date('2024-01-20'),
    outputs: [],
  },
]

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [chatWorkflowId, setChatWorkflowId] = useState<string | null>(null)
  const [settingsWorkflowId, setSettingsWorkflowId] = useState<string | null>(
    null
  )
  const [resultDisplay, setResultDisplay] = useState<{
    workflowId: string
    executionId: string
    workflowTitle: string
  } | null>(null)
  // GSAP Animations
  const {
    animatePageLoad,
    setupScrollAnimations,
    animateHeaderButton,
    animateHeaderButtonPress,
  } = useGSAPAnimations()

  // Refs for animation targets
  const headerRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLImageElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const debugButtonRef = useRef<HTMLButtonElement>(null)
  const newProcessButtonRef = useRef<HTMLButtonElement>(null)

  // Initialize animations on page load
  useEffect(() => {
    // Delay to ensure DOM is ready
    const timer = setTimeout(() => {
      animatePageLoad()
      setupScrollAnimations()
    }, 100)

    return () => clearTimeout(timer)
  }, [animatePageLoad, setupScrollAnimations])

  const filteredWorkflows = yayaWorkflows.filter(workflow => {
    const matchesSearch =
      workflow.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory =
      selectedCategory === 'all' || workflow.category === selectedCategory
    const matchesStatus =
      selectedStatus === 'all' || workflow.status === selectedStatus

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
            role: 'brand-manager',
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to execute workflow: ${response.status}`)
      }

      const result = await response.json()
      console.log('Workflow execution started:', result)

      // Show result display with polling
      const workflow = yayaWorkflows.find(w => w.id === id)
      if (result.executionId && workflow) {
        setResultDisplay({
          workflowId: id,
          executionId: result.executionId,
          workflowTitle: workflow.title,
        })
      }
    } catch (error) {
      console.error('Failed to run workflow:', error)
      alert(
        `Failed to start workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  const handleConfigureWorkflow = (id: string) => {
    console.log('Configuring workflow:', id)
    setSettingsWorkflowId(id)
  }

  const handleChatWorkflow = (id: string) => {
    const workflow = yayaWorkflows.find(w => w.id === id)
    if (workflow) {
      setChatWorkflowId(id)
    }
  }

  const handleCloseChatWorkflow = () => {
    setChatWorkflowId(null)
  }

  const handleCloseSettings = () => {
    setSettingsWorkflowId(null)
  }

  const handleCloseResultDisplay = () => {
    setResultDisplay(null)
  }

  const handleSaveWorkflowConfig = (config: any) => {
    console.log('Saving workflow configuration:', config)
    // Configuration is automatically saved to localStorage by the WorkflowSettings component
    // Here you could also sync to a backend database if needed
  }

  const handleFeedback = (workflowId: string, outputId: string) => {
    console.log('Providing feedback:', workflowId, outputId)
    // Here you would open feedback interface
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div
        ref={headerRef}
        className="yaya-header border-b bg-card yaya-linen-texture"
        data-animate="header"
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center">
                <img
                  ref={logoRef}
                  src="https://yaya.eu/cdn/shop/files/9853d1fa-2948-4023-a88f-f8aa72e3fa7f.png?v=1718185879&width=280"
                  alt="YAYA"
                  className="yaya-logo h-10 w-auto object-contain"
                  loading="eager"
                  data-animate="logo"
                />
              </div>
              <div>
                <h1 className="text-3xl yaya-heading tracking-tight">
                  <span className="text-muted-foreground yaya-subheading font-normal">
                    Fashion
                  </span>
                </h1>
                <p className="text-muted-foreground mt-1 yaya-body">
                  Creative intelligence for refined fashion
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                ref={debugButtonRef}
                className="yaya-header-button yaya-header-button-secondary group"
                onMouseEnter={() => animateHeaderButton(debugButtonRef, true)}
                onMouseLeave={() => animateHeaderButton(debugButtonRef, false)}
                onClick={() => {
                  animateHeaderButtonPress(debugButtonRef)
                  window.location.href = '/debug'
                }}
                data-animate="header-button"
              >
                <Brain className="w-3.5 h-3.5 mr-2.5 transition-transform duration-300 group-hover:rotate-6" />
                <span className="yaya-subheading">Test Workflow</span>
              </button>

              <button
                ref={newProcessButtonRef}
                className="yaya-header-button yaya-header-button-primary group"
                onMouseEnter={() =>
                  animateHeaderButton(newProcessButtonRef, true)
                }
                onMouseLeave={() =>
                  animateHeaderButton(newProcessButtonRef, false)
                }
                onClick={() => animateHeaderButtonPress(newProcessButtonRef)}
                data-animate="header-button"
              >
                <Plus className="w-4 h-4 mr-2.5 transition-transform duration-300 group-hover:rotate-90" />
                <span className="yaya-subheading">New Process</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div
          className="search-filters flex flex-col sm:flex-row gap-4 mb-8"
          data-animate="filter"
        >
          <div ref={searchRef} className="relative flex-1">
            <Search className="search-icon absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search creative processes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
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
                <SelectItem value="retail-operations">
                  Retail Operations
                </SelectItem>
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
          <div
            ref={cardsRef}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {filteredWorkflows.map(workflow => (
              <div
                key={workflow.id}
                className="workflow-card"
                data-animate="card"
              >
                {workflow.id === 'yaya-creative-assistant' ? (
                  <YayaCreativeAssistantCard
                    {...workflow}
                    onRun={handleRunWorkflow}
                    onConfigure={handleConfigureWorkflow}
                    onChat={handleChatWorkflow}
                    onFeedback={handleFeedback}
                  />
                ) : (
                  <WorkflowCard
                    {...workflow}
                    onRun={handleRunWorkflow}
                    onConfigure={handleConfigureWorkflow}
                    onChat={handleChatWorkflow}
                    onFeedback={handleFeedback}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-sm flex items-center justify-center mx-auto mb-6 yaya-linen-texture">
              <img
                src="/yaya-logo.svg"
                alt="YAYA"
                className="h-8 w-auto opacity-50"
              />
            </div>
            <h3 className="text-lg font-medium mb-2 yaya-heading">
              Your atelier awaits your creative vision
            </h3>
            <p className="text-muted-foreground mb-4 yaya-body max-w-md mx-auto">
              Refine your search to discover the perfect creative process, or
              begin crafting something new
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
        <YayaChatInterface
          isOpen={!!chatWorkflowId}
          onClose={handleCloseChatWorkflow}
        />
      )}

      {/* Settings Modal */}
      {settingsWorkflowId && (
        <WorkflowSettings
          workflowId={settingsWorkflowId}
          isOpen={!!settingsWorkflowId}
          onClose={handleCloseSettings}
          onSave={handleSaveWorkflowConfig}
        />
      )}

      {/* Result Display Modal */}
      {resultDisplay && (
        <WorkflowResultDisplay
          workflowId={resultDisplay.workflowId}
          executionId={resultDisplay.executionId}
          workflowTitle={resultDisplay.workflowTitle}
          isOpen={!!resultDisplay}
          onClose={handleCloseResultDisplay}
        />
      )}
    </main>
  )
}
