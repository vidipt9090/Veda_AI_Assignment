"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export type ProcessingStatus = "uploading" | "extracting-questions" | "extracting-answers" | "mapping" | "evaluating" | "ready";

const steps = [
  { id: "uploading", label: "Uploading" },
  { id: "extracting-questions", label: "Extracting questions" },
  { id: "extracting-answers", label: "Extracting answers" },
  { id: "mapping", label: "Mapping" },
  { id: "evaluating", label: "AI Evaluation" },
  { id: "ready", label: "Ready" }
];

export default function MappingProgress({ currentStatus }: { currentStatus: ProcessingStatus }) {
  const currentIndex = steps.findIndex(s => s.id === currentStatus);

  return (
    <div className="flex flex-col items-center justify-center p-12 max-w-xl mx-auto w-full">
      <div className="bg-white rounded-2xl shadow-sm border p-8 w-full">
        <h2 className="text-xl font-semibold mb-8 text-center">Processing Documents</h2>
        
        <div className="space-y-6">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            
            return (
              <div key={step.id} className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="text-green-500" size={24} />
                  ) : isCurrent ? (
                    <Loader2 className="text-orange-500 animate-spin" size={24} />
                  ) : (
                    <Circle className="text-zinc-300" size={24} />
                  )}
                </div>
                <div className={`flex-1 text-lg ${isCurrent ? 'text-zinc-900 font-medium' : isCompleted ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
