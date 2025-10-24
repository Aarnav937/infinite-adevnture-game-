
export interface Choice {
  text: string;
}

export interface InventoryUpdate {
  action: 'add' | 'remove';
  item: string;
}

export interface StorySegment {
  story: string;
  image_prompt: string;
  choices: Choice[];
  inventory_update: InventoryUpdate[];
  quest_update: string;
}

export interface GameTurn {
  role: 'user' | 'model';
  text: string;
}
