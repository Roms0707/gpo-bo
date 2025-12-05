import React from 'react';
import { Check } from 'lucide-react';

interface Step {
  number: number;
  label: string;
  optional?: boolean;
}

interface WizardStepIndicatorProps {
  steps: Step[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (step: number) => void;
}

const WizardStepIndicator: React.FC<WizardStepIndicatorProps> = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.number);
          const isCurrent = step.number === currentStep;
          const isPast = step.number < currentStep;
          const isClickable = !!onStepClick;

          return (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => isClickable && onStepClick(step.number)}
                  disabled={!isClickable}
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200
                    ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                    ${
                      isCompleted || isPast
                        ? 'bg-success-600 border-success-600 text-white'
                        : isCurrent
                        ? 'bg-primary-600 border-primary-600 text-white ring-4 ring-primary-600 ring-opacity-20'
                        : 'bg-dark-200 border-gray-600 text-gray-400'
                    }
                  `}
                >
                  {isCompleted || isPast ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step.number}</span>
                  )}
                </button>
                <div className="mt-2 text-center">
                  <div
                    className={`text-xs font-medium transition-colors duration-200 ${
                      isCurrent ? 'text-primary-500' : isCompleted || isPast ? 'text-success-500' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </div>
                  {step.optional && (
                    <div className="text-xs text-gray-500 mt-0.5">(Optional)</div>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-full max-w-[80px] h-0.5 mx-2 mb-8 transition-all duration-200 ${
                    isPast || isCompleted ? 'bg-success-600' : 'bg-gray-600'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default WizardStepIndicator;
