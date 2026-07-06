export interface ITool {
  name: string;
  description: string;
  parameters: Record<string, { type: 'string'; description: string; }>; // JSON Schema object
  execute: (args: Record<string, string>) => Promise<string>;
}
