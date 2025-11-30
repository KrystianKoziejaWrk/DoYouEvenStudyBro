"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
}

export default function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [hue, setHue] = useState(0)
  const [saturation, setSaturation] = useState(100)
  const [lightness, setLightness] = useState(50)
  const [isDraggingSpectrum, setIsDraggingSpectrum] = useState(false)
  const [isDraggingHue, setIsDraggingHue] = useState(false)
  const spectrumRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  const presetColors = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#10b981",
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
    "#ffffff",
    "#a1a1aa",
    "#000000",
  ]

  // Parse initial color to HSL
  useEffect(() => {
    const hex = color.replace("#", "")
    const r = Number.parseInt(hex.substr(0, 2), 16) / 255
    const g = Number.parseInt(hex.substr(2, 2), 16) / 255
    const b = Number.parseInt(hex.substr(4, 2), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6
          break
        case g:
          h = ((b - r) / d + 2) / 6
          break
        case b:
          h = ((r - g) / d + 4) / 6
          break
      }
    }

    setHue(Math.round(h * 360))
    setSaturation(Math.round(s * 100))
    setLightness(Math.round(l * 100))
  }, [])

  const hslToHex = useCallback((h: number, s: number, l: number) => {
    s /= 100
    l /= 100
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => {
      const k = (n + h / 30) % 12
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0")
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }, [])

  const updateColor = useCallback(
    (h: number, s: number, l: number) => {
      const hex = hslToHex(h, s, l)
      onChange(hex)
    },
    [hslToHex, onChange],
  )

  const handleSpectrumInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (!spectrumRef.current) return
      const rect = spectrumRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
      const y = Math.max(0, Math.min(clientY - rect.top, rect.height))

      const newSat = Math.round((x / rect.width) * 100)
      const newLight = Math.round(100 - (y / rect.height) * 100)

      setSaturation(newSat)
      setLightness(newLight)
      updateColor(hue, newSat, newLight)
    },
    [hue, updateColor],
  )

  const handleHueInteraction = useCallback(
    (clientX: number) => {
      if (!hueRef.current) return
      const rect = hueRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
      const newHue = Math.round((x / rect.width) * 360)

      setHue(newHue)
      updateColor(newHue, saturation, lightness)
    },
    [saturation, lightness, updateColor],
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSpectrum) {
        handleSpectrumInteraction(e.clientX, e.clientY)
      } else if (isDraggingHue) {
        handleHueInteraction(e.clientX)
      }
    }

    const handleMouseUp = () => {
      setIsDraggingSpectrum(false)
      setIsDraggingHue(false)
    }

    if (isDraggingSpectrum || isDraggingHue) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDraggingSpectrum, isDraggingHue, handleSpectrumInteraction, handleHueInteraction])

  const currentColor = hslToHex(hue, saturation, lightness)

  return (
    <div className="space-y-4">
      {/* Color spectrum */}
      <div
        ref={spectrumRef}
        className="relative w-full h-40 rounded-lg cursor-crosshair overflow-hidden"
        style={{
          background: `
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))
          `,
        }}
        onMouseDown={(e) => {
          setIsDraggingSpectrum(true)
          handleSpectrumInteraction(e.clientX, e.clientY)
        }}
      >
        {/* Picker indicator */}
        <div
          className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${saturation}%`,
            top: `${100 - lightness}%`,
            backgroundColor: currentColor,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3)",
          }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        className="relative w-full h-4 rounded-full cursor-pointer"
        style={{
          background: "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
        }}
        onMouseDown={(e) => {
          setIsDraggingHue(true)
          handleHueInteraction(e.clientX)
        }}
      >
        <div
          className="absolute w-5 h-5 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 top-1/2 pointer-events-none"
          style={{
            left: `${(hue / 360) * 100}%`,
            backgroundColor: `hsl(${hue}, 100%, 50%)`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3)",
          }}
        />
      </div>

      {/* Current color preview and hex */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-lg border border-white/20 shadow-inner"
          style={{ backgroundColor: currentColor }}
        />
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-1">Selected Color</p>
          <p className="text-white font-mono text-lg uppercase">{currentColor}</p>
        </div>
      </div>

      {/* Preset colors */}
      <div>
        <p className="text-xs text-gray-400 mb-2">Presets</p>
        <div className="grid grid-cols-10 gap-2">
          {presetColors.map((presetColor) => (
            <button
              key={presetColor}
              className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${
                currentColor.toLowerCase() === presetColor.toLowerCase()
                  ? "border-white ring-2 ring-white/50"
                  : "border-white/20"
              }`}
              style={{ backgroundColor: presetColor }}
              onClick={() => {
                onChange(presetColor)
                // Parse and set HSL values
                const hex = presetColor.replace("#", "")
                const r = Number.parseInt(hex.substr(0, 2), 16) / 255
                const g = Number.parseInt(hex.substr(2, 2), 16) / 255
                const b = Number.parseInt(hex.substr(4, 2), 16) / 255
                const max = Math.max(r, g, b)
                const min = Math.min(r, g, b)
                let h = 0
                let s = 0
                const l = (max + min) / 2
                if (max !== min) {
                  const d = max - min
                  s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
                  switch (max) {
                    case r:
                      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
                      break
                    case g:
                      h = ((b - r) / d + 2) / 6
                      break
                    case b:
                      h = ((r - g) / d + 4) / 6
                      break
                  }
                }
                setHue(Math.round(h * 360))
                setSaturation(Math.round(s * 100))
                setLightness(Math.round(l * 100))
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
