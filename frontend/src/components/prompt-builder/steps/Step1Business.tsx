import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { PromptBuilderData } from "@/components/prompt-builder/PromptBuilder"
import { validateStep1, countWords, type Step1ValidationErrors } from "@/lib/validation"

interface Props {
  data: PromptBuilderData
  updateData: (fields: Partial<PromptBuilderData>) => void
  onNext: () => void
}

const INDUSTRIES = [
  "E-commerce",
  "Technology",
  "Healthcare",
  "Education",
  "Real Estate",
  "Restaurant & Food",
  "Fashion & Beauty",
  "Fitness & Wellness",
  "Professional Services",
  "Creative & Arts",
  "Travel & Hospitality",
  "Non-Profit",
  "Other",
]

export default function Step1Business({ data, updateData, onNext }: Props) {
  const [errors, setErrors] = useState<Step1ValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Word count for description
  const descriptionWordCount = countWords(data.description)

  // Validate on data change (only show errors for touched fields)
  useEffect(() => {
    const validationErrors = validateStep1(data)
    setErrors(validationErrors)
  }, [data])

  const handleBlur = (field: keyof Step1ValidationErrors) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleNext = () => {
    // Mark all fields as touched
    setTouched({
      businessName: true,
      industry: true,
      description: true,
      email: true,
    })

    const validationErrors = validateStep1(data)
    setErrors(validationErrors)

    // Proceed only if no errors
    if (Object.keys(validationErrors).length === 0) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center font-bold text-lg flex-shrink-0">
          1
        </div>
        <h2 className="text-3xl font-bold">Tell Us About Your Business</h2>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-gray-500">Business Name</label>
        <Input
          placeholder="Enter your business name (at least 2 words)"
          value={data.businessName}
          onChange={(e) => updateData({ businessName: e.target.value })}
          onBlur={() => handleBlur("businessName")}
          className={`border-gray-300 h-12 rounded-lg ${touched.businessName && errors.businessName ? 'border-red-500' : ''}`}
        />
        {touched.businessName && errors.businessName && (
          <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm text-gray-500">Industry</label>
        <Select 
          value={data.industry} 
          onValueChange={(value) => {
            updateData({ industry: value })
            setTouched(prev => ({ ...prev, industry: true }))
          }}
        >
          <SelectTrigger className={`border-gray-300 h-12 rounded-lg ${touched.industry && errors.industry ? 'border-red-500' : ''}`}>
            <SelectValue placeholder="Select industry" />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRIES.map((industry) => (
              <SelectItem key={industry} value={industry}>
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {touched.industry && errors.industry && (
          <p className="text-red-500 text-xs mt-1">{errors.industry}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm text-gray-500">Short Description</label>
          <span className={`text-xs ${descriptionWordCount >= 150 ? 'text-green-600' : 'text-gray-400'}`}>
            {descriptionWordCount}/150 words {descriptionWordCount >= 150 && '✓'}
          </span>
        </div>
        <Textarea
          placeholder="Tell us about your business in detail... (minimum 150 words)"
          value={data.description}
          onChange={(e) => updateData({ description: e.target.value })}
          onBlur={() => handleBlur("description")}
          className={`border-gray-300 min-h-[160px] resize-none rounded-lg ${touched.description && errors.description ? 'border-red-500' : ''}`}
        />
        {touched.description && errors.description && (
          <p className="text-red-500 text-xs mt-1">{errors.description}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm text-gray-500">Business Email</label>
        <Input
          type="email"
          placeholder="email@example.com"
          value={data.email}
          onChange={(e) => updateData({ email: e.target.value })}
          onBlur={() => handleBlur("email")}
          className={`border-gray-300 h-12 rounded-lg ${touched.email && errors.email ? 'border-red-500' : ''}`}
        />
        {touched.email && errors.email && (
          <p className="text-red-500 text-xs mt-1">{errors.email}</p>
        )}
      </div>

      <Button
        onClick={handleNext}
        className="w-full bg-black text-white hover:bg-gray-800 h-14 rounded-lg text-base font-medium mt-8"
      >
        Next
      </Button>
    </div>
  )
}
