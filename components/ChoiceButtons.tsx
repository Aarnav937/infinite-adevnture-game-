
import React from 'react';
import type { Choice } from '../types';

interface ChoiceButtonsProps {
  choices: Choice[];
  onChoice: (choice: string) => void;
  isLoading: boolean;
}

const ChoiceButtons: React.FC<ChoiceButtonsProps> = ({ choices, onChoice, isLoading }) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700">
      <h3 className="text-xl font-bold text-cyan-400 mb-4">What do you do?</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {choices.map((choice, index) => (
          <button
            key={index}
            onClick={() => onChoice(choice.text)}
            disabled={isLoading}
            className="w-full bg-gray-800 text-gray-200 px-6 py-3 rounded-lg border-2 border-gray-700 hover:border-cyan-500 hover:bg-gray-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {choice.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChoiceButtons;
