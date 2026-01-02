# Cronos

Minimal calendar app built with Sokol + Zig.

[Small preview](https://x.com/mariodev__/status/2007028805173698739?s=20)

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

Roadmap for v1.0:
- [x] Go to date
- [x] Richer events (time duration, color)
- [x] Edit events
- [ ] Search through event list
- [ ] Persistance
- [x] Event previews in monthly view
- [ ] Week and day views
- [ ] Settings
- [ ] ImGui debugging
- [ ] Mac App
- [ ] Customization?
