
import React from 'react';
import { BookOpen, Backpack } from 'lucide-react';

interface SidebarProps {
  quest: string;
  inventory: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ quest, inventory }) => {
  return (
    <aside className="bg-gray-900/50 backdrop-blur-sm text-gray-200 p-6 rounded-lg border border-gray-700 flex flex-col gap-8 h-full">
      <div>
        <h2 className="text-2xl font-bold mb-4 text-cyan-400 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          Current Quest
        </h2>
        <p className="text-gray-300 leading-relaxed">{quest || 'Your adventure is about to begin...'}</p>
      </div>
      <div className="flex-grow">
        <h2 className="text-2xl font-bold mb-4 text-cyan-400 flex items-center gap-2">
          <Backpack className="w-6 h-6" />
          Inventory
        </h2>
        {inventory.length > 0 ? (
          <ul className="space-y-2">
            {inventory.map((item, index) => (
              <li key={index} className="bg-gray-800 p-3 rounded-md border border-gray-700 capitalize text-gray-300">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Your backpack is empty.</p>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
