import { z } from 'zod'

// YAYA Workflow Definitions - Real n8n Integration
export interface YayaWorkflowConfig {
  id: string
  title: string
  description: string
  category: 'collections' | 'brand-content' | 'client-insights' | 'sustainability' | 'retail-operations'
  hasChat: boolean
  expectsFiles: boolean
  
  // n8n Integration
  n8nWorkflowId: string
  webhookId: string
  
  // Input Schema for validation
  inputSchema: {
    required: string[]
    optional: string[]
    fields: Record<string, {
      type: 'string' | 'number' | 'boolean' | 'array' | 'file'
      description: string
      enum?: string[]
      min?: number
      max?: number
      accept?: string // for file inputs
    }>
  }
  
  // Expected outputs
  outputs: {
    types: ('image' | 'video' | 'text' | 'file')[]
    description: string
  }
  
  // Execution settings
  settings: {
    timeout: number // in milliseconds
    retries: number
    concurrent: boolean
    requiresApproval: boolean
  }
  
  // YAYA specific metadata
  yayaMetadata: {
    seasonalRelevance: ('spring' | 'summer' | 'autumn' | 'winter')[]
    brandAlignment: 'high' | 'medium' | 'low'
    userRoles: string[]
    priority: 'critical' | 'high' | 'medium' | 'low'
    lastUpdated: string
    version: string
  }
}

// Input validation schema
const YayaWorkflowInputSchema = z.object({
  workflowId: z.string(),
  inputs: z.record(z.any()),
  parameters: z.record(z.any()).optional(),
  userContext: z.object({
    userId: z.string().optional(),
    department: z.string().optional(),
    role: z.string().optional()
  }).optional()
})

