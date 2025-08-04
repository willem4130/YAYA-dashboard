'use client'

import { useState } from 'react'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sparkles,
  Users,
  BarChart3,
  Leaf,
  ShoppingBag,
  Target,
  ArrowRight,
} from 'lucide-react'

// Workflow template definitions
const WORKFLOW_TEMPLATES = [
  {
    id: 'seasonal-collection-planner',
    title: 'Seasonal Collection Planner',
    description: 'Plan and coordinate seasonal fashion collections with trend analysis and market insights',
    category: 'collections' as const,
    icon: Sparkles,
    difficulty: 'Beginner',
    estimatedTime: '15-30 minutes',
    features: ['Trend Analysis', 'Color Palettes', 'Market Research', 'Timeline Planning'],
  },
  {
    id: 'brand-content-generator',
    title: 'Brand Content Generator',
    description: 'Create cohesive brand content across social media, campaigns, and marketing materials',
    category: 'brand-content' as const,
    icon: Target,
    difficulty: 'Intermediate',
    estimatedTime: '20-45 minutes',
    features: ['Social Media Content', 'Campaign Materials', 'Brand Voice', 'Visual Identity'],
  },
  {
    id: 'customer-insights-analyzer',
    title: 'Customer Insights Analyzer',
    description: 'Analyze customer behavior, preferences, and purchasing patterns for data-driven decisions',
    category: 'client-insights' as const,
    icon: Users,
    difficulty: 'Advanced',
    estimatedTime: '30-60 minutes',
    features: ['Behavior Analysis', 'Purchase Patterns', 'Segmentation', 'Predictions'],
  },
  {
    id: 'sustainability-tracker',
    title: 'Sustainability Tracker',
    description: 'Monitor and report on sustainable practices, materials, and environmental impact',
    category: 'sustainability' as const,
    icon: Leaf,
    difficulty: 'Intermediate',
    estimatedTime: '25-40 minutes',
    features: ['Material Tracking', 'Carbon Footprint', 'Certification', 'Reporting'],
  },
  {
    id: 'retail-performance-optimizer',
    title: 'Retail Performance Optimizer',
    description: 'Optimize retail operations, inventory management, and sales performance',
    category: 'retail-operations' as const,
    icon: BarChart3,
    difficulty: 'Advanced',
    estimatedTime: '35-50 minutes',
    features: ['Inventory Management', 'Sales Analytics', 'Performance Metrics', 'Optimization'],
  },
  {
    id: 'custom-workflow',
    title: 'Custom Workflow',
    description: 'Create a completely custom workflow tailored to your specific needs',
    category: 'collections' as const,
    icon: ShoppingBag,
    difficulty: 'Expert',
    estimatedTime: '45-90 minutes',
    features: ['Full Customization', 'Advanced Features', 'Complex Logic', 'API Integration'],
  },
]

// Form validation schema
const NewProcessSchema = z.object({
  templateId: z.string().min(1, 'Please select a workflow template'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(50, 'Title must be less than 50 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(200, 'Description must be less than 200 characters'),
  category: z.enum(['collections', 'brand-content', 'client-insights', 'sustainability', 'retail-operations']),
})

type NewProcessForm = z.infer<typeof NewProcessSchema>

interface NewProcessModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: NewProcessForm & { template: typeof WORKFLOW_TEMPLATES[0] }) => void
}

export function NewProcessModal({ isOpen, onClose, onSubmit }: NewProcessModalProps) {
  const [step, setStep] = useState<'template' | 'details'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<typeof WORKFLOW_TEMPLATES[0] | null>(null)
  const [formData, setFormData] = useState<Partial<NewProcessForm>>({})
  const [errors, setErrors] = useState<Partial<Record<keyof NewProcessForm, string>>>({})

  const handleTemplateSelect = (template: typeof WORKFLOW_TEMPLATES[0]) => {
    setSelectedTemplate(template)
    setFormData(prev => ({
      ...prev,
      templateId: template.id,
      category: template.category,
      title: template.title,
      description: template.description,
    }))
    setStep('details')
  }

  const handleBackToTemplates = () => {
    setStep('template')
    setSelectedTemplate(null)
    setErrors({})
  }

  const handleSubmit = () => {
    if (!selectedTemplate) return

    const validation = NewProcessSchema.safeParse(formData)
    
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof NewProcessForm, string>> = {}
      validation.error.errors.forEach(error => {
        if (error.path[0]) {
          fieldErrors[error.path[0] as keyof NewProcessForm] = error.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    onSubmit({
      ...validation.data,
      template: selectedTemplate,
    })
    
    // Reset form
    setStep('template')
    setSelectedTemplate(null)
    setFormData({})
    setErrors({})
  }

  const handleClose = () => {
    setStep('template')
    setSelectedTemplate(null)
    setFormData({})
    setErrors({})
    onClose()
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      'collections': 'bg-purple-100 text-purple-800',
      'brand-content': 'bg-blue-100 text-blue-800',
      'client-insights': 'bg-green-100 text-green-800',
      'sustainability': 'bg-emerald-100 text-emerald-800',
      'retail-operations': 'bg-orange-100 text-orange-800',
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      'Beginner': 'bg-green-100 text-green-800',
      'Intermediate': 'bg-yellow-100 text-yellow-800',
      'Advanced': 'bg-orange-100 text-orange-800',
      'Expert': 'bg-red-100 text-red-800',
    }
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden yaya-luxury-card">
        {step === 'template' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl yaya-heading">Create New Process</DialogTitle>
              <DialogDescription className="yaya-body">
                Choose a workflow template to get started with your YAYA process
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              {WORKFLOW_TEMPLATES.map((template) => {
                const IconComponent = template.icon
                return (
                  <Card 
                    key={template.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 yaya-card group"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-sm bg-primary/10">
                            <IconComponent className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg yaya-heading group-hover:text-primary transition-colors">
                              {template.title}
                            </CardTitle>
                            <div className="flex gap-2 mt-2">
                              <Badge className={getCategoryColor(template.category)}>
                                {template.category.replace('-', ' ')}
                              </Badge>
                              <Badge className={getDifficultyColor(template.difficulty)}>
                                {template.difficulty}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="yaya-body mb-3">
                        {template.description}
                      </CardDescription>
                      <div className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium">Estimated time:</span> {template.estimatedTime}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {template.features.map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToTemplates}
                  className="p-1 h-8 w-8"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </Button>
                <div>
                  <DialogTitle className="text-2xl yaya-heading">Customize Your Process</DialogTitle>
                  <DialogDescription className="yaya-body">
                    Configure your {selectedTemplate?.title} workflow
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm font-medium yaya-subheading">Process Title</label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter a descriptive title for your process"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium yaya-subheading">Description</label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this process will accomplish"
                  rows={3}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium yaya-subheading">Category</label>
                <Select
                  value={formData.category || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
                >
                  <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collections">Collections</SelectItem>
                    <SelectItem value="brand-content">Brand Content</SelectItem>
                    <SelectItem value="client-insights">Client Insights</SelectItem>
                    <SelectItem value="sustainability">Sustainability</SelectItem>
                    <SelectItem value="retail-operations">Retail Operations</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
              </div>

              {selectedTemplate && (
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-lg yaya-heading">Template Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.features.map((feature, index) => (
                        <Badge key={index} variant="secondary">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleBackToTemplates}>
                Back to Templates
              </Button>
              <Button onClick={handleSubmit} className="yaya-button">
                Create Process
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}