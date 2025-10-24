import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Chat } from "@google/genai";
import Sidebar from './components/Sidebar';
import StoryDisplay from './components/StoryDisplay';
import ChoiceButtons from './components/ChoiceButtons';
import DifficultySelector from './components/DifficultySelector';
import LoadingSpinner from './components/LoadingSpinner';
import { createAdventureChat, parseGeminiResponse, generateImage, generateSpeech } from './services/geminiService';
import type { Choice, StorySegment, InventoryUpdate, GameTurn, Difficulty } from './types';
import { Github, Sparkles, Save, Volume2, VolumeX } from 'lucide-react';

const SAVE_GAME_KEY = 'infiniteAdventureSaveData';
const TTS_ENABLED_KEY = 'infiniteAdventureTtsEnabled';

type GameState = 'loading' | 'selecting_difficulty' | 'playing';

// Helper functions for audio decoding based on Gemini API documentation
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
): Promise<AudioBuffer> {
  // The TTS API returns raw PCM data at 24kHz with 1 channel.
  const sampleRate = 24000;
  const numChannels = 1;
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const App: React.FC = () => {
  const [quest, setQuest] = useState<string>('');
  const [inventory, setInventory] = useState<string[]>([]);
  const [currentStory, setCurrentStory] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  
  const [gameState, setGameState] = useState<GameState>('loading');
  const [difficulty, setDifficulty] = useState<Difficulty>('Normal');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(true);
  const [isStoryLoading, setIsStoryLoading] = useState<boolean>(true);
  const [saveButtonText, setSaveButtonText] = useState('Save Game');

  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(true);
  const [isAudioLoading, setIsAudioLoading] = useState<boolean>(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [canPlayAudio, setCanPlayAudio] = useState<boolean>(false);

  const chatRef = useRef<Chat | null>(null);
  const gameHistoryRef = useRef<GameTurn[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const currentAudioBufferRef = useRef<AudioBuffer | null>(null);

  const stopAudio = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.onended = null;
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    setIsAudioPlaying(false);
  }, []);

  const playAudioBuffer = useCallback((buffer: AudioBuffer) => {
    if (!audioContextRef.current) return;
    stopAudio(); 

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.start();
    setIsAudioPlaying(true);

    source.onended = () => {
        setIsAudioPlaying(false);
        audioSourceRef.current = null;
    };
    audioSourceRef.current = source;
  }, [stopAudio]);

  const generateAndPlayAudio = useCallback(async (text: string) => {
    if (!isTtsEnabled) {
      setIsAudioLoading(false);
      setCanPlayAudio(false);
      currentAudioBufferRef.current = null;
      return;
    }

    setIsAudioLoading(true);
    setCanPlayAudio(false);
    stopAudio();
    currentAudioBufferRef.current = null;

    try {
        const audioData = await generateSpeech(text);
        if (audioData) {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
            const audioBytes = decode(audioData);
            const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current);
            currentAudioBufferRef.current = audioBuffer;
            setCanPlayAudio(true);
            playAudioBuffer(audioBuffer);
        }
    } catch (error) {
        console.error("Failed to generate or play audio:", error);
        setCanPlayAudio(false);
    } finally {
        setIsAudioLoading(false);
    }
}, [playAudioBuffer, stopAudio, isTtsEnabled]);

  const handleToggleAudio = useCallback(() => {
    if (isAudioPlaying) {
        stopAudio();
    } else if (canPlayAudio && currentAudioBufferRef.current) {
        playAudioBuffer(currentAudioBufferRef.current);
    }
  }, [isAudioPlaying, canPlayAudio, stopAudio, playAudioBuffer]);

  const handleToggleTts = useCallback(() => {
    setIsTtsEnabled(prev => {
        const newState = !prev;
        localStorage.setItem(TTS_ENABLED_KEY, JSON.stringify(newState));
        if (!newState) {
            stopAudio();
            setCanPlayAudio(false);
            currentAudioBufferRef.current = null;
        }
        return newState;
    });
}, [stopAudio]);

  const processInventoryUpdates = useCallback((updates: InventoryUpdate[]) => {
    setInventory(prevInventory => {
      let newInventory = [...prevInventory];
      updates.forEach(update => {
        if (update.action === 'add') {
          if (!newInventory.includes(update.item)) {
            newInventory.push(update.item);
          }
        } else if (update.action === 'remove') {
          newInventory = newInventory.filter(item => item !== update.item);
        }
      });
      return newInventory;
    });
  }, []);

  const streamStory = useCallback(async (stream: AsyncGenerator<any, any, any>) => {
    let fullText = "";
    setIsStoryLoading(true);
    setCurrentStory('');
    for await (const chunk of stream) {
      const chunkText = chunk.text;
      if (chunkText) {
        fullText += chunkText;
        setCurrentStory(fullText);
      }
    }
    setIsStoryLoading(false);
    return fullText;
  }, []);

  const updateGameState = useCallback((data: StorySegment) => {
    setQuest(data.quest_update);
    setChoices(data.choices);
    processInventoryUpdates(data.inventory_update);
  }, [processInventoryUpdates]);

  const getNextStep = useCallback(async (prompt: string) => {
    setIsLoading(true);
    
    if (!chatRef.current) {
      chatRef.current = createAdventureChat(gameHistoryRef.current, difficulty);
    }
    
    gameHistoryRef.current.push({ role: 'user', text: prompt });

    try {
      const stream = await chatRef.current.sendMessageStream({ message: prompt });
      const fullResponseText = await streamStory(stream);
      const parsedData = parseGeminiResponse(fullResponseText);
      
      if (parsedData) {
        gameHistoryRef.current.push({ role: 'model', text: JSON.stringify(parsedData) });
        updateGameState(parsedData);
        
        setIsImageLoading(true);
        generateImage(parsedData.image_prompt)
          .then(url => setImageUrl(url))
          .finally(() => setIsImageLoading(false));

        generateAndPlayAudio(parsedData.story);
      } else {
         stopAudio();
      }

    } catch (error) {
      console.error("Error getting next step:", error);
      setCurrentStory("A powerful magical interference has disrupted your adventure. Please try again.");
      setChoices([{ text: "Restart my journey" }]);
      stopAudio();
    } finally {
      setIsLoading(false);
    }
  }, [streamStory, updateGameState, generateAndPlayAudio, stopAudio, difficulty]);

  const startNewGame = useCallback(() => {
    stopAudio();
    localStorage.removeItem(SAVE_GAME_KEY);
    chatRef.current = null;
    gameHistoryRef.current = [];
    setInventory([]);
    setQuest('');
    setCurrentStory('');
    setImageUrl(null);
    setChoices([]);
    setCanPlayAudio(false);
    setGameState('selecting_difficulty');
  }, [stopAudio]);
  
  const beginAdventure = useCallback(async (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setGameState('playing');
    await getNextStep(`Start my adventure in a fantasy world on ${selectedDifficulty} difficulty. I am a novice adventurer with no items.`);
  }, [getNextStep]);

  const saveGame = useCallback(() => {
    if (isLoading || gameState !== 'playing') return;

    const gameStateToSave = {
        quest,
        inventory,
        currentStory,
        imageUrl,
        choices,
        gameHistory: gameHistoryRef.current,
        difficulty,
    };
    localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(gameStateToSave));
  }, [quest, inventory, currentStory, imageUrl, choices, isLoading, difficulty, gameState]);

  const handleSaveClick = () => {
    saveGame();
    setSaveButtonText('Saved!');
    setTimeout(() => {
        setSaveButtonText('Save Game');
    }, 2000);
  };
  
  useEffect(() => {
    const savedTtsPref = localStorage.getItem(TTS_ENABLED_KEY);
    if (savedTtsPref !== null) {
      setIsTtsEnabled(JSON.parse(savedTtsPref));
    }

    const savedDataJSON = localStorage.getItem(SAVE_GAME_KEY);
    if (savedDataJSON) {
      try {
        const savedData = JSON.parse(savedDataJSON);
        setQuest(savedData.quest);
        setInventory(savedData.inventory);
        setCurrentStory(savedData.currentStory);
        setImageUrl(savedData.imageUrl);
        setChoices(savedData.choices);
        setDifficulty(savedData.difficulty || 'Normal');
        gameHistoryRef.current = savedData.gameHistory;
        
        chatRef.current = createAdventureChat(gameHistoryRef.current, savedData.difficulty || 'Normal');
        
        setIsLoading(false);
        setIsImageLoading(false);
        setIsStoryLoading(false);
        setCanPlayAudio(false);
        setGameState('playing');
      } catch (error) {
        console.error("Failed to parse saved data, starting new game.", error);
        setGameState('selecting_difficulty');
      }
    } else {
      setGameState('selecting_difficulty');
    }
  }, []);

  const handleChoice = (choice: string) => {
    if (choice === "Restart my journey") {
      startNewGame();
    } else {
      getNextStep(`My choice is: "${choice}"`);
    }
  };
  
  const renderContent = () => {
    switch (gameState) {
        case 'loading':
            return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
        case 'selecting_difficulty':
            return <DifficultySelector onSelect={beginAdventure} />;
        case 'playing':
            return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
                    <div className="lg:col-span-1">
                      <Sidebar quest={quest} inventory={inventory} />
                    </div>
                    <div className="lg:col-span-2 flex flex-col gap-4 md:gap-8">
                      <StoryDisplay
                        imageUrl={imageUrl}
                        storyText={currentStory}
                        isImageLoading={isImageLoading}
                        isStoryLoading={isStoryLoading}
                        isTtsEnabled={isTtsEnabled}
                        isAudioLoading={isAudioLoading}
                        isAudioPlaying={isAudioPlaying}
                        canPlayAudio={canPlayAudio}
                        onToggleAudio={handleToggleAudio}
                      />
                      <ChoiceButtons
                        choices={choices}
                        onChoice={handleChoice}
                        isLoading={isLoading}
                      />
                    </div>
                </div>
            );
        default:
            return null;
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <header className="bg-gray-900/80 backdrop-blur-sm p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
            <Sparkles className="text-cyan-400" />
            <h1 className="text-2xl font-bold text-gray-100">Infinite Adventure Engine</h1>
        </div>
        <div className="flex items-center gap-4">
            <button
                onClick={handleToggleTts}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
                aria-label={isTtsEnabled ? "Disable Narration" : "Enable Narration"}
            >
                {isTtsEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
            </button>
            <button 
                onClick={handleSaveClick}
                disabled={isLoading || gameState !== 'playing'}
                className="flex items-center gap-2 bg-gray-800 text-gray-200 px-4 py-2 rounded-lg border-2 border-gray-700 hover:border-cyan-500 hover:bg-gray-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Save size={18} />
                <span>{saveButtonText}</span>
            </button>
            <a href="https://github.com/google/genai-applications" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Github size={24} />
            </a>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;