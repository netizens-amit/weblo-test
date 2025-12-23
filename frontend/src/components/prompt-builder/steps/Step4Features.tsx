import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Plus } from "lucide-react"
import type { PromptBuilderData } from "@/components/prompt-builder/PromptBuilder"

interface Props {
  data: PromptBuilderData
  updateData: (fields: Partial<PromptBuilderData>) => void
  onNext: () => void
  onBack: () => void
}

const AVAILABLE_FEATURES = [
  { id: "let-ai-decide", label: "Let AI Decide", disabled: false },
  { id: "contact-form", label: "Contact Form", disabled: false },
  { id: "photo-gallery", label: "Photo Gallery", disabled: false },
  { id: "blog", label: "Blog", disabled: false },
  { id: "booking", label: "Booking/Appointment System", disabled: false },
  { id: "testimonials", label: "Testimonials Section", disabled: false },
  { id: "ecommerce", label: "E-commerce Basic Setup", disabled: false },
  { id: "ai-text", label: "AI-Generated Text Content", disabled: false },
  { id: "ai-images", label: "AI-Generated Images", disabled: true, badge: "Coming Soon" },
]

export default function Step4Features({ data, updateData, onNext, onBack }: Props) {
  const toggleFeature = (featureId: string) => {
    const currentFeatures = data.features || []
    if (currentFeatures.includes(featureId)) {
      updateData({ features: currentFeatures.filter((f) => f !== featureId) })
    } else {
      updateData({ features: [...currentFeatures, featureId] })
    }
  }

  const isValid = data.features.length > 0

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-black mb-6">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Go Back</span>
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center font-bold text-lg flex-shrink-0">
          4
        </div>
        <h2 className="text-3xl font-bold">Features</h2>
      </div>

      <div className="space-y-3">
        {AVAILABLE_FEATURES.map((feature) => {
          const isChecked = data.features.includes(feature.id)
          return (
            <div key={feature.id} className="flex items-center gap-3">
              <Checkbox
                id={feature.id}
                checked={isChecked}
                disabled={feature.disabled}
                onCheckedChange={() => !feature.disabled && toggleFeature(feature.id)}
                className="w-5 h-5 rounded border-2 data-[state=checked]:bg-black data-[state=checked]:border-black disabled:opacity-50"
              />
              <label
                htmlFor={feature.id}
                className={`text-sm font-normal flex items-center gap-2 ${
                  feature.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                {feature.label}
                {feature.badge && (
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">{feature.badge}</span>
                )}
              </label>
            </div>
          )
        })}

        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mt-6">
          <Plus className="w-4 h-4" />
          Add More
        </button>
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
