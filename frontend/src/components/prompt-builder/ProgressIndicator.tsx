interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
}

export function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  return (
    <div className="absolute left-[52px] top-0 bottom-0 w-[2px]">
      {/* Vertical line */}
      <div className="absolute inset-0 bg-gray-200">
        <div
          className="bg-black transition-all duration-300"
          style={{ height: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />
      </div>

      {/* Step circles */}
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1
        const isCompleted = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep

        return (
          <div
            key={stepNumber}
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: `${(index / (totalSteps - 1)) * 100}%` }}
          >
            <div
              className={`w-3 h-3 rounded-full transition-all ${
                isCompleted
                  ? "bg-black"
                  : isCurrent
                    ? "bg-black ring-4 ring-white"
                    : "bg-white border-2 border-gray-300"
              }`}
            />
          </div>
        )
      })}
    </div>
  )
}
