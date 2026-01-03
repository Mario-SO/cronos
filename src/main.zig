//! Cronos - A minimal calendar application
//!
//! Main entry point handling application lifecycle, rendering, and event dispatch.

const sokol = @import("sokol");
const slog = sokol.log;
const sapp = sokol.app;

const render = @import("render/sokol_context.zig");
const app_state = @import("app/state.zig");
const shortcuts = @import("app/shortcuts.zig");
const calendar_view = @import("ui/calendar_view.zig");
const modal_registry = @import("ui/modal_registry.zig");
const profiler = @import("app/profiler.zig");
const profiler_window = @import("ui/profiler_window.zig");
const platform = @import("platform/macos_window.zig");
const build_options = @import("build_options");

var state: app_state.State = .{};
var profiler_state: profiler.Profiler = .{};

export fn init() void {
    render.setup();
    app_state.init(&state);
    platform.configureMacWindow();
    if (build_options.dev) {
        profiler_state.reset();
    }
}

export fn frame() void {
    const width_i = sapp.width();
    const height_i = sapp.height();
    const width = @as(f32, @floatFromInt(width_i));
    const height = @as(f32, @floatFromInt(height_i));

    render.beginFrame(width_i, height_i);
    calendar_view.draw(&state, width, height);
    modal_registry.drawAll(&state, width, height);
    if (build_options.dev) {
        profiler_state.update(sapp.frameDuration());
        profiler_window.draw(&profiler_state);
    }
    render.endFrame();
}

export fn cleanup() void {
    render.shutdown();
}

export fn event(ev: [*c]const sapp.Event) void {
    _ = render.handleEvent(ev.*);

    // Let modal registry handle events if any modal is open
    if (modal_registry.handleEvent(&state, ev.*)) {
        return;
    }

    // Calendar shortcuts (only when no modal is open)
    if (ev.*.type == .KEY_DOWN) {
        shortcuts.handleKeyDown(&state, ev.*.key_code);
    }
}

pub fn main() void {
    sapp.run(.{
        .init_cb = init,
        .frame_cb = frame,
        .cleanup_cb = cleanup,
        .event_cb = event,
        .window_title = "Cronos",
        .width = 1024,
        .height = 676,
        .icon = .{ .sokol_default = true },
        .logger = .{ .func = slog.func },
    });
}
