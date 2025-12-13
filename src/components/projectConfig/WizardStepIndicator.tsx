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
    <div className="mb-4 md:mb-8">
      <div className="flex items-center justify-between overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.number);
          const isCurrent = step.number === currentStep;
          const isPast = step.number < currentStep;
          const isClickable = !!onStepClick;

          return (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center flex-shrink-0 min-w-[50px] md:min-w-0 md:flex-1">
                <button
                  onClick={() => isClickable && onStepClick(step.number)}
                  disabled={!isClickable}
                  className={`
                    flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border-2 transition-all duration-200
                    ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                    ${
                      isCompleted || isPast
                        ? 'bg-success-600 border-success-600 text-white'
                        : isCurrent
                        ? 'bg-primary-600 border-primary-600 text-white ring-2 md:ring-4 ring-primary-600 ring-opacity-20'
                        : 'bg-dark-200 border-gray-600 text-gray-400'
                    }
                  `}
                >
                  {isCompleted || isPast ? (
                    <Check className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <span className="text-xs md:text-sm font-semibold">{step.number}</span>
                  )}
                </button>
                <div className="mt-1 md:mt-2 text-center">
                  <div
                    className={`text-[10px] md:text-xs font-medium transition-colors duration-200 whitespace-nowrap ${
                      isCurrent ? 'text-primary-500' : isCompleted || isPast ? 'text-success-500' : 'text-gray-500'
                    }`}
                  >
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{step.number}</span>
                  </div>
                  {step.optional && (
                    <div className="text-[10px] text-gray-500 mt-0.5 hidden sm:block">(Optional)</div>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-full max-w-[30px] md:max-w-[80px] h-0.5 mx-1 md:mx-2 mb-6 md:mb-8 flex-shrink-0 transition-all duration-200 ${
                    isPast || isCompleted ? 'bg-success-600' : 'bg-gray-600'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="sm:hidden text-center mt-2">
        <span className="text-xs text-gray-400">
          Step {currentStep}: {steps[currentStep - 1]?.label}
        </span>
      </div>
    </div>
  );
};

export default WizardStepIndicator;
