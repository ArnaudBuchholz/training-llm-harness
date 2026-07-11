import type { ITool } from '../ITool.js';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * What files are in the src folder?
 * Create a new file called hello.ts with a simple hello world function
 * Update hello.ts: add an export for the function (diff: - function hello - + export function hello)
 */

// Sandbox root — resolved relative to this file so it works regardless of CWD
const WORKSPACE = join(dirname(fileURLToPath(import.meta.url)), '../../coding');

function resolveSafe(relativePath: string): string {
  // Strip any leading slashes so the path stays inside WORKSPACE
  return join(WORKSPACE, relativePath.replace(/^\/+/, ''));
}

export const SYSTEM_PROMPT = `You are a coding assistant with access to a local workspace.
You can read the contents of folders, create new files, and apply patch-style updates to existing files.
All paths are relative to the workspace root.
When updating a file, expect the user to describe changes as a unified diff or a natural-language description of what lines to add or remove.
Always confirm what you did after each operation.`;

export const TOOLS: ITool[] = [
  {
    name: 'read_folder',
    description: 'List the files and sub-folders inside a folder in the workspace',
    parameters: {
      path: { type: 'string', description: 'Relative path to the folder, e.g. "src" or "." for root' },
    },
    execute: async (args) => {
      const target = resolveSafe(args.path ?? '.');
      try {
        const entries = await readdir(target, { withFileTypes: true });
        if (entries.length === 0) return `Folder "${args.path}" is empty.`;
        return entries
          .map((e) => `${e.isDirectory() ? '[dir] ' : '[file]'} ${e.name}`)
          .join('\n');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return `Error reading folder "${args.path}": ${message}`;
      }
    },
  },
  {
    name: 'create_file',
    description: 'Create a new file in the workspace with the given content',
    parameters: {
      path: { type: 'string', description: 'Relative path for the new file, e.g. "src/hello.ts"' },
      content: { type: 'string', description: 'Full text content to write into the file' },
    },
    execute: async (args) => {
      const target = resolveSafe(args.path);
      try {
        // Refuse to overwrite — create only
        await readFile(target);
        return `File "${args.path}" already exists. Use update_file to modify it.`;
      } catch {
        // File does not exist — safe to create
      }
      try {
        await writeFile(target, args.content ?? '', 'utf8');
        return `File "${args.path}" created successfully.`;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return `Error creating file "${args.path}": ${message}`;
      }
    },
  },
  {
    name: 'update_file',
    description:
      'Apply a line-level update to an existing file. Provide the exact line(s) to find (old_content) and what to replace them with (new_content). The first occurrence is replaced.',
    parameters: {
      path: { type: 'string', description: 'Relative path of the file to update, e.g. "src/hello.ts"' },
      old_content: { type: 'string', description: 'Exact text to find and replace (must match verbatim)' },
      new_content: { type: 'string', description: 'Text that replaces the matched old_content' },
    },
    execute: async (args) => {
      const target = resolveSafe(args.path);
      let current: string;
      try {
        current = await readFile(target, 'utf8');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return `Error reading file "${args.path}": ${message}`;
      }
      if (!current.includes(args.old_content)) {
        return `Could not find the specified text in "${args.path}". No changes made.`;
      }
      const updated = current.replace(args.old_content, args.new_content);
      try {
        await writeFile(target, updated, 'utf8');
        return `File "${args.path}" updated successfully.`;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return `Error writing file "${args.path}": ${message}`;
      }
    },
  },
];
