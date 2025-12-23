import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import type { PromptBuilderData } from "@/components/prompt-builder/PromptBuilder"

interface Props {
  data: PromptBuilderData
  goToStep: (step: number) => void
  onNext: () => void
  onBack: () => void
}

export default function Step5Review({ data, onNext, onBack }: Props) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-black mb-6">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Go Back</span>
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center font-bold text-lg flex-shrink-0">
          5
        </div>
        <h2 className="text-3xl font-bold">Review Your Request</h2>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm text-gray-500 mb-1">Business Name</h3>
          <p className="font-medium">{data.businessName || "Not specified"}</p>
        </div>

        <div>
          <h3 className="text-sm text-gray-500 mb-1">Industry</h3>
          <p className="font-medium">{data.industry || "Not specified"}</p>
        </div>

        <div>
          <h3 className="text-sm text-gray-500 mb-1">Business Email</h3>
          <p className="font-medium">{data.email || "Not specified"}</p>
        </div>

        <div>
          <h3 className="text-sm text-gray-500 mb-2">Short Description</h3>
          <p className="font-normal text-sm">
            {data.description || "Not specified"}
            {data.description && data.description.length > 100 && (
              <button className="text-black font-medium ml-1">Read More</button>
            )}
          </p>
        </div>

        <div>
          <h3 className="text-sm text-gray-500 mb-2">Pages to include</h3>
          <div className="flex flex-wrap gap-2">
            {data.pages.map((page) => (
              <span key={page} className="px-4 py-2 border border-black rounded-full text-sm capitalize">
                {page}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm text-gray-500 mb-2">Visual Direction & Brand Feel</h3>
          <div className="flex flex-wrap gap-2">
            <span className="px-4 py-2 border border-black rounded-full text-sm capitalize">{data.theme}</span>
            <span className="px-4 py-2 border border-black rounded-full text-sm">{data.brandFeel}</span>
            {data.brandFeel !== "auto" && (
              <span className="px-4 py-2 border border-black rounded-full text-sm">Modern</span>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm text-gray-500 mb-2">Features</h3>
          <div className="flex flex-wrap gap-2">
            {data.features.map((feature) => (
              <span key={feature} className="px-4 py-2 border border-black rounded-full text-sm capitalize">
                {feature.replace(/-/g, " ")}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Button
        onClick={onNext}
        className="w-full bg-black text-white hover:bg-gray-800 h-14 rounded-lg text-base font-medium mt-8"
      >
        Build Website
      </Button>
    </div>
  )
}
