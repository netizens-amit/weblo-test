import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, Plus } from "lucide-react"
import type { PromptBuilderData } from "@/components/prompt-builder/PromptBuilder"

interface Props {
  data: PromptBuilderData
  updateData: (fields: Partial<PromptBuilderData>) => void
  onBack: () => void
  onSubmit: () => void
  isGenerating?: boolean
}

export default function Step7Payment({ data, updateData, onBack, onSubmit, isGenerating = false }: Props) {
  const paymentDetails = data.paymentDetails || {
    cardNumber: "",
    expirationDate: "",
    securityCode: "",
    fullName: "",
    country: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipcode: "",
  }

  const updatePayment = (field: string, value: string) => {
    updateData({
      paymentDetails: {
        ...paymentDetails,
        [field]: value,
      },
    })
  }

  const getPlanPrice = () => {
    switch (data.selectedPlan) {
      case "starter":
        return "$149"
      case "business":
        return "$39"
      case "enterprise":
        return "$79"
      default:
        return "$149"
    }
  }

  const getPlanName = () => {
    switch (data.selectedPlan) {
      case "starter":
        return "Starter"
      case "business":
        return "Business"
      case "enterprise":
        return "Enterprise"
      default:
        return "Starter"
    }
  }

  return (
    <div className="flex h-[calc(100vh-73px)] overflow-hidden">
      {/* Left Side - Payment Form */}
      <div className="flex-1 p-8 overflow-auto">
        <h1 className="text-3xl font-bold mb-2">Payment Details</h1>
        <p className="text-sm text-gray-500 mb-6">
          Payment integration coming soon. Click "Generate Website" to proceed with your order.
        </p>

        <div className="max-w-2xl space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-500">Card Number <span className="text-gray-400">(Optional)</span></label>
            <Input
              placeholder="1234 1234 1234 1234"
              value={paymentDetails.cardNumber}
              onChange={(e) => updatePayment("cardNumber", e.target.value)}
              className="border-gray-300 h-12 rounded-lg"
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-500">Expiration Date <span className="text-gray-400">(Optional)</span></label>
              <Input
                placeholder="11 / 26"
                value={paymentDetails.expirationDate}
                onChange={(e) => updatePayment("expirationDate", e.target.value)}
                className="border-gray-300 h-12 rounded-lg"
                disabled={isGenerating}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-500">Security Code <span className="text-gray-400">(Optional)</span></label>
              <Input
                placeholder="123"
                value={paymentDetails.securityCode}
                onChange={(e) => updatePayment("securityCode", e.target.value)}
                className="border-gray-300 h-12 rounded-lg"
                disabled={isGenerating}
              />
            </div>
          </div>

          <p className="text-xs text-gray-400 italic">
            Payment fields are currently optional. Full payment integration will be available soon.
          </p>

          <div className="space-y-2">
            <label className="text-sm text-gray-500">Full Name <span className="text-gray-400">(Optional)</span></label>
            <Input
              placeholder="Carlos Sainz"
              value={paymentDetails.fullName}
              onChange={(e) => updatePayment("fullName", e.target.value)}
              className="border-gray-300 h-12 rounded-lg"
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-500">Country <span className="text-gray-400">(Optional)</span></label>
            <Select value={paymentDetails.country} onValueChange={(value) => updatePayment("country", value)} disabled={isGenerating}>
              <SelectTrigger className="border-gray-300 h-12 rounded-lg">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
                <SelectItem value="ca">Canada</SelectItem>
                <SelectItem value="in">India</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-500">Address Line 1 <span className="text-gray-400">(Optional)</span></label>
            <Input
              placeholder="123 - Palm Avenue"
              value={paymentDetails.addressLine1}
              onChange={(e) => updatePayment("addressLine1", e.target.value)}
              className="border-gray-300 h-12 rounded-lg"
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-500">Address Line 2 <span className="text-gray-400">(Optional)</span></label>
            <Input
              placeholder="Block 66"
              value={paymentDetails.addressLine2}
              onChange={(e) => updatePayment("addressLine2", e.target.value)}
              className="border-gray-300 h-12 rounded-lg"
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-500">City <span className="text-gray-400">(Optional)</span></label>
              <Input
                placeholder="New York"
                value={paymentDetails.city}
                onChange={(e) => updatePayment("city", e.target.value)}
                className="border-gray-300 h-12 rounded-lg"
                disabled={isGenerating}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-500">State <span className="text-gray-400">(Optional)</span></label>
              <Select value={paymentDetails.state} onValueChange={(value) => updatePayment("state", value)} disabled={isGenerating}>
                <SelectTrigger className="border-gray-300 h-12 rounded-lg">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ny">New York</SelectItem>
                  <SelectItem value="ca">California</SelectItem>
                  <SelectItem value="tx">Texas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-500">Zipcode <span className="text-gray-400">(Optional)</span></label>
            <Input
              placeholder="80002"
              value={paymentDetails.zipcode}
              onChange={(e) => updatePayment("zipcode", e.target.value)}
              className="border-gray-300 h-12 rounded-lg"
              disabled={isGenerating}
            />
          </div>
        </div>
      </div>

      {/* Right Side - Order Summary */}
      <div className="w-[400px] bg-gray-50 p-8 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Order Summary</h2>
          <button className="flex items-center gap-1 text-sm" disabled={isGenerating}>
            <Plus className="w-4 h-4" />
            Add Promo Code
          </button>
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{getPlanName()}</h3>
          <p className="text-sm text-gray-600 mb-3">
            {data.selectedPlan === "starter" 
              ? "Pay-per-build, ideal for 1-time website creation."
              : data.selectedPlan === "business"
              ? "Build up to 5 websites + export source code."
              : "Everything from above + white-label, SLA, and advanced features."
            }
          </p>

          <div className="mb-3">
            <h4 className="text-xs font-semibold text-gray-500 mb-2">INCLUDES</h4>
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
          </div>

          <div className="border-t pt-4 mb-3">
            <h4 className="text-xs font-semibold text-gray-500 mb-2">YOUR WEBSITE INCLUDES</h4>
            <div className="flex flex-wrap gap-1 mb-2">
              {data.pages.map((page) => (
                <span key={page} className="px-2 py-0.5 bg-gray-200 rounded text-xs capitalize">
                  {page}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {data.features.slice(0, 3).map((feature) => (
                <span key={feature} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                  {feature.replace(/-/g, " ")}
                </span>
              ))}
              {data.features.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                  +{data.features.length - 3} more
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            {data.selectedPlan === "starter" 
              ? "One-time payment of $149 plus applicable taxes"
              : `${getPlanPrice()}/month plus applicable taxes`
            }
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={onSubmit}
            disabled={isGenerating}
            className="w-full bg-black text-white hover:bg-gray-800 h-12 rounded-lg text-base font-medium"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              `Generate Website`
            )}
          </Button>
          <button 
            onClick={onBack}
            disabled={isGenerating}
            className="w-full text-center text-sm text-gray-500 hover:text-black"
          >
            ← Go Back
          </button>
        </div>
      </div>
    </div>
  )
}
