import React, { useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

interface Step {
  number: number;
  label: string;
  shortLabel?: string;
  optional?: boolean;
}

interface WizardStepIndicatorProps {
  steps: Step[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (step: number) => void;
}

const SHORT_LABELS: Record<string, string> = {
  'Basic Setup': 'Setup',
  'Branding': 'Brand',
  'Visual Identity': 'Visual',
  'Integration': 'Integ.',
  'Legal Information': 'Legal',
};

const WizardStepIndicator: React.FC<WizardStepIndicatorProps> = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentStepRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentStepRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const element = currentStepRef.current;
      const containerWidth = container.offsetWidth;
      const elementLeft = element.offsetLeft;
      const elementWidth = element.offsetWidth;
      const scrollLeft = elementLeft - (containerWidth / 2) + (elementWidth / 2);
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
    }
  }, [currentStep]);

  return (
    <div className="mb-4 md:mb-8">
      <div
        ref={scrollContainerRef}
        className="relative flex items-center justify-between overflow-x-auto pb-2 md:pb-0 scrollbar-hide scroll-smooth"
      >
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-dark-300 to-transparent pointer-events-none z-10 sm:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-dark-300 to-transparent pointer-events-none z-10 sm:hidden" />
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.number);
          const isCurrent = step.number === currentStep;
          const isPast = step.number < currentStep;
          const isClickable = !!onStepClick;
          const shortLabel = step.shortLabel || SHORT_LABELS[step.label] || step.label;

          return (
            <React.Fragment key={step.number}>
              <div
                ref={isCurrent ? currentStepRef : null}
                className="flex flex-col items-center flex-shrink-0 min-w-[48px] sm:min-w-[60px] md:min-w-0 md:flex-1"
              >
                <button
                  onClick={() => isClickable && onStepClick(step.number)}
                  disabled={!isClickable}
                  className={`
                    flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full border-2 transition-all duration-200
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
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                  ) : (
                    <span className="text-[10px] sm:text-xs md:text-sm font-semibold">{step.number}</span>
                  )}
                </button>
                <div className="mt-1 md:mt-2 text-center">
                  <div
                    className={`text-[9px] sm:text-[10px] md:text-xs font-medium transition-colors duration-200 whitespace-nowrap ${
                      isCurrent ? 'text-primary-500' : isCompleted || isPast ? 'text-success-500' : 'text-gray-500'
                    }`}
                  >
                    <span className="hidden md:inline">{step.label}</span>
                    <span className="md:hidden">{shortLabel}</span>
                  </div>
                  {step.optional && (
                    <div className="text-[8px] sm:text-[10px] text-gray-500 mt-0.5 hidden md:block">(Optional)</div>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-full max-w-[16px] sm:max-w-[30px] md:max-w-[80px] h-0.5 mx-0.5 sm:mx-1 md:mx-2 mb-5 sm:mb-6 md:mb-8 flex-shrink-0 transition-all duration-200 ${
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
