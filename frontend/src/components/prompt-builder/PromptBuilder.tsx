import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ProgressIndicator } from "@/components/prompt-builder/ProgressIndicator"
import Step1Business from "@/components/prompt-builder/steps/Step1Business"
import Step2Pages from "@/components/prompt-builder/steps/Step2Pages"
import Step3VisualDirection from "@/components/prompt-builder/steps/Step3VisualDirection"
import Step4Features from "@/components/prompt-builder/steps/Step4Features"
import Step5Review from "@/components/prompt-builder/steps/Step5Review"
import Step6Pricing from "@/components/prompt-builder/steps/Step6Pricing"
import Step7Payment from "@/components/prompt-builder/steps/Step7Payment"
import { savePromptBuilderData, loadPromptBuilderData, clearPromptBuilderData } from "@/lib/cookies"
import { DEFAULT_COLORS, type ColorScheme } from "@/lib/colors"
import { useAppDispatch } from "@/store/hooks"
import { createProject } from "@/store/slices/projectSlice"
import { toast } from "sonner"

// Re-export ColorScheme for backwards compatibility
export type { ColorScheme }

export interface PromptBuilderData {
  businessName: string
  industry: string
  description: string
  email: string
  pages: string[]
  theme: "light" | "dark" | "auto"
  brandFeel: string
  colors: ColorScheme
  useCustomColors: boolean  // If false, AI decides colors
  features: string[]
  selectedPlan: "starter" | "business" | "enterprise"
  paymentDetails?: {
    cardNumber: string
    expirationDate: string
    securityCode: string
    fullName: string
    country: string
    addressLine1: string
    addressLine2: string
    city: string
    state: string
    zipcode: string
  }
}

const INITIAL_DATA: PromptBuilderData = {
  businessName: "",
  industry: "",
  description: "",
  email: "",
  pages: [],
  theme: "auto",
  brandFeel: "",
  colors: DEFAULT_COLORS.auto,
  useCustomColors: false,
  features: [],
  selectedPlan: "starter",
}


