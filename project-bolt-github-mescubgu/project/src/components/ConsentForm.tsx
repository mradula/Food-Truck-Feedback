import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Check, X } from 'lucide-react';

interface ConsentFormProps {
  onConsentChange: (consent: boolean) => void;
  highContrast: boolean;
}

export const ConsentForm: React.FC<ConsentFormProps> = ({ onConsentChange, highContrast }) => {
  const [selectedConsent, setSelectedConsent] = useState<boolean | null>(null);

  const handleConsentSelect = (consent: boolean) => {
    setSelectedConsent(consent);
    onConsentChange(consent);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            highContrast ? 'bg-blue-300 text-gray-900' : 'bg-blue-100 text-blue-600'
          }`}
        >
          <Shield size={32} />
        </motion.div>
        
        <h2 className={`text-2xl font-bold mb-4 ${highContrast ? 'text-white' : 'text-gray-800'}`}>
          Privacy & Consent
        </h2>
        
        <div className={`text-lg leading-relaxed ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
          <p className="mb-4">
            Your feedback is valuable to us. To help improve our service and share positive experiences with others, we'd like your permission to use your responses.
          </p>
          <p className="mb-6">
            <strong>Do you consent to sharing your responses on our social media platforms?</strong>
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleConsentSelect(true)}
          className={`p-6 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
            selectedConsent === true
              ? highContrast
                ? 'bg-green-700 text-white border-2 border-green-400'
                : 'bg-green-50 text-green-800 border-2 border-green-500 shadow-lg'
              : highContrast
                ? 'bg-gray-800 text-white border-2 border-gray-600 hover:border-green-400'
                : 'bg-white text-gray-800 border-2 border-gray-200 hover:border-green-300 hover:shadow-md'
          } ${highContrast ? 'focus:ring-green-400' : 'focus:ring-green-500'}`}
          aria-label="Give consent to share responses"
        >
          <div className="flex items-center justify-center space-x-3">
            <Check size={24} className={selectedConsent === true ? 'text-green-600' : 'text-gray-400'} />
            <div className="text-left">
              <h3 className="text-xl font-semibold mb-1">Yes, I consent</h3>
              <p className={`text-sm ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
                You may share my feedback publicly
              </p>
            </div>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleConsentSelect(false)}
          className={`p-6 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
            selectedConsent === false
              ? highContrast
                ? 'bg-red-700 text-white border-2 border-red-400'
                : 'bg-red-50 text-red-800 border-2 border-red-500 shadow-lg'
              : highContrast
                ? 'bg-gray-800 text-white border-2 border-gray-600 hover:border-red-400'
                : 'bg-white text-gray-800 border-2 border-gray-200 hover:border-red-300 hover:shadow-md'
          } ${highContrast ? 'focus:ring-red-400' : 'focus:ring-red-500'}`}
          aria-label="Do not give consent to share responses"
        >
          <div className="flex items-center justify-center space-x-3">
            <X size={24} className={selectedConsent === false ? 'text-red-600' : 'text-gray-400'} />
            <div className="text-left">
              <h3 className="text-xl font-semibold mb-1">No, keep private</h3>
              <p className={`text-sm ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
                Keep my feedback confidential
              </p>
            </div>
          </div>
        </motion.button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: selectedConsent !== null ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className={`text-center text-sm ${highContrast ? 'text-gray-400' : 'text-gray-500'}`}
      >
        <p>
          Your privacy is important to us. Regardless of your choice, your feedback will be handled securely and in compliance with GDPR/CCPA regulations.
        </p>
      </motion.div>
    </motion.div>
  );
};