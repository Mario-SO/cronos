//! Add/Edit Event Modal
//!
//! This modal allows users to add new events or edit existing ones.
//! Events can have a title, time range, and color.

const std = @import("std");
const sokol = @import("sokol");
const sgl = sokol.gl;
const sdtx = sokol.debugtext;
const sapp = sokol.app;
const cronos = @import("lib/cronos");
const render = @import("../../render/sokol_context.zig");
const commands = @import("../../app/commands.zig");
const state_mod = @import("../../app/state.zig");
const State = state_mod.State;
const EventModalMode = state_mod.EventModalMode;
const primitives = @import("../primitives.zig");
const theme = @import("../theme.zig");

pub fn isOpen(state: *const State) bool {
    return state.event_modal.isOpen();
}

pub fn handleEvent(state: *State, ev: sapp.Event) void {
    if (ev.type == .KEY_DOWN and !ev.key_repeat) {
        switch (ev.key_code) {
            .ESCAPE => {
                if (state.event_modal.mode == .edit) {
                    // Return to view modal without saving
                    state.event_modal.mode = .closed;
                    // view_modal.open is still true, so we go back to it
                } else {
                    state.event_modal.mode = .closed;
                }
            },
            .ENTER, .KP_ENTER => {
                if (state.event_modal.mode == .edit) {
                    if (commands.saveEditedEvent(state)) {
                        state.event_modal.mode = .closed;
                        // Return to view modal
                    }
                } else {
                    if (commands.addEventFromInput(state)) {
                        state.event_modal.mode = .closed;
                    }
                }
            },
            .BACKSPACE => {
                if (state.event_modal.input_len > 0) {
                    state.event_modal.input_len -= 1;
                    state.event_modal.input[state.event_modal.input_len] = 0;
                }
            },
            else => {},
        }
    } else if (ev.type == .CHAR) {
        const ch = ev.char_code;
        if (state.event_modal.ignore_next_char) {
            state.event_modal.ignore_next_char = false;
            if (ch == 'a' or ch == 'A' or ch == 'e' or ch == 'E') return;
        }
        if (ch >= 32 and ch < 127) {
            if (state.event_modal.input_len + 1 < state.event_modal.input.len) {
                state.event_modal.input[state.event_modal.input_len] = @intCast(ch);
                state.event_modal.input_len += 1;
                state.event_modal.input[state.event_modal.input_len] = 0;
            }
        }
    }
}

pub fn draw(state: *const State, width: f32, height: f32) void {
    if (!state.event_modal.isOpen()) return;

    const is_edit = state.event_modal.mode == .edit;

    render.setup2D(width, height);

    // Draw modal overlay and box
    primitives.drawModalOverlay(width, height);
    const modal_size = theme.modal_sizes.add_event;
    const pos = primitives.drawCenteredModal(width, height, modal_size);
    const box_x = pos.x;
    const box_y = pos.y;
    const box_w = modal_size.width;
    const box_h = modal_size.height;

    // Setup text rendering
    primitives.setupText(width, height);

    // Title
    const sel_month = cronos.calendar.monthName(state.calendar.selected.month);
    const modal_title = if (is_edit) "Edit Event" else "Add Event";
    primitives.textPos(box_x + 16.0, box_y + 14.0);
    sdtx.print("{s} - {s} {d}, {d}", .{ modal_title, sel_month, state.calendar.selected.day, state.calendar.selected.year });

    // Input field
    const input = std.mem.sliceTo(state.event_modal.input[0..], 0);
    primitives.textPos(box_x + 16.0, box_y + 38.0);
    sdtx.print("> {s}_", .{input});

    // Parse input and show feedback
    const parsed = cronos.input_parser.parse(input);

    // Draw parsed info box
    const info_y = box_y + 62.0;
    primitives.fillRect(box_x + 12.0, info_y, box_w - 24.0, 70.0, theme.colors.info_box);

    // Draw color indicator
    primitives.drawColorIndicatorSized(box_x + 20.0, info_y + 50.0, 16.0, 12.0, parsed.color);

    // Parsed title
    primitives.setTextColor(theme.colors.text_muted);
    primitives.textPos(box_x + 20.0, info_y + 8.0);
    if (parsed.title.len > 0) {
        const max_display: usize = 45;
        if (parsed.title.len <= max_display) {
            sdtx.print("Title: {s}", .{parsed.title});
        } else {
            sdtx.print("Title: {s}...", .{parsed.title[0..max_display]});
        }
    } else {
        sdtx.print("Title: (enter a title)", .{});
    }

    // Parsed time
    primitives.textPos(box_x + 20.0, info_y + 22.0);
    if (parsed.start_minutes) |start| {
        var start_buf: [16]u8 = undefined;
        const start_str = cronos.events.formatMinutes(start, &start_buf);
        if (parsed.end_minutes) |end_val| {
            var end_buf: [16]u8 = undefined;
            const end_str = cronos.events.formatMinutes(end_val, &end_buf);
            sdtx.print("Time:  {s} - {s}", .{ start_str, end_str });
        } else {
            sdtx.print("Time:  {s}", .{start_str});
        }
    } else {
        sdtx.print("Time:  All day", .{});
    }

    // Color name
    primitives.textPos(box_x + 44.0, info_y + 50.0);
    sdtx.print("{s}", .{theme.getEventColorName(parsed.color)});

    // Help text
    primitives.setTextColor(theme.colors.text_hint);
    primitives.textPos(box_x + 16.0, box_y + 150.0);
    sdtx.print("Tip: 2pm, 2-3pm, 10:30am  #red #blue #green", .{});

    // Footer
    primitives.setTextColor(theme.colors.text_muted);
    primitives.textPos(box_x + 16.0, box_y + box_h - 20.0);
    if (is_edit) {
        sdtx.print("Enter: save  Esc: discard changes", .{});
    } else {
        sdtx.print("Enter: save  Esc: close", .{});
    }
}
