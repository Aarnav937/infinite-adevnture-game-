import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import { Volume1, Volume2, VolumeX, LoaderCircle } from 'lucide-react';

interface StoryDisplayProps {
  imageUrl: string | null;
  storyText: string;
  isImageLoading: boolean;
  isStoryLoading: boolean;
  isAudioLoading: boolean;
  isAudioPlaying: boolean;
  canPlayAudio: boolean;
  onToggleAudio: () => void;
}

const StoryDisplay: React.FC<StoryDisplayProps> = ({
  imageUrl,
  storyText,
  isImageLoading,
  isStoryLoading,
  isAudioLoading,
  isAudioPlaying,
  canPlayAudio,
  onToggleAudio,
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
      <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700 flex-grow min-h-[150px] text-gray-300 leading-relaxed relative">
        <div className="absolute top-3 right-3">
          <button
            onClick={onToggleAudio}
            disabled={!canPlayAudio && !isAudioLoading}
            className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-1 rounded-full hover:bg-gray-700/50"
            aria-label={isAudioPlaying ? "Stop narration" : "Play narration"}
          >
            {isAudioLoading ? (
              <LoaderCircle className="w-6 h-6 animate-spin" />
            ) : isAudioPlaying ? (
              <Volume2 className="w-6 h-6" />
            ) : canPlayAudio ? (
              <Volume1 className="w-6 h-6" />
            ) : (
              <VolumeX className="w-6 h-6" />
            )}
          </button>
        </div>
        {isStoryLoading && !storyText ? (
          <div className="flex items-center gap-3">
            <LoadingSpinner size="sm" />
            <p>The storyteller is thinking...</p>
          </div>
        ) : (
          <p className="pr-10">{storyText}{isStoryLoading && <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-1" aria-hidden="true"></span>}</p>
        )}
      </div>
    </div>
  );
};

export default StoryDisplay;