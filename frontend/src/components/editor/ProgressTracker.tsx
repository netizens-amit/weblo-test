import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

interface ProgressTrackerProps {
  status: string;
  events: any[];
}

const steps = [
  { id: "understanding", label: "What the System Understands & Extracts" },
  { id: "planning", label: "Implementation plan accepted" },
  { id: "payment", label: "Payment Completed" },
  { id: "progress", label: "Progress" },
];

export function ProgressTracker({ status, events }: ProgressTrackerProps) {
  const getStepStatus = (stepId: string) => {
    if (status === "completed") return "completed";
    if (status === "generating") {
      const stepIndex = steps.findIndex(s => s.id === stepId);
      const currentStepIndex = Math.min(
        Math.floor((events.length / 10) * steps.length),
        steps.length - 1
      );
      if (stepIndex < currentStepIndex) return "completed";
      if (stepIndex === currentStepIndex) return "in-progress";
    }
    return "pending";
  };

  return (
    <div className="border-t p-4 space-y-3">
      <h3 className="text-sm font-medium">Generation Progress</h3>
      
      {steps.map((step) => {
        const stepStatus = getStepStatus(step.id);
        
        return (
          <Card
            key={step.id}
            className={`${
              stepStatus === "completed"
                ? "border-green-500 bg-green-50 dark:bg-green-950"
                : stepStatus === "in-progress"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                : ""
            }`}
          >
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stepStatus === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : stepStatus === "in-progress" ? (
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{step.label}</span>
              </div>
              {stepStatus === "completed" && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </CardContent>
          </Card>
        );
      })}

      {status === "completed" && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              <div>
                <h4 className="font-semibold">Your Website Is Ready!</h4>
                <p className="text-sm text-muted-foreground">
                  SweetCrust now has a complete, user-friendly online presence.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
