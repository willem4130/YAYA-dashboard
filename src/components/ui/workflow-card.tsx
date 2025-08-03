'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  Settings, 
  MessageSquare, 
  FileImage, 
  FileVideo, 
  FileText, 
  Download,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface WorkflowOutput {
  id: string
  type: 'image' | 'video' | 'text' | 'file'
  url?: string
  content?: string
  filename?: string
  timestamp: Date
}

export interface WorkflowCardProps {
  id: string
  title: string
  description: string
  status: 'idle' | 'running' | 'completed' | 'error'
  category: 'social-media' | 'content-creation' | 'analytics' | 'automation'
  hasChat: boolean
  expectsFiles: boolean
  outputs: WorkflowOutput[]
  lastRun?: Date
  onRun: (id: string) => void
  onConfigure: (id: string) => void
  onChat: (id: string) => void
  onFeedback: (id: string, outputId: string) => void
}

const statusConfig = {
  idle: { icon: Play, color: 'text-muted-foreground', bg: 'bg-muted' },
  running: { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50' },
  completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' }
}

const categoryColors = {
  'social-media': 'bg-pink-100 text-pink-800',
  'content-creation': 'bg-purple-100 text-purple-800',
  'analytics': 'bg-blue-100 text-blue-800',
  'automation': 'bg-green-100 text-green-800'
}

const outputIcons = {
  image: FileImage,
  video: FileVideo,
  text: FileText,
  file: Download
}

export function WorkflowCard({
  id,
  title,
  description,
  status,
  category,
  hasChat,
  expectsFiles,
  outputs,
  lastRun,
  onRun,
  onConfigure,
  onChat,
  onFeedback
}: WorkflowCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const StatusIcon = statusConfig[status].icon

  return (
    <Card className="h-full transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg font-medium">{title}</CardTitle>
              <Badge variant="secondary" className={categoryColors[category]}>
                {category.replace('-', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          </div>
          <div className={cn('p-2 rounded-full', statusConfig[status].bg)}>
            <StatusIcon className={cn('w-4 h-4', statusConfig[status].color, {
              'animate-spin': status === 'running'
            })} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={() => onRun(id)}
            disabled={status === 'running'}
            className="flex-1"
            size="sm"
          >
            {status === 'running' ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run
              </>
            )}
          </Button>
          
          {hasChat && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChat(id)}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConfigure(id)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Workflow Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            {hasChat && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Chat enabled
              </span>
            )}
            {expectsFiles && (
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                File output
              </span>
            )}
          </div>
          {lastRun && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last run: {lastRun.toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Outputs */}
        {outputs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Recent Outputs</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs"
              >
                {isExpanded ? 'Show less' : `View all (${outputs.length})`}
              </Button>
            </div>
            
            <div className="space-y-2">
              {(isExpanded ? outputs : outputs.slice(0, 2)).map((output) => {
                const OutputIcon = outputIcons[output.type]
                return (
                  <div
                    key={output.id}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <OutputIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm truncate">
                        {output.filename || output.content?.substring(0, 50) || 'Generated content'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {output.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(output.url, '_blank')}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onFeedback(id, output.id)}
                        className="text-accent hover:text-accent"
                      >
                        Improve
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}