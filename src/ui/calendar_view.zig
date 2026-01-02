//! Calendar View
//!
//! The main calendar grid display showing the current month with
//! day cells, event previews, and date selection highlighting.

const std = @import("std");
const sokol = @import("sokol");
const sgl = sokol.gl;
const sdtx = sokol.debugtext;
const cronos = @import("lib/cronos");
const render = @import("../render/sokol_context.zig");
const state_mod = @import("../app/state.zig");
const State = state_mod.State;
const primitives = @import("primitives.zig");
const theme = @import("theme.zig");

pub fn draw(state: *const State, width: f32, height: f32) void {
    const margin = theme.layout.calendar_margin;
    const header_h = theme.layout.header_height;
    const weekday_h = theme.layout.weekday_height;
    const grid_left = margin;
    const grid_right = width - margin;
    const grid_top = margin + header_h + weekday_h;
    const grid_bottom = height - margin;
    const cell_w = (grid_right - grid_left) / 7.0;
    const cell_h = (grid_bottom - grid_top) / 6.0;

    render.setup2D(width, height);

    const cal = &state.calendar;
    const days_in_month = cronos.calendar.daysInMonth(cal.current_year, cal.current_month);
    const first_weekday = cronos.calendar.weekdayOfFirst(cal.current_year, cal.current_month);

    // Draw highlighted cells (selected/today)
    sgl.beginQuads();
    var day: u8 = 1;
    while (day <= days_in_month) : (day += 1) {
        const cell_index = first_weekday + (day - 1);
        const row = cell_index / 7;
        const col = cell_index % 7;

        const x0 = grid_left + cell_w * @as(f32, @floatFromInt(col));
        const y0 = grid_top + cell_h * @as(f32, @floatFromInt(row));
        const x1 = x0 + cell_w;
        const y1 = y0 + cell_h;

        const is_today = cal.current_year == cal.today.year and
            cal.current_month == cal.today.month and
            day == cal.today.day;
        const is_selected = cal.current_year == cal.selected.year and
            cal.current_month == cal.selected.month and
            day == cal.selected.day;

        if (is_selected) {
            const c = theme.colors.cell_selected;
            sgl.c4f(c.r, c.g, c.b, c.a);
        } else if (is_today) {
            const c = theme.colors.cell_today;
            sgl.c4f(c.r, c.g, c.b, c.a);
        } else {
            continue;
        }

        sgl.v2f(x0, y0);
        sgl.v2f(x1, y0);
        sgl.v2f(x1, y1);
        sgl.v2f(x0, y1);
    }
    sgl.end();

    // Draw cell borders
    sgl.beginLines();
    const border = theme.colors.border;
    sgl.c3f(border.r, border.g, border.b);
    day = 1;
    while (day <= days_in_month) : (day += 1) {
        const cell_index = first_weekday + (day - 1);
        const row = cell_index / 7;
        const col = cell_index % 7;

        const x0 = grid_left + cell_w * @as(f32, @floatFromInt(col));
        const y0 = grid_top + cell_h * @as(f32, @floatFromInt(row));
        const x1 = x0 + cell_w;
        const y1 = y0 + cell_h;

        sgl.v2f(x0, y0);
        sgl.v2f(x1, y0);
        sgl.v2f(x1, y0);
        sgl.v2f(x1, y1);
        sgl.v2f(x1, y1);
        sgl.v2f(x0, y1);
        sgl.v2f(x0, y1);
        sgl.v2f(x0, y0);
    }
    sgl.end();

    // Only draw text when no modal is open (text would overlap)
    if (!state.isAnyModalOpen()) {
        primitives.setupText(width, height);

        // Month/Year header
        const month_name = cronos.calendar.monthName(cal.current_month);
        primitives.textPos(grid_left, margin);
        sdtx.print("< {s} {d} >", .{ month_name, cal.current_year });

        // Weekday headers
        var wd: u8 = 0;
        while (wd < cronos.calendar.weekday_names.len) : (wd += 1) {
            const label = cronos.calendar.weekday_names[wd];
            const x = grid_left + cell_w * @as(f32, @floatFromInt(wd)) + 6.0;
            const y = grid_top - weekday_h + 4.0;
            primitives.textPos(x, y);
            sdtx.print("{s}", .{label});
        }

        // Day numbers and event previews
        day = 1;
        while (day <= days_in_month) : (day += 1) {
            const cell_index = first_weekday + (day - 1);
            const row = cell_index / 7;
            const col = cell_index % 7;
            const x = grid_left + cell_w * @as(f32, @floatFromInt(col)) + 6.0;
            const y = grid_top + cell_h * @as(f32, @floatFromInt(row)) + 6.0;
            primitives.textPos(x, y);
            sdtx.print("{d}", .{day});

            // Event previews with color indicators
            const date_days = cronos.calendar.daysFromCivil(cal.current_year, cal.current_month, day);
            const events = state.events.constSlice();
            var preview_y = y + 14.0;
            const line_height = 12.0;
            // Calculate max events that fit in the cell (leave some padding at bottom)
            const available_height = cell_h - 24.0; // space below day number
            const max_events: usize = @intFromFloat(@max(1.0, available_height / line_height));
            var event_count: usize = 0;

            for (events) |ev| {
                if (ev.date_days != date_days) continue;
                if (event_count >= max_events) break;

                const title = std.mem.sliceTo(ev.title[0..], 0);
                // Draw color indicator square
                primitives.drawColorIndicatorSized(x, preview_y, 6.0, 8.0, ev.color);
                // Create a null-terminated buffer for the preview
                // (sokol debugtext expects null-terminated strings)
                if (title.len > 0) {
                    var preview_buf: [9]u8 = .{0} ** 9;
                    const preview_len = @min(title.len, 8);
                    @memcpy(preview_buf[0..preview_len], title[0..preview_len]);
                    primitives.textPos(x + 10.0, preview_y - 2.0);
                    sdtx.print("{s}", .{&preview_buf});
                }

                preview_y += line_height;
                event_count += 1;
            }

            // Show "+N more" if there are more events than we can display
            const total_events = cronos.events.countForDay(events, date_days);
            if (total_events > max_events) {
                primitives.setTextColor(theme.colors.text_muted);
                primitives.textPos(x, preview_y - 2.0);
                sdtx.print("+{d} more", .{total_events - max_events});
                primitives.setTextColor(theme.colors.text);
            }
        }
    }
}
