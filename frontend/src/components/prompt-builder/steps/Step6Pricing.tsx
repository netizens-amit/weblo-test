import { Button } from "@/components/ui/button"
import { ArrowLeft, Check } from "lucide-react"
import type { PromptBuilderData } from "@/components/prompt-builder/PromptBuilder"

interface Props {
  data: PromptBuilderData
  updateData: (fields: Partial<PromptBuilderData>) => void
  onNext: () => void
  onBack: () => void
}

export default function Step6Pricing({ data, updateData, onNext, onBack }: Props) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-black mb-6">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Go Back</span>
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center font-bold text-lg flex-shrink-0">
          6
        </div>
        <h2 className="text-3xl font-bold">Almost Done</h2>
      </div>

      <div className="space-y-4">
        {/* Starter Plan */}
        <button
          onClick={() => updateData({ selectedPlan: "starter" })}
          className={`w-full text-left p-6 rounded-lg border-2 transition-colors ${
            data.selectedPlan === "starter" ? "border-black bg-white" : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">Starter</h3>
              <p className="text-sm text-gray-600">Pay-per-build, ideal for 1-time website creation.</p>
            </div>
            <div className="text-2xl font-bold">$149</div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>1 AI-generated website (up to 5 pages recommended)</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Mobile-responsive design</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Basic SEO (titles, descriptions)</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Standard templates</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>14-day post-delivery edit window</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Email support (48–72 hr SLA)</span>
            </div>
          </div>
        </button>

        {/* Business Plan */}
        <button
          onClick={() => updateData({ selectedPlan: "business" })}
          className={`w-full text-left p-6 rounded-lg border-2 transition-colors ${
            data.selectedPlan === "business"
              ? "border-black bg-white"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">Business</h3>
              <p className="text-sm text-gray-600">Build up to 5 websites + export source code.</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">$39</div>
              <div className="text-sm text-gray-600">/ Month</div>
            </div>
          </div>
        </button>

        {/* Enterprise Plan */}
        <button
          onClick={() => updateData({ selectedPlan: "enterprise" })}
          className={`w-full text-left p-6 rounded-lg border-2 transition-colors ${
            data.selectedPlan === "enterprise"
              ? "border-black bg-white"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">Enterprise</h3>
              <p className="text-sm text-gray-600">Everything from above + white-label, SLA, and advanced features.</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">$79</div>
              <div className="text-sm text-gray-600">/ Month</div>
            </div>
          </div>
        </button>
      </div>

      <Button
        onClick={onNext}
        className="w-full bg-black text-white hover:bg-gray-800 h-14 rounded-lg text-base font-medium mt-8"
      >
        Continue to pay
      </Button>
    </div>
  )
}
