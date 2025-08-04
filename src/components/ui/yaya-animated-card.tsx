'use client'

import { useRef } from 'react'
import { Card } from '@/components/ui/card'
import { useGSAPAnimations } from '@/hooks/useGSAPAnimations'
import { cn } from '@/lib/utils'

interface YayaAnimatedCardProps {
  children: React.ReactNode
  className?: string
  enableHover?: boolean
  enableScroll?: boolean
}

export function YayaAnimatedCard({ 
  children, 
  className = '',
  enableHover = true,
  enableScroll = false
}: YayaAnimatedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { animateCardHover } = useGSAPAnimations()

  const handleMouseEnter = () => {
    if (enableHover) {
      animateCardHover(cardRef, true)
    }
  }

  const handleMouseLeave = () => {
    if (enableHover) {
      animateCardHover(cardRef, false)
    }
  }

  return (
    <Card
      ref={cardRef}
      className={cn(
        'yaya-luxury-card transition-none', // Disable CSS transitions, use GSAP
        enableScroll && 'data-scroll-animate',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-scroll-animate={enableScroll ? '' : undefined}
    >
      {children}
    </Card>
  )
}