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

pub fn handleEvent(state: *State, ev: sapp.Event) void {
    if (ev.type == .KEY_DOWN and !ev.key_repeat) {
        switch (ev.key_code) {
            .ESCAPE => {
                if (state.event_modal_mode == .edit) {
                    // Return to view modal without saving
                    state.event_modal_mode = .closed;
                    // view_modal_open is still true, so we go back to it
                } else {
                    state.event_modal_mode = .closed;
                }
            },
            .ENTER, .KP_ENTER => {
                if (state.event_modal_mode == .edit) {
                    if (commands.saveEditedEvent(state)) {
                        state.event_modal_mode = .closed;
                        // Return to view modal
                    }
                } else {
                    if (commands.addEventFromInput(state)) {
                        state.event_modal_mode = .closed;
                    }
                }
            },
            .BACKSPACE => {
                if (state.event_input_len > 0) {
                    state.event_input_len -= 1;
                    state.event_input[state.event_input_len] = 0;
                }
            },
            else => {},
        }
    } else if (ev.type == .CHAR) {
        const ch = ev.char_code;
        if (state.event_ignore_next_char) {
            state.event_ignore_next_char = false;
            if (ch == 'a' or ch == 'A' or ch == 'e' or ch == 'E') return;
        }
        if (ch >= 32 and ch < 127) {
            if (state.event_input_len + 1 < state.event_input.len) {
                state.event_input[state.event_input_len] = @intCast(ch);
                state.event_input_len += 1;
                state.event_input[state.event_input_len] = 0;
            }
        }
    }
}

pub fn draw(state: *const State, width: f32, height: f32) void {
    if (state.event_modal_mode == .closed) return;

    const is_edit = state.event_modal_mode == .edit;

    render.setup2D(width, height);

    // Note: Background blur is handled by sokol_context when modals are open

    const box_w: f32 = 420.0;
    const box_h: f32 = 220.0;
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
    const modal_title = if (is_edit) "Edit Event" else "Add Event";
    sdtx.pos((box_x + 16.0) / 8.0, (box_y + 14.0) / 8.0);
    sdtx.print("{s} - {s} {d}, {d}", .{ modal_title, sel_month, state.selected.day, state.selected.year });

    const input = std.mem.sliceTo(state.event_input[0..], 0);
    sdtx.pos((box_x + 16.0) / 8.0, (box_y + 38.0) / 8.0);
    sdtx.print("> {s}_", .{input});

    // Parse input and show feedback
    const parsed = cronos.input_parser.parse(input);

    // Draw parsed info box
    const info_y = box_y + 62.0;
    sgl.beginQuads();
    sgl.c4f(0.94, 0.94, 0.96, 1.0);
    sgl.v2f(box_x + 12.0, info_y);
    sgl.v2f(box_x + box_w - 12.0, info_y);
    sgl.v2f(box_x + box_w - 12.0, info_y + 70.0);
    sgl.v2f(box_x + 12.0, info_y + 70.0);
    sgl.end();

    // Draw color indicator
    const color = cronos.events.colors[parsed.color];
    sgl.beginQuads();
    sgl.c3f(color.r, color.g, color.b);
    sgl.v2f(box_x + 20.0, info_y + 50.0);
    sgl.v2f(box_x + 36.0, info_y + 50.0);
    sgl.v2f(box_x + 36.0, info_y + 62.0);
    sgl.v2f(box_x + 20.0, info_y + 62.0);
    sgl.end();

    sdtx.color3f(0.3, 0.3, 0.35);
    sdtx.pos((box_x + 20.0) / 8.0, (info_y + 8.0) / 8.0);
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

    sdtx.pos((box_x + 20.0) / 8.0, (info_y + 22.0) / 8.0);
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

    sdtx.pos((box_x + 44.0) / 8.0, (info_y + 50.0) / 8.0);
    sdtx.print("{s}", .{color.name});

    // Help text
    sdtx.color3f(0.5, 0.5, 0.55);
    sdtx.pos((box_x + 16.0) / 8.0, (box_y + 150.0) / 8.0);
    sdtx.print("Tip: 2pm, 2-3pm, 10:30am  #red #blue #green", .{});

    sdtx.color3f(0.3, 0.3, 0.35);
    sdtx.pos((box_x + 16.0) / 8.0, (box_y + box_h - 20.0) / 8.0);
    if (is_edit) {
        sdtx.print("Enter: save  |  Esc: discard changes", .{});
    } else {
        sdtx.print("Enter: save  |  Esc: cancel", .{});
    }
}
