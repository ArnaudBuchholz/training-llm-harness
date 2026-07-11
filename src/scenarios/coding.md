# coding scenario

A harness scenario that gives the LLM the tools of a minimal coding agent.

## Purpose

Demonstrates tool-use for file-system operations: the model can explore a folder tree, create new files, and apply targeted text edits — the three atomic actions that underpin most coding workflows.

## Workspace

All operations are sandboxed to the [`coding/`](../coding/) folder at the project root.  
The path is resolved relative to the scenario file (`import.meta.url`), so it is invariant to the working directory from which the harness is launched.

## Tools

| Tool | Parameters | Description |
|---|---|---|
| `read_folder` | `path` | Lists files and sub-folders inside a workspace directory |
| `create_file` | `path`, `content` | Creates a new file; refuses to overwrite an existing one |
| `update_file` | `path`, `old_content`, `new_content` | Replaces the first verbatim occurrence of `old_content` with `new_content` |

## Running

```bash
npm run coding
```

## Sample prompts

```
create a new module exposing a function that takes two parameters and returns its division

I forgot to mention that this function should accept only numbers

What about division by 0 ?
```
