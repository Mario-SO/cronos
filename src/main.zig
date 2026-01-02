const sokol = @import("sokol");
const slog = sokol.log;
const sapp = sokol.app;

const render = @import("render/sokol_context.zig");
const app_state = @import("app/state.zig");
const shortcuts = @import("app/shortcuts.zig");
const calendar_view = @import("ui/calendar_view.zig");
const add_modal = @import("ui/modals/add_event.zig");
const view_modal = @import("ui/modals/view_events.zig");
const goto_modal = @import("ui/modals/go_to_date.zig");
const platform = @import("platform/macos_window.zig");

var state: app_state.State = .{};

export fn init() void {
    render.setup();
    app_state.init(&state);
    platform.configureMacWindow();
}

export fn frame() void {
    const width_i = sapp.width();
    const height_i = sapp.height();
    const width = @as(f32, @floatFromInt(width_i));
    const height = @as(f32, @floatFromInt(height_i));

    render.beginFrame(width_i, height_i);

    // Check if any modal is open
    const modal_open = state.event_modal_mode != .closed or
        state.view_modal_open or
        state.goto_modal_open;

    if (modal_open) {
        // Render calendar to offscreen texture
        render.beginScenePass();
        calendar_view.draw(&state, width, height);
        render.endScenePass();

        // Apply blur and render blurred background to screen
        render.renderBlurredBackground(2.0);

        // Draw modals on top of blurred background (they skip their own black overlay)
        view_modal.draw(&state, width, height);
        add_modal.draw(&state, width, height);
        goto_modal.draw(&state, width, height);
    } else {
        // Normal rendering path without blur
        calendar_view.draw(&state, width, height);
    }

    render.endFrame();
}

export fn cleanup() void {
    render.shutdown();
}

export fn event(ev: [*c]const sapp.Event) void {
    _ = render.handleEvent(ev.*);
    // Event modal (add/edit) takes priority when open
    if (state.event_modal_mode != .closed) {
        add_modal.handleEvent(&state, ev.*);
        return;
    }
    if (state.view_modal_open) {
        view_modal.handleEvent(&state, ev.*);
        return;
    }
    if (state.goto_modal_open) {
        goto_modal.handleEvent(&state, ev.*);
        return;
    }
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
