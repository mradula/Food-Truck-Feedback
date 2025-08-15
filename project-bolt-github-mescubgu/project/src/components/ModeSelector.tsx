import React from 'react';
import { motion } from 'framer-motion';
import { Video, Mic, MessageSquare } from 'lucide-react';

interface ModeSelectorProps {
  onModeSelect: (mode: 'video' | 'audio' | 'text') => void;
  highContrast: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ onModeSelect, highContrast }) => {
  const modes = [
    {
      id: 'video' as const,
      title: 'Video Response',
      description: 'Record a video response (up to 3 minutes)',
      icon: Video,
      emoji: '🎥'
    },
    {
      id: 'audio' as const,
      title: 'Audio Response',
      description: 'Upload an audio file (MP3/WAV, up to 10MB)',
      icon: Mic,
      emoji: '🎤'
    },
    {
      id: 'text' as const,
      title: 'Text Response',
      description: 'Write a text response with star rating',
      icon: MessageSquare,
      emoji: '📝'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className={`text-2xl font-bold mb-2 ${highContrast ? 'text-white' : 'text-gray-800'}`}>
          Choose Your Response Mode
        </h2>
        <p className={`text-lg ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
          How would you like to share your feedback?
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {modes.map((mode, index) => {
          const Icon = mode.icon;
          return (
            <motion.button
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onModeSelect(mode.id)}
              className={`p-6 rounded-xl shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
                highContrast
                  ? 'bg-gray-800 text-white border-2 border-gray-600 hover:border-white focus:ring-white'
                  : 'bg-white text-gray-800 hover:shadow-xl focus:ring-blue-500'
              }`}
              aria-label={`Select ${mode.title}`}
            >
              <div className="flex flex-col items-center space-y-4">
                <div className={`text-4xl mb-2 ${highContrast ? 'text-blue-300' : 'text-blue-600'}`}>
                  {mode.emoji}
                </div>
                <Icon size={32} className={highContrast ? 'text-blue-300' : 'text-blue-600'} />
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">{mode.title}</h3>
                  <p className={`text-sm ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
                    {mode.description}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};