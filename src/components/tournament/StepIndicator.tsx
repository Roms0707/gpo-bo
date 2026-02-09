import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
  onStepClick?: (step: number) => void;
  allowFreeNavigation?: boolean;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepLabels = [],
  onStepClick,
  allowFreeNavigation = false
}) => {
  const handleStepClick = (step: number) => {
    if (onStepClick && (allowFreeNavigation || step <= currentStep)) {
      onStepClick(step);
    }
  };

  return (
    <div className="flex items-center justify-center mb-8">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
        const isClickable = onStepClick && (allowFreeNavigation || step <= currentStep);
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleStepClick(step)}
                disabled={!isClickable}
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                  isCompleted || isCurrent
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-dark-200 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                } ${isClickable ? 'cursor-pointer hover:scale-110 hover:shadow-lg' : 'cursor-default'}`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{step}</span>
                )}
              </button>
              {stepLabels[step - 1] && (
                <span className={`mt-2 text-xs font-medium whitespace-nowrap ${
                  isCompleted || isCurrent
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {stepLabels[step - 1]}
                </span>
              )}
            </div>
            {step < totalSteps && (
              <div className={`w-12 sm:w-16 h-0.5 mx-1 sm:mx-2 transition-all duration-200 ${
                isCompleted ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              } ${stepLabels.length > 0 ? 'mb-6' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepIndicator;