export default function PromptBuilder() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<PromptBuilderData>(INITIAL_DATA)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const totalSteps = 7

  // Load saved data from cookies on mount
  useEffect(() => {
    const savedData = loadPromptBuilderData()
    if (savedData) {
      setData({
        businessName: savedData.businessName || "",
        industry: savedData.industry || "",
        description: savedData.description || "",
        email: savedData.email || "",
        pages: savedData.pages || [],
        theme: savedData.theme || "auto",
        brandFeel: savedData.brandFeel || "",
        colors: savedData.colors || DEFAULT_COLORS[savedData.theme || 'auto'] || DEFAULT_COLORS.auto,
        useCustomColors: savedData.useCustomColors ?? false,
        features: savedData.features || [],
        selectedPlan: savedData.selectedPlan || "starter",
        paymentDetails: savedData.paymentDetails,
      })
      toast.info("Previous session restored", {
        description: "We've restored your previous progress.",
        duration: 3000,
      })
    }
    setIsLoaded(true)
  }, [])

  // Save data to cookies whenever it changes
  useEffect(() => {
    if (isLoaded) {
      savePromptBuilderData(data)
    }
  }, [data, isLoaded])

  const updateData = (fields: Partial<PromptBuilderData>) => {
    setData((prev) => ({ ...prev, ...fields }))
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const goToStep = (step: number) => {
    setCurrentStep(step)
  }

  const handleBuildWebsite = async () => {
    setIsGenerating(true)

    try {
      // Build the prompt from collected data
      const prompt = buildPromptFromData(data)

      // Create the project with preferences
      const result = await dispatch(createProject({
        name: data.businessName,
        prompt: prompt,
        preferences: {
          businessName: data.businessName,
          industry: data.industry,
          description: data.description,
          email: data.email,
          pages: data.pages,
          theme: data.theme,
          brandFeel: data.brandFeel,
          features: data.features,
          selectedPlan: data.selectedPlan,
        }
      })).unwrap()

      // Clear cookies on successful generation start
      clearPromptBuilderData()

      toast.success("Website generation started!", {
        description: "Redirecting to the editor...",
      })

      // Navigate to the editor page
      navigate(`/project/${result.id}`)

    } catch (error: any) {
      console.error("Failed to create project:", error)
      toast.error("Failed to start generation", {
        description: error?.message || "Please try again.",
      })
      setIsGenerating(false)
    }
  }

  // Build a comprehensive prompt from the collected data
  const buildPromptFromData = (data: PromptBuilderData): string => {
    const pagesList = data.pages.join(", ")
    const featuresList = data.features
      .filter(f => f !== 'let-ai-decide')
      .map(f => f.replace(/-/g, " "))
      .join(", ")

    const hasLetAiDecide = data.features.includes('let-ai-decide')

    const parts: string[] = []

    // Business info
    parts.push(`Create a ${data.theme !== 'auto' ? data.theme + '-themed' : ''} ${data.brandFeel !== 'auto' ? data.brandFeel : ''} website for "${data.businessName}"`)
    parts.push(`Industry: ${data.industry}`)
    parts.push(`Description: ${data.description}`)

    // Pages
    if (data.pages.length > 0) {
      parts.push(`Pages: ${pagesList}`)
    }

    // Theme
    if (data.theme === 'auto') {
      parts.push(`Theme: Let AI decide the best theme based on industry`)
    } else {
      parts.push(`Theme: ${data.theme}`)
    }

    // Brand feel
    if (data.brandFeel === 'auto') {
      parts.push(`Brand Style: Let AI decide based on industry`)
    } else if (data.brandFeel) {
      parts.push(`Brand Style: ${data.brandFeel}`)
    }

    // Custom colors (if enabled)
    if (data.useCustomColors && data.colors) {
      parts.push(`Custom Colors:`)
      parts.push(`- Primary: ${data.colors.primary}`)
      parts.push(`- Secondary: ${data.colors.secondary}`)
      parts.push(`- Accent: ${data.colors.accent}`)
      parts.push(`- Background: ${data.colors.background}`)
      parts.push(`- Foreground: ${data.colors.foreground}`)
    }

    // Features
    if (hasLetAiDecide && featuresList.length === 0) {
      parts.push(`Features: Let AI decide appropriate features for this business`)
    } else if (featuresList) {
      parts.push(`Must include features: ${featuresList}`)
    }

    parts.push(`Contact: ${data.email}`)

    return parts.join('\n')
  }

  const handleExit = () => {
    navigate("/projects")
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Business data={data} updateData={updateData} onNext={nextStep} />
      case 2:
        return <Step2Pages data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />
      case 3:
        return <Step3VisualDirection data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />
      case 4:
        return <Step4Features data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />
      case 5:
        return <Step5Review data={data} goToStep={goToStep} onNext={nextStep} onBack={prevStep} />
      case 6:
        return <Step6Pricing data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />
      case 7:
        return <Step7Payment data={data} updateData={updateData} onBack={prevStep} onSubmit={handleBuildWebsite} isGenerating={isGenerating} />
      default:
        return null
    }
  }

  // Show loading state while restoring data
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin"></div>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">{"\\"} Weblo.</h2>
          <p className="text-gray-600">Creating your website...</p>
          <p className="text-sm text-gray-400 mt-2">This may take a few moments</p>
        </div>
      </div>
    )
  }

  // Payment step has different layout
  if (currentStep === 7) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold">{"\\"} Weblo.</div>
          <Button variant="ghost" onClick={handleExit} className="bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-6">
            Exit
          </Button>
        </header>
        {renderStep()}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="text-2xl font-bold">{"\\"} Weblo.</div>
        <Button variant="ghost" onClick={handleExit} className="bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-6">
          Exit
        </Button>
      </header>

      <div className="flex">
        {/* Left Sidebar - Form */}
        <div className="w-[590px] border-r min-h-[calc(100vh-73px)] relative">
          <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />
          <div className="pl-24 pr-8 py-12">{renderStep()}</div>
        </div>

        {/* Right Preview Area */}
        <div className="flex-1 bg-gray-100 p-8 flex items-center justify-center">
          {currentStep === 1 && (
            <div className="text-center">
              <p className="text-gray-500 text-lg">Illustrations</p>
            </div>
          )}
          {(currentStep === 2 || currentStep === 3 || currentStep === 4 || currentStep === 5) && (
            <div className="w-full max-w-5xl">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div
                  className={`p-4 flex items-center justify-between ${data.theme === "dark" ? "bg-gray-700" : "bg-gray-200"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded ${data.theme === "dark" ? "bg-white" : "bg-black"
                        } flex items-center justify-center`}
                    >
                      <span className={`italic text-sm ${data.theme === "dark" ? "text-gray-400" : "text-gray-400"}`}>
                        Logo
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`h-0.5 w-12 rounded ${data.theme === "dark" ? "bg-white" : "bg-black"}`}></div>
                    <div className={`h-0.5 w-12 rounded ${data.theme === "dark" ? "bg-white" : "bg-black"}`}></div>
                    <div className={`h-0.5 w-12 rounded ${data.theme === "dark" ? "bg-white" : "bg-black"}`}></div>
                    <div className={`px-6 py-2 rounded ${data.theme === "dark" ? "bg-white" : "bg-black"}`}></div>
                  </div>
                </div>

                {/* Hero Section */}
                <div className={`h-96 ${data.theme === "dark" ? "bg-gray-600" : "bg-gray-300"}`}></div>

                {/* Features Grid */}
                <div className={`grid grid-cols-3 gap-6 p-8 ${data.theme === "dark" ? "bg-black" : "bg-gray-100"}`}>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`rounded-lg p-6 border ${data.theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-gray-200 border-gray-300"
                        }`}
                    >
                      <div
                        className={`w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center ${data.theme === "dark" ? "bg-gray-600" : "bg-gray-300"
                          }`}
                      >
                        <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <div
                          className={`h-2 rounded mx-auto ${data.theme === "dark" ? "bg-gray-600" : "bg-gray-400"}`}
                          style={{ width: "60%" }}
                        ></div>
                        <div className={`h-2 rounded ${data.theme === "dark" ? "bg-gray-600" : "bg-gray-400"}`}></div>
                        <div className={`h-2 rounded ${data.theme === "dark" ? "bg-gray-600" : "bg-gray-400"}`}></div>
                      </div>
                      {i !== 3 && (
                        <div className="mt-4 flex items-center justify-end">
                          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {currentStep === 6 && (
            <div className="w-full max-w-5xl">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-black p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded flex items-center justify-center">
                      <span className="text-gray-400 italic text-sm">Logo</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-0.5 w-12 bg-white rounded"></div>
                    <div className="h-0.5 w-12 bg-white rounded"></div>
                    <div className="h-0.5 w-12 bg-white rounded"></div>
                    <div className="px-6 py-2 bg-white rounded"></div>
                  </div>
                </div>

                {/* Hero */}
                <div className="bg-gray-600 h-96"></div>

                {/* Features Grid */}
                <div className="grid grid-cols-3 gap-6 p-8 bg-black">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-700 rounded-lg p-6">
                      <div className="w-16 h-16 bg-gray-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-gray-600 rounded mx-auto" style={{ width: "60%" }}></div>
                        <div className="h-2 bg-gray-600 rounded"></div>
                        <div className="h-2 bg-gray-600 rounded"></div>
                      </div>
                      <div className="mt-4 flex items-center justify-end">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
