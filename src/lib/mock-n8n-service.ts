// Mock n8n Service for YAYA Atelier Testing
// Provides realistic responses when actual n8n instance is unavailable

export class MockN8nService {
  private readonly mockExecutions = new Map<string, Record<string, unknown>>()
  private readonly delay = (ms: number) =>
    new Promise(resolve => setTimeout(resolve, ms))

  async executeWorkflowWebhook(
    webhookId: string,
    payload: Record<string, unknown>
  ): Promise<{ executionId: string; data?: unknown }> {
    // Simulate network delay
    await this.delay(500 + Math.random() * 1000)

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    // Store mock execution
    this.mockExecutions.set(executionId, {
      id: executionId,
      workflowId: payload.yayaWorkflow?.id || 'unknown',
      status: 'running',
      startedAt: new Date().toISOString(),
      finished: false,
      payload,
    })

    // Simulate workflow completion after random time
    setTimeout(
      () => {
        this.completeExecution(executionId, payload.yayaWorkflow?.id)
      },
      3000 + Math.random() * 7000
    ) // 3-10 seconds

    console.log('🎭 Mock n8n execution started:', executionId)
    return { executionId }
  }

  async getExecutionStatus(
    executionId: string
  ): Promise<Record<string, unknown>> {
    await this.delay(200 + Math.random() * 300)

    const execution = this.mockExecutions.get(executionId)
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`)
    }

    return {
      id: executionId,
      finished: execution.finished,
      mode: 'webhook',
      startedAt: execution.startedAt,
      stoppedAt: execution.stoppedAt,
      workflowId: execution.workflowId,
      data: execution.finished
        ? {
            resultData: {
              runData: this.generateMockOutputs(execution.workflowId),
              lastNodeExecuted: 'final-output',
            },
          }
        : undefined,
    }
  }

  async testConnection(): Promise<{
    success: boolean
    version?: string
    error?: string
  }> {
    await this.delay(300)

    return {
      success: true,
      version: 'mock-1.0.0',
    }
  }

  private completeExecution(executionId: string, _workflowId: string) {
    const execution = this.mockExecutions.get(executionId)
    if (execution) {
      execution.finished = true
      execution.stoppedAt = new Date().toISOString()
      execution.status = 'completed'

      console.log('🎭 Mock n8n execution completed:', executionId)
      this.mockExecutions.set(executionId, execution)
    }
  }

  private generateMockOutputs(workflowId: string): Record<string, unknown> {
    const outputs: Record<string, unknown> = {}

    switch (workflowId) {
      case 'spring-collection-storytelling':
        outputs.storyGeneration = {
          data: {
            main: [
              {
                json: {
                  narrative:
                    "YAYA's Spring 2024 collection embraces the gentle awakening of nature with flowing silhouettes and organic textures. Each piece tells a story of conscious craftsmanship, where timeless elegance meets modern sensibility. The collection features lightweight blazers in linen blends, flowing dresses that capture the essence of spring breezes, and artisan accessories that speak to our commitment to sustainable luxury.",
                },
              },
            ],
          },
        }
        outputs.visualConcepts = {
          data: {
            main: [
              {
                binary: {
                  'hero-image': {
                    fileName: 'spring-2024-hero.jpg',
                    mimeType: 'image/jpeg',
                    data: 'mock-base64-data',
                  },
                },
              },
            ],
          },
        }
        break

      case 'sustainable-materials-tracker':
        outputs.sustainabilityReport = {
          data: {
            main: [
              {
                binary: {
                  sustainabilityReport: {
                    fileName: 'yaya-sustainability-q1-2024.pdf',
                    mimeType: 'application/pdf',
                    data: 'mock-pdf-data',
                  },
                },
              },
            ],
          },
        }
        outputs.complianceCheck = {
          data: {
            main: [
              {
                json: {
                  complianceStatus: {
                    gotsCompliance: '92%',
                    organicCottonUsage: '78%',
                    recycledMaterials: '34%',
                    sustainabilityScore: 'A-',
                    improvements: [
                      'Increase hemp blend usage in casual wear',
                      'Explore innovative recycled silk options',
                      'Partner with additional GOTS-certified suppliers',
                    ],
                  },
                },
              },
            ],
          },
        }
        break

      case 'client-style-profiles':
        outputs.analyticsReport = {
          data: {
            main: [
              {
                binary: {
                  report: {
                    fileName: 'client-insights-q1-2024.pdf',
                    mimeType: 'application/pdf',
                    data: 'mock-report-data',
                  },
                },
              },
            ],
          },
        }
        outputs.recommendations = {
          data: {
            main: [
              {
                json: {
                  recommendations: {
                    topPreferences: [
                      'Neutral color palettes (beige, cream, soft grey)',
                      'Versatile pieces suitable for work-to-weekend',
                      'Natural fabrics with artisan details',
                      'Timeless cuts with subtle contemporary updates',
                    ],
                    seasonalTrends: {
                      spring2024:
                        'Clients show strong preference for lighter textures and flowing silhouettes',
                      colorPreference:
                        'Earth tones remain dominant, with growing interest in sage green',
                      pricePoint:
                        'Premium segment shows 15% growth, indicating brand positioning success',
                    },
                    actionItems: [
                      'Expand neutral color options in new collections',
                      'Develop more transitional pieces for work-to-leisure',
                      'Introduce artisan collaboration capsule collection',
                    ],
                  },
                },
              },
            ],
          },
        }
        break

      case 'boutique-visual-merchandising':
        outputs.merchandisingConcepts = {
          data: {
            main: [
              {
                binary: {
                  'window-concept-1': {
                    fileName: 'amsterdam-window-spring-2024.jpg',
                    mimeType: 'image/jpeg',
                    data: 'mock-image-data',
                  },
                  'layout-guide': {
                    fileName: 'merchandising-layout-guide.jpg',
                    mimeType: 'image/jpeg',
                    data: 'mock-layout-data',
                  },
                },
              },
            ],
          },
        }
        outputs.setupInstructions = {
          data: {
            main: [
              {
                json: {
                  instructions: `Amsterdam Centrum Spring Window Display Setup:

1. Theme: "Natural Elegance Awakening"
2. Color Palette: Cream, sage green, warm terracotta accents
3. Key Pieces: 
   - Center: Flowing midi dress in organic cotton
   - Left: Linen blazer with artisan buttons
   - Right: Handwoven accessories display

4. Props:
   - Natural linen backdrop
   - Dried pampas grass arrangements
   - Vintage brass mannequin stands
   - Soft directional lighting (warm 2700K)

5. Setup Timeline: 2 hours (off-peak morning)
6. Budget Used: €340 (Standard tier)

Installation Notes:
- Position lighting to avoid harsh shadows
- Ensure accessibility compliance for window access
- Schedule photography for social media within 24h of completion`,
                },
              },
            ],
          },
        }
        break

      case 'seasonal-campaign-coordinator':
        outputs.campaignGeneration = {
          data: {
            main: [
              {
                json: {
                  campaign: {
                    theme: 'Spring Awakening: The Art of Conscious Living',
                    channels: {
                      digital: {
                        instagram: 'Behind-the-scenes artisan partnerships',
                        newsletter:
                          'Collection story featuring sustainability journey',
                        website:
                          'Interactive collection lookbook with material stories',
                      },
                      retail: {
                        windowDisplays:
                          'Natural elements showcasing organic textures',
                        inStore:
                          'Artisan corner featuring craftspeople stories',
                        events:
                          'Spring styling workshops with personal stylists',
                      },
                      editorial: {
                        pressRelease:
                          'YAYA Spring 2024: Where Conscious Meets Couture',
                        influencerKit:
                          'Sustainable fashion storytelling package',
                        mediaAssets:
                          'High-resolution campaign imagery with sustainability focus',
                      },
                    },
                    timeline: {
                      week1: 'Asset creation and content development',
                      week2: 'Retail implementation and team training',
                      week3: 'Digital launch and media outreach',
                      week4: 'Full campaign activation and monitoring',
                    },
                    kpis: {
                      awareness: 'Brand mention increase of 25%',
                      engagement:
                        '40% increase in sustainability-focused content interaction',
                      conversion: '15% lift in collection conversion rate',
                    },
                  },
                },
              },
            ],
          },
        }
        break

      default:
        outputs.genericOutput = {
          data: {
            main: [
              {
                json: {
                  message: 'Mock output generated for YAYA workflow',
                  timestamp: new Date().toISOString(),
                  workflowId,
                },
              },
            ],
          },
        }
    }

    return outputs
  }
}

// Factory function to create mock service
export function createMockN8nService(): MockN8nService {
  return new MockN8nService()
}

// Check if we should use mock service
export function shouldUseMockService(): boolean {
  // Force use of real service when we have a Railway webhook URL configured
  if (
    process.env.N8N_WEBHOOK_BASE_URL?.includes(
      'primary-production-c041f.up.railway.app'
    )
  ) {
    // But only if we have a real API key (not dummy/mock key)
    if (process.env.N8N_API_KEY === 'dummy-key-to-bypass-mock') {
      return true // Use mock service if dummy key
    }
    return false
  }
  // Also check for the old n8n cloud URL for backwards compatibility
  if (process.env.N8N_WEBHOOK_BASE_URL?.includes('willem4130.app.n8n.cloud')) {
    // But only if we have a real API key (not dummy/mock key)
    if (process.env.N8N_API_KEY === 'dummy-key-to-bypass-mock') {
      return true // Use mock service if dummy key
    }
    return false
  }
  return !process.env.N8N_API_KEY || process.env.NODE_ENV === 'development'
}
