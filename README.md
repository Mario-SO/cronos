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
| `v` | Toggle agenda side view |
| `g` | Go to date |
| `s` | Search events |
| `q` | Quit |

## Adding a Shortcut

This is the full flow for adding a new shortcut and its behavior end-to-end.

1. **Add the command definition**
   - Add a new entry in the relevant module under `src/core/commands/`.
   - Include `id`, `title`, `keys`, `layers`, and `run`.
2. **Pick a layer**
   - Use an existing layer (`global`, `agenda`, `modal:add`, `modal:goto`, `modal:search`) in `layers`.
   - If you need a new context, add a new layer in `src/core/commands/keymap.ts`.
3. **Wire UI handlers (if needed)**
   - For view-local behavior, register handlers in the component via `set...CommandHandlers`.
4. **Update docs**
   - Add global bindings to the Keyboard Shortcuts table in this README.

Example (add `n` to jump to next year):

```ts
// src/core/commands/calendar.ts
export const calendarCommands = [
  // ...
  {
    id: "calendar.nextYear",
    title: "Next year",
    keys: ["n"],
    layers: ["global"],
    run: () => goToNextYear,
  },
];
```

## Roadmap

- [ ] Help on '?'
- [ ] Yearly view
- [ ] Settings modal
    - [ ] Google Calendar sync
    - [ ] iCal export/import
- [ ] Multiple day events??
- [ ] Recurring events
- [ ] cli support (cronos add ...)
- [x] Agenda side view
- [x] Persistent storage
- [x] Search through event list
