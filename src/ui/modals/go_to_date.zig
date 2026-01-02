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
                state.goto_modal_open = false;
            },
            .ENTER, .KP_ENTER => {
                if (commands.goToDateFromInput(state)) {
                    state.goto_modal_open = false;
                }
            },
            .TAB => {
                if ((ev.modifiers & sapp.modifier_shift) != 0) {
                    // Shift+Tab: go backwards
                    state.goto_focus = if (state.goto_focus == 0) 2 else state.goto_focus - 1;
                } else {
                    // Tab: go forward
                    state.goto_focus = (state.goto_focus + 1) % 3;
                }
            },
            .BACKSPACE => {
                switch (state.goto_focus) {
                    0 => {
                        if (state.goto_day_len > 0) {
                            state.goto_day_len -= 1;
                            state.goto_day_input[state.goto_day_len] = 0;
                        }
                    },
                    1 => {
                        if (state.goto_month_len > 0) {
                            state.goto_month_len -= 1;
                            state.goto_month_input[state.goto_month_len] = 0;
                        }
                    },
                    2 => {
                        if (state.goto_year_len > 0) {
                            state.goto_year_len -= 1;
                            state.goto_year_input[state.goto_year_len] = 0;
                        }
                    },
                    else => {},
                }
            },
            else => {},
        }
    } else if (ev.type == .CHAR) {
        const ch = ev.char_code;
        if (state.goto_ignore_next_char) {
            state.goto_ignore_next_char = false;
            if (ch == 'g' or ch == 'G') return;
        }
        if (ch >= 32 and ch < 127) {
            switch (state.goto_focus) {
                0 => {
                    // Day field: only digits, max 2 chars
                    if (ch >= '0' and ch <= '9' and state.goto_day_len < 2) {
                        state.goto_day_input[state.goto_day_len] = @intCast(ch);
                        state.goto_day_len += 1;
                        state.goto_day_input[state.goto_day_len] = 0;
                        // Auto-advance after 2 digits
                        if (state.goto_day_len == 2) {
                            state.goto_focus = 1;
                        }
                    }
                },
                1 => {
                    // Month field: only letters, max 3 chars
                    if ((ch >= 'a' and ch <= 'z') or (ch >= 'A' and ch <= 'Z')) {
                        if (state.goto_month_len < 3) {
                            state.goto_month_input[state.goto_month_len] = @intCast(ch);
                            state.goto_month_len += 1;
                            state.goto_month_input[state.goto_month_len] = 0;
                        }
                    }
                },
                2 => {
                    // Year field: only digits, max 4 chars
                    if (ch >= '0' and ch <= '9' and state.goto_year_len < 4) {
                        state.goto_year_input[state.goto_year_len] = @intCast(ch);
                        state.goto_year_len += 1;
                        state.goto_year_input[state.goto_year_len] = 0;
                    }
                },
                else => {},
            }
        }
    }
}

