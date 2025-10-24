import React from 'react';
import type { Difficulty } from '../types';
import { Shield, Swords, Skull } from 'lucide-react';

interface DifficultySelectorProps {
  onSelect: (difficulty: Difficulty) => void;
}

const difficulties: { name: Difficulty; description: string; icon: React.ReactNode, color: string }[] = [
  {
    name: 'Easy',
    description: 'A relaxed journey with plentiful resources and forgiving challenges.',
    icon: <Shield className="w-10 h-10" />,
    color: 'text-green-400',
  },
  {
    name: 'Normal',
    description: 'A balanced adventure with moderate challenges and rewards.',
    icon: <Swords className="w-10 h-10" />,
    color: 'text-cyan-400',
  },
  {
    name: 'Hard',
    description: 'A punishing quest where resources are scarce and every choice matters.',
    icon: <Skull className="w-10 h-10" />,
    color: 'text-red-400',
  },
];

const DifficultySelector: React.FC<DifficultySelectorProps> = ({ onSelect }) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-lg border border-gray-700 text-center max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-cyan-400 mb-2">Choose Your Challenge</h2>
      <p className="text-gray-400 mb-8">Your choice will affect the toughness of enemies and the availability of items.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {difficulties.map(({ name, description, icon, color }) => (
          <button
            key={name}
            onClick={() => onSelect(name)}
            className="group bg-gray-800 text-gray-200 p-6 rounded-lg border-2 border-gray-700 hover:border-cyan-500 hover:bg-gray-700/50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 flex flex-col items-center gap-4 text-center"
          >
            <div className={`transition-transform group-hover:scale-110 ${color}`}>{icon}</div>
            <h3 className={`text-2xl font-bold ${color}`}>{name}</h3>
            <p className="text-gray-400 text-sm">{description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DifficultySelector;
