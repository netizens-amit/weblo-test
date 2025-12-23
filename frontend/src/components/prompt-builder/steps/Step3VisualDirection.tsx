import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles, Palette } from "lucide-react"
import type { PromptBuilderData } from "@/components/prompt-builder/PromptBuilder"
import { DEFAULT_COLORS, type ColorScheme } from "@/lib/colors"
import { useEffect } from "react"

interface Props {
  data: PromptBuilderData
  updateData: (fields: Partial<PromptBuilderData>) => void
  onNext: () => void
  onBack: () => void
}

const BRAND_FEELS = ["Modern", "Minimal", "Professional", "Corporate", "Colourful", "Monochrome", "Playful", "Elegant"]

// Color input component
function ColorInput({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer overflow-hidden flex-shrink-0 relative"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <input
          type="text"
          value={value.toUpperCase()}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full mt-1 px-2 py-1 text-xs border border-gray-200 rounded bg-gray-50 font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  )
}

export default function Step3VisualDirection({ data, updateData, onNext, onBack }: Props) {
  const isValid = data.theme && data.brandFeel

  // Ensure colors exists with defaults
  const colors = data.colors || DEFAULT_COLORS[data.theme] || DEFAULT_COLORS.auto
  const useCustomColors = data.useCustomColors ?? false

  // Initialize colors if not present
  useEffect(() => {
    if (!data.colors) {
      updateData({
        colors: DEFAULT_COLORS[data.theme] || DEFAULT_COLORS.auto,
        useCustomColors: false
      })
    }
  }, [])

  // Auto-update background/foreground when theme changes
  useEffect(() => {
    if (!useCustomColors && data.theme !== 'auto') {
      const themeColors = DEFAULT_COLORS[data.theme]
      if (themeColors) {
        updateData({
          colors: { ...colors, ...themeColors }
        })
      }
    }
  }, [data.theme])

  const handleColorChange = (colorKey: keyof ColorScheme, value: string) => {
    updateData({
      colors: { ...colors, [colorKey]: value }
    })
  }

  const toggleCustomColors = () => {
    updateData({ useCustomColors: !useCustomColors })
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-black mb-6">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Go Back</span>
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center font-bold text-lg flex-shrink-0">
          3
        </div>
        <h2 className="text-3xl font-bold">Visual Direction</h2>
      </div>

      {/* Theme Selection */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => updateData({ theme: "auto" })}
            className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${data.theme === "auto"
              ? "bg-gray-200 border-2 border-gray-400"
              : "bg-gray-100 border border-gray-200 hover:bg-gray-200"
              }`}
          >
            <Sparkles className="w-4 h-4" />
            Let AI Decide
          </button>
          <button
            onClick={() => updateData({ theme: "dark" })}
            className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${data.theme === "dark"
              ? "bg-gray-200 border-2 border-gray-400"
              : "bg-gray-100 border border-gray-200 hover:bg-gray-200"
              }`}
          >
            Dark
          </button>
          <button
            onClick={() => updateData({ theme: "light" })}
            className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${data.theme === "light"
              ? "bg-gray-200 border-2 border-gray-400"
              : "bg-gray-100 border border-gray-200 hover:bg-gray-200"
              }`}
          >
            Light
          </button>
        </div>
      </div>

      {/* Brand Feel Section */}
      <div className="space-y-4 mt-8">
        <h3 className="font-semibold text-base">Brand Feel</h3>

        <button
          onClick={() => updateData({ brandFeel: "auto" })}
          className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${data.brandFeel === "auto"
            ? "bg-gray-200 border-2 border-gray-400"
            : "bg-gray-100 border border-gray-200 hover:bg-gray-200"
            }`}
        >
          <Sparkles className="w-4 h-4" />
          Let AI Decide
        </button>

        <div className="grid grid-cols-4 gap-3">
          {BRAND_FEELS.map((feel) => (
            <button
              key={feel}
              onClick={() => updateData({ brandFeel: feel })}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-2 text-sm font-medium transition-colors ${data.brandFeel === feel
                ? "bg-gray-200 border-2 border-gray-400"
                : "bg-gray-100 border border-gray-200 hover:bg-gray-200"
                }`}
            >
              <div className="w-full h-16 bg-gray-300 rounded mb-2"></div>
              {feel}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Colors Section */}
      <div className="space-y-4 mt-8">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Custom Colors
          </h3>
          <button
            onClick={toggleCustomColors}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${useCustomColors
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
          >
            {useCustomColors ? "Using Custom" : "Let AI Decide"}
          </button>
        </div>

        {useCustomColors && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ColorInput
                label="Primary"
                value={colors.primary}
                onChange={(c) => handleColorChange('primary', c)}
              />
              <ColorInput 
                label="Secondary"
                value={colors.secondary}
                onChange={(c) => handleColorChange('secondary', c)}
              />
              <ColorInput
                label="Accent"
                value={colors.accent}
                onChange={(c) => handleColorChange('accent', c)}
              />
              <ColorInput
                label="Background"
                value={colors.background}
                onChange={(c) => handleColorChange('background', c)}
              />
              <ColorInput
                label="Foreground"
                value={colors.foreground}
                onChange={(c) => handleColorChange('foreground', c)}
              />
            </div>

            {/* Color Preview */}
            <div className="mt-4 p-4 rounded-lg border-2 border-gray-200" style={{ backgroundColor: colors.background }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: colors.primary }}></div>
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: colors.secondary }}></div>
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: colors.accent }}></div>
              </div>
              <p className="text-sm font-medium" style={{ color: colors.foreground }}>
                Preview: {data.businessName || "Your Website"}
              </p>
              <p className="text-xs mt-1" style={{ color: colors.foreground, opacity: 0.7 }}>
                This is how your text will look
              </p>
              <button
                className="mt-3 px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: colors.primary }}
              >
                Primary Button
              </button>
            </div>
          </div>
        )}
      </div>

      <Button
        onClick={onNext}
        disabled={!isValid}
        className="w-full bg-black text-white hover:bg-gray-800 h-14 rounded-lg text-base font-medium mt-8"
      >
        Next
      </Button>
    </div>
  )
}

