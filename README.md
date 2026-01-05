# Cronos

A terminal calendar app built with OpenTUI.

https://github.com/user-attachments/assets/d26b4de6-23c7-4ac3-9147-4517389c3c5e

[Some earlier versions](https://x.com/mariodev__/status/2007890169459057138?s=20) previously written in Zig + Sokol

## Usage

```bash
bun install
bun dev
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `[` / `]` | Previous / Next month |
| `h` / `l` | Previous / Next day |
| `k` / `j` | Previous / Next week |
| `t` | Jump to today |
| `a` | Add event |
| `v` | View events |
| `g` | Go to date |
| `q` | Quit |

## Adding a Shortcut

This is the full flow for adding a new shortcut and its behavior end-to-end.

1. **Choose scope + behavior**
   - Decide where it should work: `root`, or a modal scope like `add`, `view`, `goto`, `search`.
   - Check `Scope` in `src/core/types.ts` to confirm the scope name.
2. **Add the command id**
   - Extend the `Command` union in `src/core/types.ts`.
   - Keep naming consistent with the existing prefixes: `calendar.*`, `modal.*`, `app.*`.
3. **Implement the behavior**
   - Add a handler in `src/core/commands/` (`calendar.ts`, `modal.ts`, or `app.ts`).
   - If the command mutates state, reuse existing state helpers in `src/state/` instead of duplicating logic.
4. **Register the handler**
   - Add the new command to the `commandHandlers` map in `src/core/commands/index.ts`.
5. **Register the shortcut**
   - Add the key binding in `src/core/keyboard/registry.ts`.
   - Include `scope` if it is not root, and write a short `description` for help text.
6. **Update help text**
   - If the shortcut is modal-specific, update the help hint line in the relevant modal component.
   - If it is global, update the Keyboard Shortcuts table in this README.

Example (add `n` to jump to next year):

```ts
// 1) src/core/types.ts
export type Command =
  | ...
  | "calendar.nextYear";

// 2) src/core/commands/calendar.ts
export function nextYear() {
  // implementation (likely uses @state/calendar helpers)
}

// 3) src/core/commands/index.ts
const commandHandlers: Record<Command, () => void> = {
  // ...
  "calendar.nextYear": calendar.nextYear,
};

// 4) src/core/keyboard/registry.ts
{ key: "n", command: "calendar.nextYear", description: "Next year" },
```

## Roadmap

- [ ] Google Calendar sync
- [ ] iCal export/import
- [x] persistent storage
- [x] search through event list
- [ ] settings
- [ ] recurring events
- [ ] cli support
