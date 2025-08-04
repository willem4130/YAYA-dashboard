'use client'

import { useRef, useEffect } from 'react'
import { useGSAPAnimations } from '@/hooks/useGSAPAnimations'

interface YayaLuxuryLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function YayaLuxuryLoader({ size = 'md', className = '' }: YayaLuxuryLoaderProps) {
  const loaderRef = useRef<HTMLDivElement>(null)
  const { createLoadingAnimation } = useGSAPAnimations()

  useEffect(() => {
    const animation = createLoadingAnimation(loaderRef)
    
    return () => {
      if (animation) {
        animation.kill()
      }
    }
  }, [createLoadingAnimation])

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        ref={loaderRef}
        className={`${sizeClasses[size]} border-2 border-primary/20 border-t-primary rounded-full`}
        aria-label="Loading..."
        role="status"
      />
    </div>
  )
}

interface YayaElegantSpinnerProps {
  className?: string
}

export function YayaElegantSpinner({ className = '' }: YayaElegantSpinnerProps) {
  const spinnerRef = useRef<HTMLDivElement>(null)
  const { createLoadingAnimation } = useGSAPAnimations()

  useEffect(() => {
    const animation = createLoadingAnimation(spinnerRef)
    
    return () => {
      if (animation) {
        animation.kill()
      }
    }
  }, [createLoadingAnimation])

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        ref={spinnerRef}
        className="relative w-10 h-10"
        aria-label="Loading..."
        role="status"
      >
        {/* YAYA-inspired elegant spinner design */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/10"></div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/50"></div>
        <div className="absolute inset-2 rounded-full border border-primary/20"></div>
        <div className="absolute inset-4 w-2 h-2 bg-primary rounded-full"></div>
      </div>
    </div>
  )
}