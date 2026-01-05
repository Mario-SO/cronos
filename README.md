# Cronos

A terminal calendar app built with OpenTUI.

## Usage

```bash
bun install
bun dev
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Previous / Next month |
| `h` / `l` | Previous / Next day |
| `k` / `j` | Previous / Next week |
| `t` | Jump to today |
| `a` | Add event |
| `v` | View events |
| `g` | Go to date |
| `q` | Quit |

## Adding a Shortcut

1. **Add the command** to the `Command` type in `src/types.ts`
2. **Implement the command** in `src/commands/` (calendar, modal, or app)
3. **Register the shortcut** in `src/keyboard/registry.ts`

Example:

```ts
// 1. types.ts
export type Command = 
  | ... 
  | "calendar.nextYear"

// 2. commands/calendar.ts
export function nextYear() {
  // implementation
}

// 3. commands/index.ts - add case to execute()
case "calendar.nextYear":
  calendar.nextYear()
  break

// 4. keyboard/registry.ts
{ key: "n", command: "calendar.nextYear", description: "Next year" },
```
