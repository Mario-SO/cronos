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
| `y` | Toggle year view |
| `a` | Add event |
| `v` | Toggle agenda side view |
| `g` | Go to date |
| `s` | Search events |
| `q` | Quit |

## Google Calendar Sync (preview)

Requires an OAuth client for an installed app.

```bash
export CRONOS_GOOGLE_CLIENT_ID="your-client-id"
# Optional when using PKCE, required if your client has a secret
export CRONOS_GOOGLE_CLIENT_SECRET="your-client-secret"
```

Open Settings (` , `) → Sync → Connect Google. Calendars map to colors, and
events import as all-day entries for now.

## Adding a Shortcut

This is the full flow for adding a new shortcut and its behavior end-to-end.

1. **Add the command definition**
   - Add a new entry in the relevant module under `src/features/*/*Commands.ts`.
   - Include `id`, `title`, `keys`, `layers`, and `run`.
2. **Pick a layer**
   - Use an existing layer (`global`, `agenda`, `modal:add`, `modal:goto`, `modal:search`, `modal:settings`) in `layers`.
   - If you need a new context, add a new layer in `src/app/commands/keymap.ts`.
3. **Wire UI handlers (if needed)**
   - For view-local behavior, register handlers in the component via `set...CommandHandlers`.
4. **Update docs**
   - Add global bindings to the Keyboard Shortcuts table in this README.

Example (add `n` to jump to next year):

```ts
// src/features/calendar/calendarCommands.ts
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
- [ ] Settings modal on ','
    - [x] Week start day
    - [x] Notification options
    - [x] Themes
    - [ ] Google Calendar sync
    - [ ] iCal export/import
- [ ] Notifications for upcoming events
- [ ] Multiple day events??
- [ ] Recurring events
- [ ] cli support (cronos add ...)
- [x] Persistent storage
- [x] Search through event list
- [x] Agenda side view
- [x] Yearly view
