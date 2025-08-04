'use client'

import { useRef, forwardRef } from 'react'
import { Button } from '@/components/ui/button'
import { useGSAPAnimations } from '@/hooks/useGSAPAnimations'
import { cn } from '@/lib/utils'

interface YayaAnimatedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}

export const YayaAnimatedButton = forwardRef<
  HTMLButtonElement,
  YayaAnimatedButtonProps
>(
  (
    { className, onMouseDown, onMouseUp, onMouseLeave, children, ...props },
    ref
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null)
    const { animateButton } = useGSAPAnimations()

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      animateButton(buttonRef, true)
      onMouseDown?.(e)
    }

    const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
      animateButton(buttonRef, false)
      onMouseUp?.(e)
    }

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      animateButton(buttonRef, false)
      onMouseLeave?.(e)
    }

    return (
      <Button
        ref={node => {
          buttonRef.current = node
          if (typeof ref === 'function') {
            ref(node)
          } else if (ref) {
            ref.current = node
          }
        }}
        className={cn(
          'yaya-button transition-none', // Disable CSS transitions, use GSAP
          className
        )}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {children}
      </Button>
    )
  }
)

YayaAnimatedButton.displayName = 'YayaAnimatedButton'
