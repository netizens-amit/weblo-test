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

const AVAILABLE_PAGES = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "services", label: "Services" },
  { id: "contact", label: "Contact" },
  { id: "gallery", label: "Gallery" },
  { id: "testimonials", label: "Testimonials" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
  { id: "blog", label: "Blog (optional)" },
  { id: "shop", label: "Shop (optional)" },
]

export default function Step2Pages({ data, updateData, onNext, onBack }: Props) {
  const togglePage = (pageId: string) => {
    const currentPages = data.pages || []
    if (currentPages.includes(pageId)) {
      updateData({ pages: currentPages.filter((p) => p !== pageId) })
    } else {
      updateData({ pages: [...currentPages, pageId] })
    }
  }

  const isValid = data.pages.length > 0

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-black mb-6">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Go Back</span>
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center font-bold text-lg flex-shrink-0">
          2
        </div>
        <h2 className="text-3xl font-bold">Customize Your Website</h2>
      </div>

      <div>
        <h3 className="font-semibold text-base mb-3">Pages to include</h3>
        <p className="text-sm text-gray-500 mb-4">Select the pages you want on your website</p>

        <div className="grid grid-cols-2 gap-3">
          {AVAILABLE_PAGES.map((page) => {
            const isChecked = data.pages.includes(page.id)
            return (
              <div key={page.id} className="flex items-center gap-3">
                <Checkbox
                  id={page.id}
                  checked={isChecked}
                  onCheckedChange={() => togglePage(page.id)}
                  className="w-5 h-5 rounded border-2 data-[state=checked]:bg-black data-[state=checked]:border-black"
                />
                <label htmlFor={page.id} className="text-sm font-normal cursor-pointer select-none">
                  {page.label}
                </label>
              </div>
            )
          })}
        </div>

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
