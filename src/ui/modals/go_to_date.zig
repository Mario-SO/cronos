//! Go To Date Modal
//!
//! This modal allows users to quickly jump to a specific date
//! by entering day, month (abbreviation), and optionally year.

const std = @import("std");
const sokol = @import("sokol");
const sgl = sokol.gl;
const sdtx = sokol.debugtext;
const sapp = sokol.app;
const cronos = @import("lib/cronos");
const render = @import("../../render/sokol_context.zig");
const commands = @import("../../app/commands.zig");
const State = @import("../../app/state.zig").State;
const primitives = @import("../primitives.zig");
const theme = @import("../theme.zig");

pub fn isOpen(state: *const State) bool {
    return state.goto_modal.open;
}

pub fn handleEvent(state: *State, ev: sapp.Event) void {
    if (ev.type == .KEY_DOWN and !ev.key_repeat) {
        switch (ev.key_code) {
            .ESCAPE => {
                state.goto_modal.open = false;
            },
            .ENTER, .KP_ENTER => {
                if (commands.goToDateFromInput(state)) {
                    state.goto_modal.open = false;
                }
            },
            .TAB => {
                if ((ev.modifiers & sapp.modifier_shift) != 0) {
                    // Shift+Tab: go backwards
                    state.goto_modal.focus = if (state.goto_modal.focus == 0) 2 else state.goto_modal.focus - 1;
                } else {
                    // Tab: go forward
                    state.goto_modal.focus = (state.goto_modal.focus + 1) % 3;
                }
            },
            .BACKSPACE => {
                switch (state.goto_modal.focus) {
                    0 => {
                        if (state.goto_modal.day_len > 0) {
                            state.goto_modal.day_len -= 1;
                            state.goto_modal.day_input[state.goto_modal.day_len] = 0;
                        }
                    },
                    1 => {
                        if (state.goto_modal.month_len > 0) {
                            state.goto_modal.month_len -= 1;
                            state.goto_modal.month_input[state.goto_modal.month_len] = 0;
                        }
                    },
                    2 => {
                        if (state.goto_modal.year_len > 0) {
                            state.goto_modal.year_len -= 1;
                            state.goto_modal.year_input[state.goto_modal.year_len] = 0;
                        }
                    },
                    else => {},
                }
            },
            else => {},
        }
    } else if (ev.type == .CHAR) {
        const ch = ev.char_code;
        if (state.goto_modal.ignore_next_char) {
            state.goto_modal.ignore_next_char = false;
            if (ch == 'g' or ch == 'G') return;
        }
        if (ch >= 32 and ch < 127) {
            switch (state.goto_modal.focus) {
                0 => {
                    // Day field: only digits, max 2 chars
                    if (ch >= '0' and ch <= '9' and state.goto_modal.day_len < 2) {
                        state.goto_modal.day_input[state.goto_modal.day_len] = @intCast(ch);
                        state.goto_modal.day_len += 1;
                        state.goto_modal.day_input[state.goto_modal.day_len] = 0;
                        // Auto-advance after 2 digits
                        if (state.goto_modal.day_len == 2) {
                            state.goto_modal.focus = 1;
                        }
                    }
                },
                1 => {
                    // Month field: only letters, max 3 chars
                    if ((ch >= 'a' and ch <= 'z') or (ch >= 'A' and ch <= 'Z')) {
                        if (state.goto_modal.month_len < 3) {
                            state.goto_modal.month_input[state.goto_modal.month_len] = @intCast(ch);
                            state.goto_modal.month_len += 1;
                            state.goto_modal.month_input[state.goto_modal.month_len] = 0;
                        }
                    }
                },
                2 => {
                    // Year field: only digits, max 4 chars
                    if (ch >= '0' and ch <= '9' and state.goto_modal.year_len < 4) {
                        state.goto_modal.year_input[state.goto_modal.year_len] = @intCast(ch);
                        state.goto_modal.year_len += 1;
                        state.goto_modal.year_input[state.goto_modal.year_len] = 0;
                    }
                },
                else => {},
            }
        }
    }
}

