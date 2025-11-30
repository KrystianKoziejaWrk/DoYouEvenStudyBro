"use client"

import type React from "react"
import { useRef, useLayoutEffect, useState } from "react"
import { motion, useMotionValue, useAnimationFrame } from "motion/react"

interface ScrollVelocityProps {
  texts: string[]
  velocity?: number
  className?: string
  numCopies?: number
}

function useElementWidth<T extends HTMLElement>(ref: React.RefObject<T | null>): number {
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    function updateWidth() {
      if (ref.current) {
        setWidth(ref.current.offsetWidth)
      }
    }
    updateWidth()
    window.addEventListener("resize", updateWidth)
    return () => window.removeEventListener("resize", updateWidth)
  }, [ref])

  return width
}

function VelocityText({
  children,
  baseVelocity,
  className = "",
  numCopies = 6,
}: {
  children: React.ReactNode
  baseVelocity: number
  className?: string
  numCopies?: number
}) {
  const baseX = useMotionValue(0)
  const copyRef = useRef<HTMLSpanElement>(null)
  const copyWidth = useElementWidth(copyRef)

  function wrap(min: number, max: number, v: number): number {
    const range = max - min
    const mod = (((v - min) % range) + range) % range
    return mod + min
  }

  useAnimationFrame((_, delta) => {
    const moveBy = baseVelocity * (delta / 1000)
    baseX.set(baseX.get() + moveBy)
  })

  const spans = []
  for (let i = 0; i < numCopies; i++) {
    spans.push(
      <span className={`flex-shrink-0 ${className}`} key={i} ref={i === 0 ? copyRef : null}>
        {children}
      </span>,
    )
  }

  return (
    <div className="relative overflow-hidden">
      <motion.div
        className="flex whitespace-nowrap text-center font-sans text-4xl font-bold tracking-[-0.02em] drop-shadow md:text-[5rem] md:leading-[5rem]"
        style={{
          x: copyWidth > 0 ? (baseX.get() % copyWidth === 0 ? 0 : undefined) : 0,
          translateX: copyWidth > 0 ? `${wrap(-copyWidth, 0, baseX.get())}px` : 0,
        }}
        animate={{
          translateX: copyWidth > 0 ? [0, -copyWidth] : 0,
        }}
        transition={{
          translateX: {
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "loop",
            duration: copyWidth / Math.abs(baseVelocity),
            ease: "linear",
          },
        }}
      >
        {spans}
      </motion.div>
    </div>
  )
}

export const ScrollVelocity: React.FC<ScrollVelocityProps> = ({
  texts = [],
  velocity = 100,
  className = "",
  numCopies = 12,
}) => {
  // Calculate duration based on velocity (higher velocity = shorter duration)
  const duration = 30000 / velocity

  return (
    <section className="overflow-hidden">
      {texts.map((text: string, index: number) => {
        const direction = index % 2 === 0 ? 1 : -1

        return (
          <div key={index} className="relative overflow-hidden whitespace-nowrap">
            <div
              className="inline-flex will-change-transform"
              style={{
                animation: `marquee-${direction === 1 ? "left" : "right"} ${duration}s linear infinite`,
              }}
            >
              {Array.from({ length: numCopies }).map((_, i) => (
                <span
                  key={i}
                  className={`flex-shrink-0 text-4xl md:text-[5rem] md:leading-[5rem] font-bold tracking-[-0.02em] px-4 ${className}`}
                >
                  {text}
                </span>
              ))}
              {/* Duplicate set for seamless loop */}
              {Array.from({ length: numCopies }).map((_, i) => (
                <span
                  key={`dup-${i}`}
                  className={`flex-shrink-0 text-4xl md:text-[5rem] md:leading-[5rem] font-bold tracking-[-0.02em] px-4 ${className}`}
                >
                  {text}
                </span>
              ))}
            </div>
          </div>
        )
      })}
      <style jsx>{`
        @keyframes marquee-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes marquee-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  )
}

export default ScrollVelocity
