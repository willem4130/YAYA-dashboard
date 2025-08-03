'use client'

import { useState, useEffect } from 'react'
import { Card } from './card'
import { Button } from './button'
import { X, Sparkles, Leaf, Sun, Snowflake } from 'lucide-react'

interface SeasonalBannerProps {
  season?: 'spring' | 'summer' | 'autumn' | 'winter'
  onDismiss?: () => void
  className?: string
}

// YAYA seasonal content and colors
const seasonalContent = {
  spring: {
    icon: Leaf,
    title: 'Spring 2024 Collection',
    subtitle: 'Natural Elegance Awakening',
    description:
      'Embrace the gentle renewal of spring with flowing silhouettes and organic textures that speak to conscious craftsmanship.',
    color: 'yaya-spring',
    bgGradient: 'from-green-50 to-emerald-50',
    accentColor: 'text-emerald-700',
    features: [
      'Organic Cotton Essentials',
      'Artisan Collaboration Pieces',
      'Sustainable Dyeing Techniques',
    ],
  },
  summer: {
    icon: Sun,
    title: 'Summer 2024 Collection',
    subtitle: 'Effortless Sophistication',
    description:
      'Lightweight luxury meets timeless design in pieces crafted for the conscious modern woman.',
    color: 'yaya-summer',
    bgGradient: 'from-amber-50 to-yellow-50',
    accentColor: 'text-amber-700',
    features: [
      'Linen & Hemp Blends',
      'Natural Sun Protection',
      'Breathable Luxury Fabrics',
    ],
  },
  autumn: {
    icon: Sparkles,
    title: 'Autumn 2024 Collection',
    subtitle: 'Refined Transitions',
    description:
      'Rich textures and warm tones celebrate the season of thoughtful dressing and artisan craftsmanship.',
    color: 'yaya-autumn',
    bgGradient: 'from-orange-50 to-amber-50',
    accentColor: 'text-orange-700',
    features: [
      'Heritage Wool Blends',
      'Artisan Knitwear',
      'Transitional Layering',
    ],
  },
  winter: {
    icon: Snowflake,
    title: 'Winter 2024 Collection',
    subtitle: 'Conscious Comfort',
    description:
      'Enveloping warmth through sustainable materials and timeless silhouettes for the mindful wardrobe.',
    color: 'yaya-winter',
    bgGradient: 'from-slate-50 to-blue-50',
    accentColor: 'text-slate-700',
    features: [
      'Recycled Cashmere',
      'Eco-Insulation Technology',
      'Timeless Outerwear',
    ],
  },
}

export function SeasonalBanner({
  season = 'spring',
  onDismiss,
  className = '',
}: SeasonalBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [currentSeason, setCurrentSeason] = useState(season)

  // Auto-detect season based on current date
  useEffect(() => {
    const now = new Date()
    const month = now.getMonth() + 1 // 0-indexed to 1-indexed

    let detectedSeason: keyof typeof seasonalContent
    if (month >= 3 && month <= 5) detectedSeason = 'spring'
    else if (month >= 6 && month <= 8) detectedSeason = 'summer'
    else if (month >= 9 && month <= 11) detectedSeason = 'autumn'
    else detectedSeason = 'winter'

    setCurrentSeason(detectedSeason)
  }, [])

  const content = seasonalContent[currentSeason]
  const IconComponent = content.icon

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible) return null

  return (
    <Card
      className={`
      relative overflow-hidden yaya-card border-0 
      bg-gradient-to-r ${content.bgGradient} 
      ${className}
    `}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 yaya-linen-texture" />
      </div>

      {/* Content */}
      <div className="relative p-6 lg:p-8">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            {/* Seasonal Icon */}
            <div
              className={`
              flex-shrink-0 w-12 h-12 rounded-sm 
              bg-white/70 backdrop-blur-sm
              flex items-center justify-center
              shadow-sm
            `}
            >
              <IconComponent className={`w-6 h-6 ${content.accentColor}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="yaya-heading text-lg font-medium text-foreground">
                  {content.title}
                </h3>
                <span
                  className={`
                  text-xs px-2 py-1 rounded-full 
                  bg-white/60 backdrop-blur-sm
                  ${content.accentColor} font-medium
                  yaya-subheading
                `}
                >
                  {currentSeason.charAt(0).toUpperCase() +
                    currentSeason.slice(1)}
                </span>
              </div>

              <h4
                className={`
                yaya-subheading text-sm font-medium mb-3
                ${content.accentColor}
              `}
              >
                {content.subtitle}
              </h4>

              <p className="yaya-body text-sm text-muted-foreground mb-4 leading-relaxed">
                {content.description}
              </p>

              {/* Features */}
              <div className="hidden sm:flex flex-wrap gap-2">
                {content.features.map((feature, index) => (
                  <span
                    key={index}
                    className="
                      text-xs px-3 py-1 rounded-full
                      bg-white/60 backdrop-blur-sm
                      text-muted-foreground
                      yaya-body border border-white/50
                    "
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-start space-x-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              className={`
                hidden sm:inline-flex yaya-button
                bg-white/60 backdrop-blur-sm
                hover:bg-white/80
                ${content.accentColor}
                border border-white/50
              `}
            >
              Explore Collection
            </Button>

            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="
                  w-8 h-8 p-0 rounded-sm
                  bg-white/60 backdrop-blur-sm
                  hover:bg-white/80
                  text-muted-foreground hover:text-foreground
                  border border-white/50
                "
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Decorative Element */}
      <div
        className={`
        absolute bottom-0 left-0 right-0 h-1 
        bg-gradient-to-r from-transparent via-white/30 to-transparent
      `}
      />
    </Card>
  )
}
