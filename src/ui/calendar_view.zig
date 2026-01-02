const sokol = @import("sokol");
const sgl = sokol.gl;
const sdtx = sokol.debugtext;
const cronos = @import("lib/cronos");
const render = @import("../render/sokol_context.zig");
const state_mod = @import("../app/state.zig");
const State = state_mod.State;

pub fn draw(state: *const State, width: f32, height: f32) void {
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
    const weekday_names = [_][]const u8{
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun",
    };

    const margin: f32 = 32.0;
    const header_h: f32 = 28.0;
    const weekday_h: f32 = 20.0;
    const grid_left = margin;
    const grid_right = width - margin;
    const grid_top = margin + header_h + weekday_h;
    const grid_bottom = height - margin;
    const cell_w = (grid_right - grid_left) / 7.0;
    const cell_h = (grid_bottom - grid_top) / 6.0;

    render.setup2D(width, height);

    const days_in_month = cronos.calendar.daysInMonth(state.current_year, state.current_month);
    const first_weekday = cronos.calendar.weekdayOfFirst(state.current_year, state.current_month);

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

        const is_today = state.current_year == state.today.year and
            state.current_month == state.today.month and
            day == state.today.day;
        const is_selected = state.current_year == state.selected.year and
            state.current_month == state.selected.month and
            day == state.selected.day;

        if (is_selected) {
            sgl.c4f(0.9, 0.6, 0.2, 0.35);
        } else if (is_today) {
            sgl.c4f(0.2, 0.6, 0.2, 0.25);
        } else {
            continue;
        }

        sgl.v2f(x0, y0);
        sgl.v2f(x1, y0);
        sgl.v2f(x1, y1);
        sgl.v2f(x0, y1);
    }
    sgl.end();

    sgl.beginLines();
    sgl.c3f(0.2, 0.2, 0.25);
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

    const any_modal_open = state.event_modal_mode != .closed or state.view_modal_open or state.goto_modal_open;
    if (!any_modal_open) {
        sdtx.canvas(width, height);
        sdtx.origin(0.0, 0.0);
        sdtx.font(0);
        sdtx.color3f(0.1, 0.1, 0.15);

        const month_name = month_names[state.current_month - 1];
        sdtx.pos(grid_left / 8.0, margin / 8.0);
        sdtx.print("< {s} {d} >", .{ month_name, state.current_year });
        sdtx.pos(grid_left / 8.0, (margin + 14.0) / 8.0);

        var wd: u8 = 0;
        while (wd < weekday_names.len) : (wd += 1) {
            const label = weekday_names[wd];
            const x = grid_left + cell_w * @as(f32, @floatFromInt(wd)) + 6.0;
            const y = grid_top - weekday_h + 4.0;
            sdtx.pos(x / 8.0, y / 8.0);
            sdtx.print("{s}", .{label});
        }

        day = 1;
        while (day <= days_in_month) : (day += 1) {
            const cell_index = first_weekday + (day - 1);
            const row = cell_index / 7;
            const col = cell_index % 7;
            const x = grid_left + cell_w * @as(f32, @floatFromInt(col)) + 6.0;
            const y = grid_top + cell_h * @as(f32, @floatFromInt(row)) + 6.0;
            sdtx.pos(x / 8.0, y / 8.0);
            sdtx.print("{d}", .{day});

            const date_days = cronos.calendar.daysFromCivil(state.current_year, state.current_month, day);
            const title = cronos.events.firstTitle(state.events[0..state.events_count], date_days);
            if (title.len > 0) {
                const preview_len = if (title.len > 8) 8 else title.len;
                sdtx.pos(x / 8.0, (y + 12.0) / 8.0);
                sdtx.print("{s}", .{title[0..preview_len]});
            }
        }
    }
}
