import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  highContrast: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepLabels,
  highContrast
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        {stepLabels.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <div key={index} className="flex flex-col items-center flex-1">
              {/* Step Circle */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                  isCompleted
                    ? highContrast
                      ? 'bg-green-700 text-white'
                      : 'bg-green-500 text-white'
                    : isCurrent
                      ? highContrast
                        ? 'bg-blue-700 text-white ring-4 ring-blue-300'
                        : 'bg-blue-500 text-white ring-4 ring-blue-200'
                      : highContrast
                        ? 'bg-gray-700 text-gray-400'
                        : 'bg-gray-200 text-gray-500'
                }`}
                aria-label={`Step ${stepNumber}: ${label}`}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check size={20} />
                  </motion.div>
                ) : (
                  <span className="text-sm font-semibold">{stepNumber}</span>
                )}
              </motion.div>

              {/* Step Label */}
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 + 0.1 }}
                className={`text-xs text-center font-medium max-w-20 ${
                  isCurrent
                    ? highContrast
                      ? 'text-blue-300'
                      : 'text-blue-600'
                    : isCompleted
                      ? highContrast
                        ? 'text-green-300'
                        : 'text-green-600'
                      : highContrast
                        ? 'text-gray-400'
                        : 'text-gray-500'
                }`}
              >
                {label}
              </motion.span>

              {/* Connecting Line */}
              {index < stepLabels.length - 1 && (
                <div
                  className={`absolute top-5 left-1/2 transform -translate-y-1/2 h-0.5 transition-all duration-500 ${
                    isCompleted
                      ? highContrast
                        ? 'bg-green-700'
                        : 'bg-green-500'
                      : highContrast
                        ? 'bg-gray-600'
                        : 'bg-gray-300'
                  }`}
                  style={{
                    width: 'calc(100vw / ' + totalSteps + ' - 3rem)',
                    left: 'calc(50% + 1.25rem)'
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className={`mt-6 w-full h-2 rounded-full overflow-hidden ${
        highContrast ? 'bg-gray-700' : 'bg-gray-200'
      }`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className={`h-full rounded-full ${
            highContrast ? 'bg-blue-500' : 'bg-blue-600'
          }`}
        />
      </div>
    </div>
  );
};