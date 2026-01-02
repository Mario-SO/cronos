const std = @import("std");
const sokol = @import("sokol");
const sgl = sokol.gl;
const sdtx = sokol.debugtext;
const sapp = sokol.app;
const render = @import("../../render/sokol_context.zig");
const commands = @import("../../app/commands.zig");
const State = @import("../../app/state.zig").State;

pub fn handleEvent(state: *State, ev: sapp.Event) void {
    if (ev.type == .KEY_DOWN and !ev.key_repeat) {
        switch (ev.key_code) {
            .ESCAPE => {
                state.add_modal_open = false;
            },
            .ENTER, .KP_ENTER => {
                if (commands.addEventFromInput(state)) {
                    state.add_modal_open = false;
                }
            },
            .BACKSPACE => {
                if (state.add_input_len > 0) {
                    state.add_input_len -= 1;
                    state.add_input[state.add_input_len] = 0;
                }
            },
            else => {},
        }
    } else if (ev.type == .CHAR) {
        const ch = ev.char_code;
        if (state.add_ignore_next_char) {
            state.add_ignore_next_char = false;
            if (ch == 'a' or ch == 'A') return;
        }
        if (ch >= 32 and ch < 127) {
            if (state.add_input_len + 1 < state.add_input.len) {
                state.add_input[state.add_input_len] = @intCast(ch);
                state.add_input_len += 1;
                state.add_input[state.add_input_len] = 0;
            }
        }
    }
}

pub fn draw(state: *const State, width: f32, height: f32) void {
    if (!state.add_modal_open) return;

    render.setup2D(width, height);
    sgl.beginQuads();
    sgl.c4f(0.0, 0.0, 0.0, 0.35);
    sgl.v2f(0.0, 0.0);
    sgl.v2f(width, 0.0);
    sgl.v2f(width, height);
    sgl.v2f(0.0, height);
    sgl.end();

    const box_w: f32 = 420.0;
    const box_h: f32 = 160.0;
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

    sdtx.pos((box_x + 16.0) / 8.0, (box_y + 14.0) / 8.0);
    sdtx.print("Add Event", .{});
    sdtx.pos((box_x + 16.0) / 8.0, (box_y + 30.0) / 8.0);
    sdtx.print("Enter title and press Enter", .{});

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
    sdtx.pos((box_x + 16.0) / 8.0, (box_y + 46.0) / 8.0);
    sdtx.print("{s} {d}, {d}", .{ sel_month, state.selected.day, state.selected.year });

    const input = std.mem.sliceTo(state.add_input[0..], 0);
    sdtx.pos((box_x + 16.0) / 8.0, (box_y + 70.0) / 8.0);
    sdtx.print("> {s}_", .{input});

    sdtx.pos((box_x + 16.0) / 8.0, (box_y + 110.0) / 8.0);
    sdtx.print("Esc: cancel", .{});
}
