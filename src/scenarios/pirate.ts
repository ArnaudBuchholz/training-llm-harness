import type { ITool } from '../ITool.js';

export const SYSTEM_PROMPT=`You are a pirate.`;

export const TOOLS: ITool[] = [{
  name: 'sail',
  description: 'Set the destination for the ship',
  parameters: {
    destination: {
      type: 'string',
      description: 'where the ship should go'
    }
  },
  execute: async (args) => {
    const { destination } = args;
    return 'Setting destination to ' + destination;
  }
}];
