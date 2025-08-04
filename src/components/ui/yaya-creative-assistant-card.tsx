'use client'

import { useRef } from 'react'
import { WorkflowCard, WorkflowCardProps } from './workflow-card'
import { useGSAPAnimations } from '@/hooks/useGSAPAnimations'
import { cn } from '@/lib/utils'

interface YayaCreativeAssistantCardProps extends WorkflowCardProps {
  className?: string
}

export function YayaCreativeAssistantCard({
  className,
  ...props
}: YayaCreativeAssistantCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { animateCreativeAssistantHover } = useGSAPAnimations()

  const handleMouseEnter = () => {
    // Find the actual card element (first child)
    const actualCard = cardRef.current?.querySelector('.yaya-card')
    if (actualCard) {
      const cardElement = { current: actualCard as HTMLElement }
      animateCreativeAssistantHover(cardElement, true)
    }
  }

  const handleMouseLeave = () => {
    // Find the actual card element (first child)
    const actualCard = cardRef.current?.querySelector('.yaya-card')
    if (actualCard) {
      const cardElement = { current: actualCard as HTMLElement }
      animateCreativeAssistantHover(cardElement, false)
    }
  }

  return (
    <div
      ref={cardRef}
      className={cn('transition-none', className)} // Disable CSS transitions, use GSAP
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <WorkflowCard {...props} />
    </div>
  )
}
