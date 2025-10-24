
import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface StoryDisplayProps {
  imageUrl: string | null;
  storyText: string;
  isImageLoading: boolean;
  isStoryLoading: boolean;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({
  imageUrl,
  storyText,
  isImageLoading,
  isStoryLoading,
}) => {
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="aspect-video bg-gray-900/50 rounded-lg border border-gray-700 flex items-center justify-center overflow-hidden">
        {isImageLoading ? (
          <div className="flex flex-col items-center gap-4 text-gray-400">
            <LoadingSpinner size="lg" />
            <p>Conjuring a vision...</p>
          </div>
        ) : (
          imageUrl && <img src={imageUrl} alt="Current scene" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700 flex-grow min-h-[150px] text-gray-300 leading-relaxed">
        {isStoryLoading && !storyText ? (
          <div className="flex items-center gap-3">
            <LoadingSpinner size="sm" />
            <p>The storyteller is thinking...</p>
          </div>
        ) : (
          <p>{storyText}{isStoryLoading && <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-1" aria-hidden="true"></span>}</p>
        )}
      </div>
    </div>
  );
};

export default StoryDisplay;