// Real YAYA n8n Workflow Configurations
export const YAYA_WORKFLOWS: Record<string, YayaWorkflowConfig> = {
  'spring-collection-storytelling': {
    id: 'spring-collection-storytelling',
    title: 'Spring Collection Storytelling',
    description: 'Create cohesive brand narratives for new seasonal pieces, maintaining YAYA\'s sophisticated yet approachable voice across all touchpoints',
    category: 'collections',
    hasChat: true,
    expectsFiles: true,
    
    // Real n8n workflow configuration
    n8nWorkflowId: '101', // Replace with actual n8n workflow ID
    webhookId: 'yaya-spring-storytelling', // Replace with actual webhook ID
    
    inputSchema: {
      required: ['collectionTheme', 'targetSeason', 'keyPieces'],
      optional: ['brandVoice', 'targetAudience', 'channelFocus'],
      fields: {
        collectionTheme: {
          type: 'string',
          description: 'Main theme for the collection (e.g., "Urban Comfort", "Natural Elegance")',
          enum: ['Urban Comfort', 'Natural Elegance', 'Effortless Sophistication', 'Timeless Minimalism']
        },
        targetSeason: {
          type: 'string',
          description: 'Season for the collection launch',
          enum: ['Spring 2024', 'Summer 2024', 'Autumn 2024', 'Winter 2024']
        },
        keyPieces: {
          type: 'array',
          description: 'Key pieces to highlight in storytelling'
        },
        brandVoice: {
          type: 'string',
          description: 'Brand voice tone for this campaign',
          enum: ['sophisticated', 'approachable', 'inspiring', 'confident']
        },
        targetAudience: {
          type: 'string',
          description: 'Primary target audience',
          enum: ['young-professionals', 'established-women', 'creative-entrepreneurs', 'conscious-consumers']
        },
        channelFocus: {
          type: 'array',
          description: 'Primary channels for content distribution'
        },
        productImages: {
          type: 'file',
          description: 'Product images for the collection',
          accept: 'image/*'
        }
      }
    },
    
    outputs: {
      types: ['text', 'image'],
      description: 'Brand narratives, social media captions, and visual content concepts'
    },
    
    settings: {
      timeout: 600000, // 10 minutes
      retries: 2,
      concurrent: false,
      requiresApproval: true
    },
    
    yayaMetadata: {
      seasonalRelevance: ['spring', 'summer'],
      brandAlignment: 'high',
      userRoles: ['brand-manager', 'creative-director', 'marketing-team'],
      priority: 'high',
      lastUpdated: '2024-01-15',
      version: '2.1.0'
    }
  },

  'sustainable-materials-tracker': {
    id: 'sustainable-materials-tracker',
    title: 'Sustainable Materials Tracker',
    description: 'Monitor and report on eco-friendly fabric sourcing aligned with YAYA\'s commitment to conscious fashion and environmental responsibility',
    category: 'sustainability',
    hasChat: true,
    expectsFiles: false,
    
    n8nWorkflowId: '102',
    webhookId: 'yaya-sustainability-tracker',
    
    inputSchema: {
      required: ['reportPeriod', 'materialCategories'],
      optional: ['supplierFilter', 'certificationLevel', 'targetMetrics'],
      fields: {
        reportPeriod: {
          type: 'string',
          description: 'Reporting period for sustainability analysis',
          enum: ['Q1-2024', 'Q2-2024', 'Q3-2024', 'Q4-2024', 'Annual-2024']
        },
        materialCategories: {
          type: 'array',
          description: 'Material categories to include in analysis'
        },
        supplierFilter: {
          type: 'array',
          description: 'Specific suppliers to include/exclude'
        },
        certificationLevel: {
          type: 'string',
          description: 'Minimum certification level required',
          enum: ['GOTS', 'OEKO-TEX', 'Cradle-to-Cradle', 'GRS', 'Any']
        },
        targetMetrics: {
          type: 'array',
          description: 'Specific sustainability metrics to track'
        }
      }
    },
    
    outputs: {
      types: ['file', 'text'],
      description: 'Sustainability reports, compliance documentation, and improvement recommendations'
    },
    
    settings: {
      timeout: 900000, // 15 minutes
      retries: 1,
      concurrent: true,
      requiresApproval: false
    },
    
    yayaMetadata: {
      seasonalRelevance: ['spring', 'summer', 'autumn', 'winter'],
      brandAlignment: 'high',
      userRoles: ['sustainability-manager', 'procurement-team', 'executive-team'],
      priority: 'critical',
      lastUpdated: '2024-01-16',
      version: '1.5.0'
    }
  },

  'client-style-profiles': {
    id: 'client-style-profiles',
    title: 'Client Style Profile Analysis',
    description: 'Understand customer preferences to enhance personal styling recommendations and guide future collection development with data-driven insights',
    category: 'client-insights',
    hasChat: true,
    expectsFiles: false,
    
    n8nWorkflowId: '103',
    webhookId: 'yaya-client-insights',
    
    inputSchema: {
      required: ['analysisType', 'timeframe'],
      optional: ['customerSegment', 'productCategories', 'boutiques'],
      fields: {
        analysisType: {
          type: 'string',
          description: 'Type of customer analysis to perform',
          enum: ['style-preferences', 'purchase-patterns', 'seasonal-trends', 'lifetime-value']
        },
        timeframe: {
          type: 'string',
          description: 'Time period for analysis',
          enum: ['last-30-days', 'last-quarter', 'last-6-months', 'last-year']
        },
        customerSegment: {
          type: 'string',
          description: 'Specific customer segment to analyze',
          enum: ['new-customers', 'vip-customers', 'frequent-buyers', 'seasonal-shoppers']
        },
        productCategories: {
          type: 'array',
          description: 'Product categories to include in analysis'
        },
        boutiques: {
          type: 'array',
          description: 'Specific boutique locations to analyze'
        }
      }
    },
    
    outputs: {
      types: ['file', 'text'],
      description: 'Customer insights reports, styling recommendations, and trend analysis'
    },
    
    settings: {
      timeout: 450000, // 7.5 minutes
      retries: 2,
      concurrent: true,
      requiresApproval: false
    },
    
    yayaMetadata: {
      seasonalRelevance: ['spring', 'summer', 'autumn', 'winter'],
      brandAlignment: 'high',
      userRoles: ['data-analyst', 'customer-insights', 'personal-stylist', 'store-manager'],
      priority: 'medium',
      lastUpdated: '2024-01-14',
      version: '1.3.0'
    }
  },

  'boutique-visual-merchandising': {
    id: 'boutique-visual-merchandising',
    title: 'Boutique Visual Merchandising',
    description: 'Generate seasonal window displays and in-store styling concepts that reflect YAYA\'s refined aesthetic across all retail locations',
    category: 'retail-operations',
    hasChat: false,
    expectsFiles: true,
    
    n8nWorkflowId: '104',
    webhookId: 'yaya-visual-merchandising',
    
    inputSchema: {
      required: ['boutiqueLocation', 'displayType', 'currentCollection'],
      optional: ['localEvents', 'budgetRange', 'existingProps'],
      fields: {
        boutiqueLocation: {
          type: 'string',
          description: 'Boutique location for merchandising',
          enum: ['Amsterdam-Centrum', 'Rotterdam-Zuid', 'Utrecht-Oudegracht', 'Den-Haag-Frederik', 'Maastricht-Wyck', 'Groningen-Centrum', 'Eindhoven-Centrum', 'Tilburg-Centrum']
        },
        displayType: {
          type: 'string',
          description: 'Type of visual display to create',
          enum: ['window-display', 'in-store-focal', 'seasonal-corner', 'new-arrivals', 'sale-presentation']
        },
        currentCollection: {
          type: 'string',
          description: 'Current collection to feature',
          enum: ['Spring-Essentials', 'Summer-Comfort', 'Autumn-Layers', 'Winter-Warmth']
        },
        localEvents: {
          type: 'array',
          description: 'Local events or themes to incorporate'
        },
        budgetRange: {
          type: 'string',
          description: 'Budget range for display creation',
          enum: ['minimal', 'standard', 'premium']
        },
        existingProps: {
          type: 'array',
          description: 'Existing props and materials available'
        },
        spacePhotos: {
          type: 'file',
          description: 'Photos of the display space',
          accept: 'image/*'
        }
      }
    },
    
    outputs: {
      types: ['image', 'text', 'file'],
      description: 'Visual merchandising concepts, setup instructions, and styling guides'
    },
    
    settings: {
      timeout: 720000, // 12 minutes
      retries: 1,
      concurrent: false,
      requiresApproval: true
    },
    
    yayaMetadata: {
      seasonalRelevance: ['spring', 'summer', 'autumn', 'winter'],
      brandAlignment: 'high',
      userRoles: ['visual-merchandiser', 'store-manager', 'retail-operations'],
      priority: 'medium',
      lastUpdated: '2024-01-10',
      version: '1.2.0'
    }
  },

  'seasonal-campaign-coordinator': {
    id: 'seasonal-campaign-coordinator',
    title: 'Seasonal Campaign Coordinator',
    description: 'Orchestrate multi-channel seasonal campaigns ensuring brand consistency across digital platforms, retail spaces, and editorial content',
    category: 'brand-content',
    hasChat: true,
    expectsFiles: true,
    
    n8nWorkflowId: '105',
    webhookId: 'yaya-campaign-coordinator',
    
    inputSchema: {
      required: ['campaignSeason', 'channels', 'campaignObjective'],
      optional: ['budgetAllocation', 'keyMessages', 'targetMarkets'],
      fields: {
        campaignSeason: {
          type: 'string',
          description: 'Season for the campaign',
          enum: ['Spring-2024', 'Summer-2024', 'Autumn-2024', 'Winter-2024']
        },
        channels: {
          type: 'array',
          description: 'Marketing channels to coordinate'
        },
        campaignObjective: {
          type: 'string',
          description: 'Primary campaign objective',
          enum: ['brand-awareness', 'collection-launch', 'seasonal-promotion', 'sustainability-focus']
        },
        budgetAllocation: {
          type: 'string',
          description: 'Budget tier for campaign',
          enum: ['standard', 'enhanced', 'premium']
        },
        keyMessages: {
          type: 'array',
          description: 'Key brand messages to emphasize'
        },
        targetMarkets: {
          type: 'array',
          description: 'Geographic markets to target'
        },
        brandAssets: {
          type: 'file',
          description: 'Brand assets and collection imagery',
          accept: 'image/*,video/*'
        }
      }
    },
    
    outputs: {
      types: ['text', 'image', 'file'],
      description: 'Campaign strategies, content calendars, and creative briefs'
    },
    
    settings: {
      timeout: 800000, // 13+ minutes
      retries: 2,
      concurrent: false,
      requiresApproval: true
    },
    
    yayaMetadata: {
      seasonalRelevance: ['spring', 'summer', 'autumn', 'winter'],
      brandAlignment: 'high',
      userRoles: ['campaign-manager', 'brand-director', 'marketing-team', 'creative-team'],
      priority: 'high',
      lastUpdated: '2024-01-12',
      version: '1.4.0'
    }
  }
}

