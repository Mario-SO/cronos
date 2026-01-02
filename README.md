# Cronos

Minimal calendar app built with Sokol + Zig.

Features:
- Month grid with today/selection highlight
- Add events and list/delete events in modals
- Keyboard-first navigation (H/J/K/L, arrows, A/T/V)

Project layout:
- `lib/cronos/` time/date/calendar/event logic (library code)
- `src/app/` state + commands + shortcuts
- `src/ui/` calendar view and modals
- `src/render/` Sokol render helpers
- `src/platform/` macOS window tweaks

Build:
- `zig build run`

Roadmap:
- Go to date
- Search through events
- Settings
- ImGui debugging
- Event previews
- Edit events
- Persistance
- Mac App
- Customization?
