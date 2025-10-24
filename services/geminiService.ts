import { GoogleGenAI, Chat, Type, Content, Modality } from "@google/genai";
import type { StorySegment, GameTurn, Difficulty } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const storyModel = 'gemini-2.5-flash';
const imageModel = 'imagen-4.0-generate-001';
const ttsModel = 'gemini-2.5-flash-preview-tts';

const artStyle = "in a vibrant, detailed, fantasy digital painting art style, high resolution, epic composition.";

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    story: {
      type: Type.STRING,
      description: "The next paragraph of the story. Should be engaging and descriptive, ending right before a decision point."
    },
    image_prompt: {
      type: Type.STRING,
      description: `A detailed prompt for an image generation model to create a picture for this scene. It MUST include details about the character, the setting, and the mood. It should end with: '${artStyle}'`
    },
    choices: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: "A short, actionable choice for the player (e.g., 'Enter the cave', 'Follow the path')."
          }
        },
        required: ["text"]
      },
      description: "An array of 2 to 4 choices for the player to make."
    },
    inventory_update: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            enum: ["add", "remove"],
            description: "Whether to add or remove an item from the inventory."
          },
          item: {
            type: Type.STRING,
            description: "The name of the item."
          }
        },
        required: ["action", "item"]
      },
      description: "A list of items to add or remove from the player's inventory based on the story events. Can be an empty array if no changes."
    },
    quest_update: {
      type: Type.STRING,
      description: "A brief update to the player's current quest. If the quest is completed, it should state that and provide a new one. If unchanged, repeat the current quest."
    }
  },
  required: ["story", "image_prompt", "choices", "inventory_update", "quest_update"]
};

const createSystemInstruction = (difficulty: Difficulty): string => `You are an expert storyteller for an infinite, choice-driven text adventure game. Your role is to generate the next part of the story based on the user's choices.
The current game difficulty is set to '${difficulty}'. You must adjust the story challenges, enemy strength, and resource availability accordingly.
- 'Easy' should be forgiving with plentiful resources and weaker enemies.
- 'Normal' should offer a balanced challenge.
- 'Hard' should be punishing, with scarce resources and dangerous, intelligent foes.
You MUST ALWAYS respond with a valid JSON object matching this schema:
${JSON.stringify(responseSchema, null, 2)}
- The story should be continuous and adapt to the player's choices.
- Keep the story engaging and introduce challenges, characters, and items.
- The 'image_prompt' MUST be descriptive and consistent with the specified art style.
- Inventory and quest updates must logically follow from the story.
- If the player's inventory is empty, have them find an item soon (more quickly on Easy).
- Provide meaningful choices that impact the narrative.`;


const mapHistoryForGemini = (history: GameTurn[]): Content[] => {
  return history.map(turn => ({
    role: turn.role,
    parts: [{ text: turn.text }]
  }));
};

export const createAdventureChat = (history: GameTurn[] = [], difficulty: Difficulty): Chat => {
  return ai.chats.create({
    model: storyModel,
    history: mapHistoryForGemini(history),
    config: {
      systemInstruction: createSystemInstruction(difficulty),
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  });
};

export const parseGeminiResponse = (text: string): StorySegment | null => {
  try {
    const cleanedText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanedText) as StorySegment;
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    console.error("Raw response text:", text);
    // Fallback in case of invalid JSON
    return {
        story: "The ancient magic of the world falters, and the path ahead becomes unclear. Please try making a different choice or starting a new adventure.",
        image_prompt: `A mysterious swirling vortex of colors, representing a glitch in reality. ${artStyle}`,
        choices: [{ text: "Restart my journey" }],
        inventory_update: [],
        quest_update: "Survive the cosmic error."
    };
  }
};


export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
        model: imageModel,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error("Image generation failed:", error);
    // Return a placeholder or error image URL
    return "https://picsum.photos/1280/720?grayscale";
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  if (!text.trim()) return null;
  try {
    const response = await ai.models.generateContent({
      model: ttsModel,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Speech generation failed:", error);
    return null;
  }
};