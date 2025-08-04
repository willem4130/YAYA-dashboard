'use client'

import { useRef, forwardRef } from 'react'
import { Input } from '@/components/ui/input'
import { useGSAPAnimations } from '@/hooks/useGSAPAnimations'
import { cn } from '@/lib/utils'

interface YayaAnimatedSearchProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export const YayaAnimatedSearch = forwardRef<
  HTMLInputElement,
  YayaAnimatedSearchProps
>(({ className, onFocus, onBlur, ...props }, ref) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const { animateSearchFocus } = useGSAPAnimations()

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    animateSearchFocus(inputRef, true)
    onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    animateSearchFocus(inputRef, false)
    onBlur?.(e)
  }

  return (
    <Input
      ref={node => {
        inputRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      }}
      className={cn(
        'yaya-search-input transition-none', // Disable CSS transitions, use GSAP
        className
      )}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    />
  )
})

YayaAnimatedSearch.displayName = 'YayaAnimatedSearch'
