import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
  return (
    <div className="flex items-center justify-center mb-8">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
            step < currentStep 
              ? 'bg-primary-600 border-primary-600 text-white' 
              : step === currentStep
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'bg-gray-200 dark:bg-dark-200 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
          }`}>
            {step < currentStep ? (
              <Check className="w-5 h-5" />
            ) : (
              <span className="text-sm font-medium">{step}</span>
            )}
          </div>
          {step < totalSteps && (
            <div className={`w-16 h-0.5 mx-2 transition-all duration-200 ${
              step < currentStep ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepIndicator;