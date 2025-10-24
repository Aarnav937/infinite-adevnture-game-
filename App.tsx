
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Chat } from "@google/genai";
import Sidebar from './components/Sidebar';
import StoryDisplay from './components/StoryDisplay';
import ChoiceButtons from './components/ChoiceButtons';
import { createAdventureChat, parseGeminiResponse, generateImage } from './services/geminiService';
import type { Choice, StorySegment, InventoryUpdate, GameTurn } from './types';
import { Github, Sparkles, Save } from 'lucide-react';

const SAVE_GAME_KEY = 'infiniteAdventureSaveData';

const App: React.FC = () => {
  const [quest, setQuest] = useState<string>('');
  const [inventory, setInventory] = useState<string[]>([]);
  const [currentStory, setCurrentStory] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(true);
  const [isStoryLoading, setIsStoryLoading] = useState<boolean>(true);
  const [saveButtonText, setSaveButtonText] = useState('Save Game');

  const chatRef = useRef<Chat | null>(null);
  const gameHistoryRef = useRef<GameTurn[]>([]);

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
    setIsImageLoading(true);
    
    if (!chatRef.current) {
      // Pass history to re-establish context if it exists
      chatRef.current = createAdventureChat(gameHistoryRef.current);
    }
    
    gameHistoryRef.current.push({ role: 'user', text: prompt });

    try {
      const stream = await chatRef.current.sendMessageStream({ message: prompt });
      const fullResponseText = await streamStory(stream);
      const parsedData = parseGeminiResponse(fullResponseText);
      
      if (parsedData) {
        gameHistoryRef.current.push({ role: 'model', text: JSON.stringify(parsedData) });
        updateGameState(parsedData);
        generateImage(parsedData.image_prompt)
          .then(url => {
            setImageUrl(url);
            setIsImageLoading(false);
          });
      }

    } catch (error) {
      console.error("Error getting next step:", error);
      setCurrentStory("A powerful magical interference has disrupted your adventure. Please try again.");
      setChoices([{ text: "Restart my journey" }]);
    } finally {
      setIsLoading(false);
    }
  }, [streamStory, updateGameState]);

  const startGame = useCallback(() => {
    localStorage.removeItem(SAVE_GAME_KEY);
    chatRef.current = null;
    gameHistoryRef.current = [];
    setInventory([]);
    setQuest('');
    setCurrentStory('');
    setImageUrl(null);
    setChoices([]);
    getNextStep("Start my adventure in a fantasy world. I am a novice adventurer with no items.");
  }, [getNextStep]);

  const saveGame = useCallback(() => {
    if (isLoading) return; // Don't save while loading a turn

    const gameState = {
        quest,
        inventory,
        currentStory,
        imageUrl,
        choices,
        gameHistory: gameHistoryRef.current,
    };
    localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(gameState));
  }, [quest, inventory, currentStory, imageUrl, choices, isLoading]);

  const handleSaveClick = () => {
    saveGame();
    setSaveButtonText('Saved!');
    setTimeout(() => {
        setSaveButtonText('Save Game');
    }, 2000);
  };
  
  useEffect(() => {
    const savedDataJSON = localStorage.getItem(SAVE_GAME_KEY);
    if (savedDataJSON) {
      try {
        const savedData = JSON.parse(savedDataJSON);
        setQuest(savedData.quest);
        setInventory(savedData.inventory);
        setCurrentStory(savedData.currentStory);
        setImageUrl(savedData.imageUrl);
        setChoices(savedData.choices);
        gameHistoryRef.current = savedData.gameHistory;
        
        chatRef.current = createAdventureChat(gameHistoryRef.current);
        
        setIsLoading(false);
        setIsImageLoading(false);
        setIsStoryLoading(false);
      } catch (error) {
        console.error("Failed to parse saved data, starting new game.", error);
        startGame();
      }
    } else {
      startGame();
    }
  }, [startGame]);

  const handleChoice = (choice: string) => {
    if (choice === "Restart my journey") {
      startGame();
    } else {
      getNextStep(`My choice is: "${choice}"`);
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
                onClick={handleSaveClick}
                disabled={isLoading}
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

      <main className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 max-w-7xl mx-auto">
        <div className="lg:col-span-1">
          <Sidebar quest={quest} inventory={inventory} />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-4 md:gap-8">
          <StoryDisplay
            imageUrl={imageUrl}
            storyText={currentStory}
            isImageLoading={isImageLoading}
            isStoryLoading={isStoryLoading}
          />
          <ChoiceButtons
            choices={choices}
            onChoice={handleChoice}
            isLoading={isLoading}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