// Validation and utility functions
export function validateWorkflowInput(workflowId: string, inputs: Record<string, any>): {
  isValid: boolean
  errors: string[]
  sanitizedInputs: Record<string, any>
} {
  const workflow = YAYA_WORKFLOWS[workflowId]
  if (!workflow) {
    return {
      isValid: false,
      errors: [`Workflow ${workflowId} not found`],
      sanitizedInputs: {}
    }
  }

  const errors: string[] = []
  const sanitizedInputs: Record<string, any> = {}

  // Check required fields
  for (const requiredField of workflow.inputSchema.required) {
    if (!inputs[requiredField]) {
      errors.push(`Required field '${requiredField}' is missing`)
    }
  }

  // Validate and sanitize each input
  for (const [fieldName, fieldValue] of Object.entries(inputs)) {
    const fieldSchema = workflow.inputSchema.fields[fieldName]
    if (!fieldSchema) {
      // Skip unknown fields
      continue
    }

    // Type validation
    const validation = validateFieldType(fieldValue, fieldSchema)
    if (!validation.isValid) {
      errors.push(`Field '${fieldName}': ${validation.error}`)
    } else {
      sanitizedInputs[fieldName] = validation.value
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedInputs
  }
}

function validateFieldType(value: any, schema: YayaWorkflowConfig['inputSchema']['fields'][string]): {
  isValid: boolean
  error?: string
  value: any
} {
  switch (schema.type) {
    case 'string':
      if (typeof value !== 'string') {
        return { isValid: false, error: 'Expected string value' }
      }
      if (schema.enum && !schema.enum.includes(value)) {
        return { isValid: false, error: `Value must be one of: ${schema.enum.join(', ')}` }
      }
      return { isValid: true, value }

    case 'number':
      const numValue = Number(value)
      if (isNaN(numValue)) {
        return { isValid: false, error: 'Expected numeric value' }
      }
      if (schema.min && numValue < schema.min) {
        return { isValid: false, error: `Value must be at least ${schema.min}` }
      }
      if (schema.max && numValue > schema.max) {
        return { isValid: false, error: `Value must be at most ${schema.max}` }
      }
      return { isValid: true, value: numValue }

    case 'boolean':
      return { isValid: true, value: Boolean(value) }

    case 'array':
      if (!Array.isArray(value)) {
        return { isValid: false, error: 'Expected array value' }
      }
      return { isValid: true, value }

    case 'file':
      // File validation would be handled separately in upload logic
      return { isValid: true, value }

    default:
      return { isValid: true, value }
  }
}

export function getWorkflowByCategory(category: string): YayaWorkflowConfig[] {
  return Object.values(YAYA_WORKFLOWS).filter(workflow => 
    category === 'all' || workflow.category === category
  )
}

export function getWorkflowsByUserRole(userRole: string): YayaWorkflowConfig[] {
  return Object.values(YAYA_WORKFLOWS).filter(workflow =>
    workflow.yayaMetadata.userRoles.includes(userRole)
  )
}

export function getSeasonalWorkflows(season: string): YayaWorkflowConfig[] {
  return Object.values(YAYA_WORKFLOWS).filter(workflow =>
    workflow.yayaMetadata.seasonalRelevance.includes(season as any)
  )
}

export type { YayaWorkflowConfig }