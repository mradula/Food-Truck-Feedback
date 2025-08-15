import React from 'react';
import { motion } from 'framer-motion';
import { Contrast, Volume2, VolumeX } from 'lucide-react';

interface AccessibilityControlsProps {
  highContrast: boolean;
  onToggleHighContrast: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const AccessibilityControls: React.FC<AccessibilityControlsProps> = ({
  highContrast,
  onToggleHighContrast,
  soundEnabled,
  onToggleSound
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 z-50 flex space-x-2"
    >
      {/* High Contrast Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleHighContrast}
        className={`p-3 rounded-full shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
          highContrast
            ? 'bg-white text-gray-900 hover:bg-gray-100 focus:ring-white'
            : 'bg-gray-800 text-white hover:bg-gray-700 focus:ring-gray-500'
        }`}
        aria-label={`${highContrast ? 'Disable' : 'Enable'} high contrast mode`}
        title={`${highContrast ? 'Disable' : 'Enable'} high contrast mode`}
      >
        <Contrast size={20} />
      </motion.button>

      {/* Sound Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleSound}
        className={`p-3 rounded-full shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
          highContrast
            ? 'bg-white text-gray-900 hover:bg-gray-100 focus:ring-white'
            : 'bg-gray-800 text-white hover:bg-gray-700 focus:ring-gray-500'
        }`}
        aria-label={`${soundEnabled ? 'Mute' : 'Unmute'} sounds`}
        title={`${soundEnabled ? 'Mute' : 'Unmute'} sounds`}
      >
        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </motion.button>
    </motion.div>
  );
};