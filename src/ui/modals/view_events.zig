//! View Events Modal
//!
//! This modal displays all events for the selected date and allows
//! users to navigate, edit, or delete them.

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
const primitives = @import("../primitives.zig");
const theme = @import("../theme.zig");

pub fn isOpen(state: *const State) bool {
    return state.view_modal.open;
}

pub fn handleEvent(state: *State, ev: sapp.Event) void {
    if (ev.type == .KEY_DOWN and !ev.key_repeat) {
        switch (ev.key_code) {
            .ESCAPE, .V => {
                state.view_modal.open = false;
            },
            .H, .K => {
                if (state.view_modal.selected_index > 0) {
                    state.view_modal.selected_index -= 1;
                }
            },
            .J, .L => {
                const selected_days = state.calendar.selectedDateDays();
                const total = cronos.events.countForDay(state.events.constSlice(), selected_days);
                if (total > 0 and state.view_modal.selected_index + 1 < total) {
                    state.view_modal.selected_index += 1;
                }
            },
            .E => {
                commands.openEditModal(state);
            },
            .D => {
                const selected_days = state.calendar.selectedDateDays();
                cronos.events.deleteForDayAt(state.events.items[0..], &state.events.count, selected_days, state.view_modal.selected_index);
                const total = cronos.events.countForDay(state.events.constSlice(), selected_days);
                if (total == 0) {
                    state.view_modal.selected_index = 0;
                } else if (state.view_modal.selected_index >= total) {
                    state.view_modal.selected_index = total - 1;
                }
            },
            else => {},
        }
    }
}

pub fn draw(state: *const State, width: f32, height: f32) void {
    if (!state.view_modal.open) return;
    // Don't draw when edit modal is open on top
    if (state.event_modal.mode == .edit) return;

    render.setup2D(width, height);

    // Draw modal overlay and box
    primitives.drawModalOverlay(width, height);
    const modal_size = theme.modal_sizes.view_events;
    const pos = primitives.drawCenteredModal(width, height, modal_size);
    const box_x = pos.x;
    const box_y = pos.y;
    const box_h = modal_size.height;

    // Setup text rendering
    primitives.setupText(width, height);

    // Title
    const sel_month = cronos.calendar.monthName(state.calendar.selected.month);
    primitives.textPos(box_x + 16.0, box_y + 14.0);
    sdtx.print("Events for {s} {d}, {d}", .{ sel_month, state.calendar.selected.day, state.calendar.selected.year });

    // Calculate visible events with scrolling
    const selected_days = state.calendar.selectedDateDays();
    const max_lines: usize = 10;
    const total = cronos.events.countForDay(state.events.constSlice(), selected_days);
    var start: usize = 0;
    if (total > max_lines) {
        if (state.view_modal.selected_index + 1 > max_lines) {
            start = state.view_modal.selected_index + 1 - max_lines;
        }
        if (start + max_lines > total) {
            start = total - max_lines;
        }
    }

    // Draw event list
    var line_y = box_y + 44.0;
    var shown: usize = 0;
    var match_index: usize = 0;
    var idx: usize = 0;
    while (idx < state.events.count and shown < max_lines) : (idx += 1) {
        const ev = state.events.items[idx];
        if (ev.date_days != selected_days) continue;
        if (match_index < start) {
            match_index += 1;
            continue;
        }

        // Draw color indicator
        primitives.drawColorIndicatorSized(box_x + 16.0, line_y + 1.0, 8.0, 10.0, ev.color);

        const title = std.mem.sliceTo(ev.title[0..], 0);
        const prefix: []const u8 = if (match_index == state.view_modal.selected_index) "> " else "  ";

        // Format time string
        var time_str: [32]u8 = undefined;
        var time_len: usize = 0;
        if (ev.start_minutes) |start_min| {
            var start_buf: [16]u8 = undefined;
            const start_fmt = cronos.events.formatMinutes(start_min, &start_buf);
            if (ev.end_minutes) |end_min| {
                var end_buf: [16]u8 = undefined;
                const end_fmt = cronos.events.formatMinutes(end_min, &end_buf);
                const formatted = std.fmt.bufPrint(&time_str, "{s}-{s} ", .{ start_fmt, end_fmt }) catch "";
                time_len = formatted.len;
            } else {
                const formatted = std.fmt.bufPrint(&time_str, "{s} ", .{start_fmt}) catch "";
                time_len = formatted.len;
            }
        }

        primitives.textPos(box_x + 28.0, line_y);
        if (time_len > 0) {
            primitives.setTextColor(theme.colors.text_time);
            sdtx.print("{s}", .{time_str[0..time_len]});
            primitives.setTextColor(theme.colors.text);
            sdtx.print("{s}{s}", .{ prefix, title });
        } else {
            primitives.setTextColor(theme.colors.text);
            sdtx.print("{s}{s}", .{ prefix, title });
        }

        line_y += 16.0;
        shown += 1;
        match_index += 1;
    }

    // Empty state
    if (total == 0) {
        primitives.textPos(box_x + 16.0, line_y);
        sdtx.print("No events.", .{});
    }

    // Footer help text
    primitives.setTextColor(theme.colors.text_muted);
    primitives.textPos(box_x + 16.0, box_y + box_h - 20.0);
    sdtx.print("J/K: move  E: edit  D: delete  Esc: close", .{});
}
