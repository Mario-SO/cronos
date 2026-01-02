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

pub fn handleEvent(state: *State, ev: sapp.Event) void {
    if (ev.type == .KEY_DOWN and !ev.key_repeat) {
        switch (ev.key_code) {
            .ESCAPE, .V => {
                state.view_modal_open = false;
            },
            .H, .K => {
                if (state.view_selected_index > 0) {
                    state.view_selected_index -= 1;
                }
            },
            .J, .L => {
                const selected_days = cronos.calendar.daysFromCivil(state.selected.year, state.selected.month, state.selected.day);
                const total = cronos.events.countForDay(state.events[0..state.events_count], selected_days);
                if (total > 0 and state.view_selected_index + 1 < total) {
                    state.view_selected_index += 1;
                }
            },
            .E => {
                commands.openEditModal(state);
            },
            .D => {
                const selected_days = cronos.calendar.daysFromCivil(state.selected.year, state.selected.month, state.selected.day);
                cronos.events.deleteForDayAt(state.events[0..], &state.events_count, selected_days, state.view_selected_index);
                const total = cronos.events.countForDay(state.events[0..state.events_count], selected_days);
                if (total == 0) {
                    state.view_selected_index = 0;
                } else if (state.view_selected_index >= total) {
                    state.view_selected_index = total - 1;
                }
            },
            else => {},
        }
    }
}

pub fn draw(state: *const State, width: f32, height: f32) void {
    if (!state.view_modal_open) return;
    // Don't draw when edit modal is open on top
    if (state.event_modal_mode == .edit) return;

    render.setup2D(width, height);
    sgl.beginQuads();
    sgl.c4f(0.0, 0.0, 0.0, 0.35);
    sgl.v2f(0.0, 0.0);
    sgl.v2f(width, 0.0);
    sgl.v2f(width, height);
    sgl.v2f(0.0, height);
    sgl.end();

    const box_w: f32 = 520.0;
    const box_h: f32 = 240.0;
    const box_x = (width - box_w) * 0.5;
    const box_y = (height - box_h) * 0.5;

    sgl.beginQuads();
    sgl.c4f(0.98, 0.98, 0.98, 1.0);
    sgl.v2f(box_x, box_y);
    sgl.v2f(box_x + box_w, box_y);
    sgl.v2f(box_x + box_w, box_y + box_h);
    sgl.v2f(box_x, box_y + box_h);
    sgl.end();

    sgl.beginLines();
    sgl.c3f(0.2, 0.2, 0.25);
    sgl.v2f(box_x, box_y);
    sgl.v2f(box_x + box_w, box_y);
    sgl.v2f(box_x + box_w, box_y);
    sgl.v2f(box_x + box_w, box_y + box_h);
    sgl.v2f(box_x + box_w, box_y + box_h);
    sgl.v2f(box_x, box_y + box_h);
    sgl.v2f(box_x, box_y + box_h);
    sgl.v2f(box_x, box_y);
    sgl.end();

    sdtx.canvas(width, height);
    sdtx.origin(0.0, 0.0);
    sdtx.font(0);
    sdtx.color3f(0.1, 0.1, 0.15);

    const month_names = [_][]const u8{
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    };
    const sel_month = month_names[state.selected.month - 1];
    sdtx.pos((box_x + 16.0) / 8.0, (box_y + 14.0) / 8.0);
    sdtx.print("Events for {s} {d}, {d}", .{ sel_month, state.selected.day, state.selected.year });

    const selected_days = cronos.calendar.daysFromCivil(state.selected.year, state.selected.month, state.selected.day);
    const max_lines: usize = 10;
    const total = cronos.events.countForDay(state.events[0..state.events_count], selected_days);
    var start: usize = 0;
    if (total > max_lines) {
        if (state.view_selected_index + 1 > max_lines) {
            start = state.view_selected_index + 1 - max_lines;
        }
        if (start + max_lines > total) {
            start = total - max_lines;
        }
    }

    var line_y = box_y + 44.0;
    var shown: usize = 0;
    var match_index: usize = 0;
    var idx: usize = 0;
    while (idx < state.events_count and shown < max_lines) : (idx += 1) {
        const ev = state.events[idx];
        if (ev.date_days != selected_days) continue;
        if (match_index < start) {
            match_index += 1;
            continue;
        }

        // Draw color indicator
        const color = cronos.events.colors[ev.color];
        sgl.beginQuads();
        sgl.c3f(color.r, color.g, color.b);
        const indicator_y = line_y + 1.0;
        sgl.v2f(box_x + 16.0, indicator_y);
        sgl.v2f(box_x + 24.0, indicator_y);
        sgl.v2f(box_x + 24.0, indicator_y + 10.0);
        sgl.v2f(box_x + 16.0, indicator_y + 10.0);
        sgl.end();

        const title = std.mem.sliceTo(ev.title[0..], 0);
        const prefix: []const u8 = if (match_index == state.view_selected_index) "> " else "  ";

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

        sdtx.color3f(0.1, 0.1, 0.15);
        sdtx.pos((box_x + 28.0) / 8.0, line_y / 8.0);
        if (time_len > 0) {
            sdtx.color3f(0.4, 0.4, 0.45);
            sdtx.print("{s}", .{time_str[0..time_len]});
            sdtx.color3f(0.1, 0.1, 0.15);
            sdtx.print("{s}{s}", .{ prefix, title });
        } else {
            sdtx.print("{s}{s}", .{ prefix, title });
        }

        line_y += 16.0;
        shown += 1;
        match_index += 1;
    }
    if (total == 0) {
        sdtx.pos((box_x + 16.0) / 8.0, line_y / 8.0);
        sdtx.print("No events.", .{});
    }
    sdtx.pos((box_x + 16.0) / 8.0, (box_y + box_h - 20.0) / 8.0);
    sdtx.print("J/K: move  E: edit  D: delete  Esc: close", .{});
}