pub fn draw(state: *const State, width: f32, height: f32) void {
    if (!state.goto_modal_open) return;

    render.setup2D(width, height);

    // Note: Background blur is handled by sokol_context when modals are open

    // Modal box
    const box_w: f32 = 380.0;
    const box_h: f32 = 140.0;
    const box_x = (width - box_w) * 0.5;
    const box_y = (height - box_h) * 0.5;

    sgl.beginQuads();
    sgl.c4f(0.98, 0.98, 0.98, 1.0);
    sgl.v2f(box_x, box_y);
    sgl.v2f(box_x + box_w, box_y);
    sgl.v2f(box_x + box_w, box_y + box_h);
    sgl.v2f(box_x, box_y + box_h);
    sgl.end();

    // Border
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

    // Input field boxes
    const field_y = box_y + 50.0;
    const day_x = box_x + 20.0;
    const month_x = box_x + 90.0;
    const year_x = box_x + 180.0;
    const field_h: f32 = 28.0;

    // Day field box (width 50)
    drawFieldBox(day_x, field_y, 50.0, field_h, state.goto_focus == 0);
    // Month field box (width 70)
    drawFieldBox(month_x, field_y, 70.0, field_h, state.goto_focus == 1);
    // Year field box (width 80)
    drawFieldBox(year_x, field_y, 80.0, field_h, state.goto_focus == 2);

    // Text rendering
    sdtx.canvas(width, height);
    sdtx.origin(0.0, 0.0);
    sdtx.font(0);
    sdtx.color3f(0.1, 0.1, 0.15);

    // Title
    sdtx.pos((box_x + 16.0) / 8.0, (box_y + 14.0) / 8.0);
    sdtx.print("Go to Date", .{});

    // Labels
    sdtx.pos((day_x + 4.0) / 8.0, (field_y - 14.0) / 8.0);
    sdtx.print("Day", .{});
    sdtx.pos((month_x + 4.0) / 8.0, (field_y - 14.0) / 8.0);
    sdtx.print("Month", .{});
    sdtx.pos((year_x + 4.0) / 8.0, (field_y - 14.0) / 8.0);
    sdtx.print("Year", .{});

    // Input values or placeholders
    const day_input = std.mem.sliceTo(state.goto_day_input[0..], 0);
    const month_input = std.mem.sliceTo(state.goto_month_input[0..], 0);
    const year_input = std.mem.sliceTo(state.goto_year_input[0..], 0);

    // Day field
    sdtx.pos((day_x + 6.0) / 8.0, (field_y + 8.0) / 8.0);
    if (day_input.len == 0 and state.goto_focus != 0) {
        sdtx.color3f(0.6, 0.6, 0.6);
        sdtx.print("dd", .{});
    } else {
        sdtx.color3f(0.1, 0.1, 0.15);
        if (state.goto_focus == 0) {
            sdtx.print("{s}_", .{day_input});
        } else {
            sdtx.print("{s}", .{day_input});
        }
    }

    // Month field
    sdtx.pos((month_x + 6.0) / 8.0, (field_y + 8.0) / 8.0);
    if (month_input.len == 0 and state.goto_focus != 1) {
        sdtx.color3f(0.6, 0.6, 0.6);
        sdtx.print("mon", .{});
    } else {
        // Check if valid month
        const is_valid = isValidMonthInput(month_input);
        if (month_input.len > 0 and !is_valid) {
            sdtx.color3f(0.8, 0.2, 0.2); // Red for invalid
        } else {
            sdtx.color3f(0.1, 0.1, 0.15);
        }
        if (state.goto_focus == 1) {
            sdtx.print("{s}_", .{month_input});
        } else {
            sdtx.print("{s}", .{month_input});
        }
    }

    // Year field
    sdtx.pos((year_x + 6.0) / 8.0, (field_y + 8.0) / 8.0);
    if (year_input.len == 0 and state.goto_focus != 2) {
        sdtx.color3f(0.6, 0.6, 0.6);
        // Show current year as placeholder
        sdtx.print("{d}", .{state.today.year});
    } else {
        sdtx.color3f(0.1, 0.1, 0.15);
        if (state.goto_focus == 2) {
            sdtx.print("{s}_", .{year_input});
        } else {
            sdtx.print("{s}", .{year_input});
        }
    }

    // Help text
    sdtx.color3f(0.4, 0.4, 0.45);
    sdtx.pos((box_x + 16.0) / 8.0, (box_y + box_h - 22.0) / 8.0);
    sdtx.print("Tab: next  Enter: go  Esc: cancel", .{});
}

fn drawFieldBox(x: f32, y: f32, w: f32, h: f32, focused: bool) void {
    // Background
    sgl.beginQuads();
    if (focused) {
        sgl.c4f(1.0, 1.0, 1.0, 1.0);
    } else {
        sgl.c4f(0.92, 0.92, 0.92, 1.0);
    }
    sgl.v2f(x, y);
    sgl.v2f(x + w, y);
    sgl.v2f(x + w, y + h);
    sgl.v2f(x, y + h);
    sgl.end();

    // Border
    sgl.beginLines();
    if (focused) {
        sgl.c3f(0.2, 0.5, 0.9); // Blue for focused
    } else {
        sgl.c3f(0.7, 0.7, 0.7);
    }
    sgl.v2f(x, y);
    sgl.v2f(x + w, y);
    sgl.v2f(x + w, y);
    sgl.v2f(x + w, y + h);
    sgl.v2f(x + w, y + h);
    sgl.v2f(x, y + h);
    sgl.v2f(x, y + h);
    sgl.v2f(x, y);
    sgl.end();

    // Underline for focused field
    if (focused) {
        sgl.beginLines();
        sgl.c3f(0.2, 0.5, 0.9);
        sgl.v2f(x, y + h);
        sgl.v2f(x + w, y + h);
        sgl.v2f(x, y + h + 1);
        sgl.v2f(x + w, y + h + 1);
        sgl.end();
    }
}

fn isValidMonthInput(input: []const u8) bool {
    if (input.len == 0) return true;
    const abbrevs = [_][]const u8{ "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec" };

    // Check if input is a prefix of any valid abbreviation
    for (abbrevs) |abbr| {
        if (input.len <= abbr.len) {
            var matches = true;
            for (0..input.len) |i| {
                if (std.ascii.toLower(input[i]) != abbr[i]) {
                    matches = false;
                    break;
                }
            }
            if (matches) return true;
        }
    }
    return false;
}
