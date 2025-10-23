import { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import React from 'react'

/**
 * Performance optimization utilities for React components
 */

// Debounce hook for search inputs and API calls
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttle hook for scroll events and frequent updates
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastExecuted = useRef<number>(Date.now())

  useEffect(() => {
    if (Date.now() >= lastExecuted.current + delay) {
      lastExecuted.current = Date.now()
      setThrottledValue(value)
    } else {
      const timer = setTimeout(() => {
        lastExecuted.current = Date.now()
        setThrottledValue(value)
      }, delay)

      return () => clearTimeout(timer)
    }
  }, [value, delay])

  return throttledValue
}

// Memoized callback hook to prevent unnecessary re-renders
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef<T>(callback)
  
  useEffect(() => {
    callbackRef.current = callback
  })

  return useCallback((...args: any[]) => {
    return callbackRef.current(...args)
  }, []) as T
}

// Virtual scrolling hook for large lists
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight)
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    )
    
    return {
      start: Math.max(0, start - overscan),
      end,
    }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
    }))
  }, [items, visibleRange])

  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.start * itemHeight

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop,
  }
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true)
        }
      },
      options
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [elementRef, options, hasIntersected])

  return { isIntersecting, hasIntersected }
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0)
  const startTime = useRef<number>(Date.now())

  useEffect(() => {
    renderCount.current += 1
    const renderTime = Date.now() - startTime.current
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} render #${renderCount.current} took ${renderTime}ms`)
    }

    startTime.current = Date.now()
  })

  return {
    renderCount: renderCount.current,
  }
}

// Memory usage monitoring hook
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  } | null>(null)

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        })
      }
    }

    updateMemoryInfo()
    const interval = setInterval(updateMemoryInfo, 5000)

    return () => clearInterval(interval)
  }, [])

  return memoryInfo
}

// Bundle size optimization utilities
export const BundleOptimizations = {
  // Lazy load components
  lazy: <T extends React.ComponentType<any>>(
    importFunc: () => Promise<{ default: T }>
  ) => {
    return React.lazy(importFunc)
  },

  // Preload critical resources
  preload: (href: string, as: string) => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = href
    link.as = as
    document.head.appendChild(link)
  },

  // Prefetch resources for next navigation
  prefetch: (href: string) => {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = href
    document.head.appendChild(link)
  },
}

// Image optimization utilities
export const ImageOptimizations = {
  // Generate responsive image srcset
  generateSrcSet: (baseUrl: string, widths: number[]) => {
    return widths
      .map(width => `${baseUrl}?w=${width} ${width}w`)
      .join(', ')
  },

  // Generate WebP srcset with fallback
  generateWebPSrcSet: (baseUrl: string, widths: number[]) => {
    const webpSrcSet = widths
      .map(width => `${baseUrl}?w=${width}&f=webp ${width}w`)
      .join(', ')
    
    const fallbackSrcSet = widths
      .map(width => `${baseUrl}?w=${width} ${width}w`)
      .join(', ')

    return { webpSrcSet, fallbackSrcSet }
  },
}

// API optimization utilities
export const ApiOptimizations = {
  // Request deduplication
  requestCache: new Map<string, Promise<any>>(),

  deduplicateRequest: <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
    if (ApiOptimizations.requestCache.has(key)) {
      return ApiOptimizations.requestCache.get(key)!
    }

    const promise = requestFn()
    ApiOptimizations.requestCache.set(key, promise)
    
    promise.finally(() => {
      ApiOptimizations.requestCache.delete(key)
    })

    return promise
  },

  // Batch requests
  batchRequests: <T>(requests: (() => Promise<T>)[]): Promise<T[]> => {
    return Promise.all(requests.map(request => request()))
  },

  // Request cancellation
  createCancellableRequest: <T>(requestFn: (signal: AbortSignal) => Promise<T>) => {
    const controller = new AbortController()
    const request = requestFn(controller.signal)
    
    return {
      request,
      cancel: () => controller.abort(),
    }
  },
}
