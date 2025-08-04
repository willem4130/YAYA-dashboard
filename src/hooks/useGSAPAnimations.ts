'use client'

import { useRef, useEffect, RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export const useGSAPAnimations = () => {
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    // Cleanup function to prevent memory leaks
    return () => {
      const timeline = timelineRef.current
      if (timeline !== null) {
        timeline.kill()
      }
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [])

  // 2025 Page Load Animation Sequence - Organic and Sophisticated
  const animatePageLoad = () => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) {
      // Immediate show for accessibility
      gsap.set(
        '[data-animate="header"], [data-animate="logo"], [data-animate="card"]',
        {
          opacity: 1,
          y: 0,
          scale: 1,
        }
      )
      return
    }

    const tl = gsap.timeline()
    timelineRef.current = tl

    // Set initial states
    gsap.set('[data-animate="header"]', { opacity: 0, y: -30 })
    gsap.set('[data-animate="logo"]', { opacity: 0, scale: 0.8, rotation: -5 })
    gsap.set('[data-animate="card"]', { opacity: 0, y: 50, scale: 0.95 })
    gsap.set('[data-animate="filter"]', { opacity: 0, x: -20 })

    // Luxurious reveal sequence
    tl.to('[data-animate="header"]', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
    })
      .to(
        '[data-animate="logo"]',
        {
          opacity: 1,
          scale: 1,
          rotation: 0,
          duration: 0.6,
          ease: 'back.out(1.2)',
        },
        '-=0.4'
      )
      .to(
        '[data-animate="filter"]',
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: 'power2.out',
        },
        '-=0.3'
      )
      .to(
        '[data-animate="card"]',
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          stagger: {
            amount: 0.6,
            from: 'start',
            ease: 'power2.out',
          },
          ease: 'power2.out',
        },
        '-=0.2'
      )
  }

  // Luxury Card Hover Effects - 3D Depth and Elegance
  const animateCardHover = (
    element: RefObject<HTMLElement>,
    isEntering: boolean
  ) => {
    if (!element.current) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) {
      // Simple opacity change for accessibility
      gsap.to(element.current, {
        opacity: isEntering ? 0.9 : 1,
        duration: 0.2,
      })
      return
    }

    if (isEntering) {
      gsap.to(element.current, {
        y: -8,
        scale: 1.02,
        rotationX: 2,
        rotationY: 1,
        boxShadow: '0 25px 50px -12px rgba(80, 64, 45, 0.25)',
        duration: 0.4,
        ease: 'power2.out',
        transformOrigin: 'center center',
        transformPerspective: 1000,
      })
    } else {
      gsap.to(element.current, {
        y: 0,
        scale: 1,
        rotationX: 0,
        rotationY: 0,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        duration: 0.4,
        ease: 'power2.out',
      })
    }
  }

  // Helper function for creative assistant hover enter animation
  const animateCreativeAssistantEnter = (
    card: HTMLElement,
    title: Element | null,
    description: Element | null,
    buttons: NodeListOf<Element>,
    badge: Element | null
  ) => {
    // Main card transformation
    gsap.to(card, {
      y: -12,
      scale: 1.03,
      rotationX: 3,
      rotationY: 2,
      boxShadow:
        '0 35px 70px -15px rgba(80, 64, 45, 0.4), 0 0 0 1px rgba(80, 64, 45, 0.1)',
      duration: 0.15,
      ease: 'power1.out',
      transformOrigin: 'center center',
      transformPerspective: 1200,
    })

    const tl = gsap.timeline()

    if (title) {
      tl.to(
        title,
        {
          textShadow: '0 0 20px rgba(80, 64, 45, 0.3)',
          letterSpacing: '0.02em',
          duration: 0.15,
          ease: 'power1.out',
        },
        0
      )
    }

    if (description) {
      tl.to(
        description,
        {
          y: -2,
          opacity: 0.9,
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          duration: 0.15,
          ease: 'power1.out',
        },
        0.05
      )
    }

    if (buttons.length > 0) {
      tl.to(
        buttons,
        {
          y: -3,
          scale: 1.02,
          boxShadow: '0 8px 25px -8px rgba(80, 64, 45, 0.3)',
          duration: 0.15,
          stagger: 0.02,
          ease: 'power1.out',
        },
        0.08
      )
    }

    if (badge) {
      tl.to(
        badge,
        {
          scale: 1.05,
          boxShadow: '0 4px 15px -4px rgba(80, 64, 45, 0.2)',
          duration: 0.15,
          ease: 'power1.out',
        },
        0.06
      )
    }

    gsap.to(card, {
      background:
        'linear-gradient(135deg, rgba(243,241,238,0.95) 0%, rgba(243,241,238,0.8) 50%, rgba(80,64,45,0.05) 100%)',
      duration: 0.2,
      ease: 'power1.out',
    })
  }

  // Helper function for creative assistant hover exit animation
  const animateCreativeAssistantExit = (
    card: HTMLElement,
    title: Element | null,
    description: Element | null,
    buttons: NodeListOf<Element>,
    badge: Element | null
  ) => {
    gsap.to(card, {
      y: 0,
      x: 0,
      scale: 1,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      boxShadow: 'none',
      background: 'none',
      duration: 0.4,
      ease: 'power2.out',
      clearProps: 'transform,background,boxShadow',
    })

    if (title) {
      gsap.to(title, {
        textShadow: 'none',
        letterSpacing: '0.04em',
        duration: 0.3,
        ease: 'power2.out',
        clearProps: 'textShadow,letterSpacing',
      })
    }

    if (description) {
      gsap.to(description, {
        y: 0,
        opacity: 1,
        textShadow: 'none',
        duration: 0.3,
        ease: 'power2.out',
        clearProps: 'transform,textShadow,opacity',
      })
    }

    if (buttons.length > 0) {
      gsap.to(buttons, {
        y: 0,
        scale: 1,
        boxShadow: 'none',
        duration: 0.3,
        stagger: 0.02,
        ease: 'power2.out',
        clearProps: 'transform,boxShadow',
      })
    }

    if (badge) {
      gsap.to(badge, {
        scale: 1,
        boxShadow: 'none',
        duration: 0.3,
        ease: 'power2.out',
        clearProps: 'transform,boxShadow',
      })
    }
  }

  // Special Enhanced Animation for YAYA Creative Assistant
  const animateCreativeAssistantHover = (
    element: RefObject<HTMLElement>,
    isEntering: boolean
  ) => {
    if (!element.current) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) {
      gsap.to(element.current, {
        opacity: isEntering ? 0.95 : 1,
        duration: 0.3,
      })
      return
    }

    const card = element.current
    const title = card.querySelector('.yaya-heading')
    const description = card.querySelector('.yaya-body')
    const buttons = card.querySelectorAll('button')
    const badge = card.querySelector('[class*="badge"]')

    if (isEntering) {
      animateCreativeAssistantEnter(card, title, description, buttons, badge)
    } else {
      animateCreativeAssistantExit(card, title, description, buttons, badge)
    }
  }

  // Sophisticated Search Bar Interactions
  const animateSearchFocus = (
    element: RefObject<HTMLElement>,
    isFocused: boolean
  ) => {
    if (!element.current) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) return

    if (isFocused) {
      gsap.to(element.current, {
        scale: 1.02,
        borderColor: 'rgb(80, 64, 45)', // YAYA brown
        duration: 0.3,
        ease: 'power2.out',
      })
    } else {
      gsap.to(element.current, {
        scale: 1,
        borderColor: 'hsl(35, 8%, 85%)', // Default border
        duration: 0.3,
        ease: 'power2.out',
      })
    }
  }

  // Elegant Button Micro-interactions
  const animateButton = (
    element: RefObject<HTMLElement>,
    isPressed: boolean
  ) => {
    if (!element.current) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) return

    if (isPressed) {
      gsap.to(element.current, {
        scale: 0.98,
        letterSpacing: '0.05em',
        duration: 0.15,
        ease: 'power2.out',
      })
    } else {
      gsap.to(element.current, {
        scale: 1,
        letterSpacing: '0.1em',
        duration: 0.15,
        ease: 'power2.out',
      })
    }
  }

  // Fashion Magazine Header Button Animations - Premium Editorial Style
  const animateHeaderButton = (
    element: RefObject<HTMLElement>,
    isHovering: boolean
  ) => {
    if (!element.current) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) {
      gsap.to(element.current, {
        opacity: isHovering ? 0.8 : 1,
        duration: 0.2,
      })
      return
    }

    if (isHovering) {
      // Sophisticated hover: lift, glow, and refined spacing
      gsap.to(element.current, {
        y: -2,
        scale: 1.02,
        letterSpacing: '0.12em',
        textShadow: '0 2px 8px rgba(80, 64, 45, 0.15)',
        boxShadow:
          '0 8px 32px -8px rgba(80, 64, 45, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
        duration: 0.3,
        ease: 'power2.out',
      })
    } else {
      gsap.to(element.current, {
        y: 0,
        scale: 1,
        letterSpacing: '0.1em',
        textShadow: 'none',
        boxShadow: '0 4px 12px -4px rgba(80, 64, 45, 0.15)',
        duration: 0.4,
        ease: 'power2.out',
      })
    }
  }

  // Premium Button Press Animation - Fashion Magazine Quality
  const animateHeaderButtonPress = (element: RefObject<HTMLElement>) => {
    if (!element.current) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) return

    // Immediate press feedback with elegant recovery
    gsap.to(element.current, {
      scale: 0.96,
      y: 1,
      duration: 0.1,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(element.current, {
          scale: 1.02,
          y: -2,
          duration: 0.2,
          ease: 'back.out(1.4)',
        })
      },
    })
  }

  // Scroll-Triggered Reveals - Modern 2025 Style
  const setupScrollAnimations = () => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) return

    // Animate elements as they enter viewport
    gsap.utils.toArray('[data-scroll-animate]').forEach((element: any) => {
      gsap.fromTo(
        element,
        {
          opacity: 0,
          y: 50,
          scale: 0.95,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 80%',
            end: 'bottom 20%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    })
  }

  // Sophisticated Loading Animation
  const createLoadingAnimation = (element: RefObject<HTMLElement>) => {
    if (!element.current) return null

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) {
      // Simple pulse for accessibility
      return gsap.to(element.current, {
        opacity: 0.6,
        duration: 1,
        yoyo: true,
        repeat: -1,
        ease: 'power2.inOut',
      })
    }

    // Luxury rotating animation
    return gsap.to(element.current, {
      rotation: 360,
      duration: 2,
      repeat: -1,
      ease: 'none',
      transformOrigin: 'center center',
    })
  }

  // Organic Stagger Animation for Lists
  const animateList = (elements: NodeListOf<Element> | Element[]) => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) {
      gsap.set(elements, { opacity: 1, y: 0 })
      return
    }

    gsap.fromTo(
      elements,
      {
        opacity: 0,
        y: 30,
        scale: 0.98,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        stagger: {
          amount: 0.8,
          from: 'start',
          ease: 'power2.out',
        },
        ease: 'power2.out',
      }
    )
  }

  return {
    animatePageLoad,
    animateCardHover,
    animateCreativeAssistantHover,
    animateSearchFocus,
    animateButton,
    animateHeaderButton,
    animateHeaderButtonPress,
    setupScrollAnimations,
    createLoadingAnimation,
    animateList,
  }
}

export default useGSAPAnimations