pub fn draw(state: *const State, width: f32, height: f32) void {
    if (!state.goto_modal.open) return;

    render.setup2D(width, height);

    // Draw modal overlay and box
    primitives.drawModalOverlay(width, height);
    const modal_size = theme.modal_sizes.goto_date;
    const pos = primitives.drawCenteredModal(width, height, modal_size);
    const box_x = pos.x;
    const box_y = pos.y;
    const box_h = modal_size.height;

    // Input field layout
    const field_y = box_y + 50.0;
    const day_x = box_x + 20.0;
    const month_x = box_x + 90.0;
    const year_x = box_x + 180.0;
    const field_h: f32 = 28.0;

    // Draw input field boxes
    primitives.drawInputField(day_x, field_y, 50.0, field_h, state.goto_modal.focus == 0);
    primitives.drawInputField(month_x, field_y, 70.0, field_h, state.goto_modal.focus == 1);
    primitives.drawInputField(year_x, field_y, 80.0, field_h, state.goto_modal.focus == 2);

    // Setup text rendering
    primitives.setupText(width, height);

    // Title
    primitives.textPos(box_x + 16.0, box_y + 14.0);
    sdtx.print("Go to Date", .{});

    // Field labels
    primitives.textPos(day_x + 4.0, field_y - 14.0);
    sdtx.print("Day", .{});
    primitives.textPos(month_x + 4.0, field_y - 14.0);
    sdtx.print("Month", .{});
    primitives.textPos(year_x + 4.0, field_y - 14.0);
    sdtx.print("Year", .{});

    // Get input values
    const day_input = std.mem.sliceTo(state.goto_modal.day_input[0..], 0);
    const month_input = std.mem.sliceTo(state.goto_modal.month_input[0..], 0);
    const year_input = std.mem.sliceTo(state.goto_modal.year_input[0..], 0);

    // Day field value
    primitives.textPos(day_x + 6.0, field_y + 8.0);
    if (day_input.len == 0 and state.goto_modal.focus != 0) {
        primitives.setTextColor(theme.colors.text_placeholder);
        sdtx.print("dd", .{});
    } else {
        primitives.setTextColor(theme.colors.text);
        if (state.goto_modal.focus == 0) {
            sdtx.print("{s}_", .{day_input});
        } else {
            sdtx.print("{s}", .{day_input});
        }
    }

    // Month field value
    primitives.textPos(month_x + 6.0, field_y + 8.0);
    if (month_input.len == 0 and state.goto_modal.focus != 1) {
        primitives.setTextColor(theme.colors.text_placeholder);
        sdtx.print("mon", .{});
    } else {
        // Check if valid month prefix
        const is_valid = cronos.calendar.isValidMonthPrefix(month_input);
        if (month_input.len > 0 and !is_valid) {
            primitives.setTextColor(theme.colors.text_error);
        } else {
            primitives.setTextColor(theme.colors.text);
        }
        if (state.goto_modal.focus == 1) {
            sdtx.print("{s}_", .{month_input});
        } else {
            sdtx.print("{s}", .{month_input});
        }
    }

    // Year field value
    primitives.textPos(year_x + 6.0, field_y + 8.0);
    if (year_input.len == 0 and state.goto_modal.focus != 2) {
        primitives.setTextColor(theme.colors.text_placeholder);
        // Show current year as placeholder
        sdtx.print("{d}", .{state.calendar.today.year});
    } else {
        primitives.setTextColor(theme.colors.text);
        if (state.goto_modal.focus == 2) {
            sdtx.print("{s}_", .{year_input});
        } else {
            sdtx.print("{s}", .{year_input});
        }
    }

    // Help text
    primitives.setTextColor(theme.colors.text_time);
    primitives.textPos(box_x + 16.0, box_y + box_h - 22.0);
    sdtx.print("Tab: next  Enter: go  Esc: cancel", .{});
}
