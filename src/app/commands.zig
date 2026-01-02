const std = @import("std");
const cronos = @import("lib/cronos");
const State = @import("state.zig").State;

pub fn shiftMonth(state: *State, delta: i32) void {
    var year = state.current_year;
    var month = @as(i32, state.current_month) + delta;

    while (month < 1) : (month += 12) {
        year -= 1;
    }
    while (month > 12) : (month -= 12) {
        year += 1;
    }

    state.current_year = year;
    state.current_month = @intCast(month);
    state.selected.year = year;
    state.selected.month = @intCast(month);
    const max_day = cronos.calendar.daysInMonth(state.selected.year, state.selected.month);
    if (state.selected.day > max_day) {
        state.selected.day = max_day;
    }
}

pub fn moveSelectedByDays(state: *State, delta: i32) void {
    const current_days = cronos.calendar.daysFromCivil(state.selected.year, state.selected.month, state.selected.day);
    const next_days = current_days + @as(i64, delta);
    const next = cronos.calendar.civilFromDays(next_days);
    state.selected = next;
    state.current_year = next.year;
    state.current_month = next.month;
}

pub fn openAddModal(state: *State) void {
    @memset(state.event_input[0..], 0);
    state.event_input_len = 0;
    state.event_ignore_next_char = true;
    state.event_modal_mode = .add;
    state.view_modal_open = false;
}

pub fn openEditModal(state: *State) void {
    const selected_days = cronos.calendar.daysFromCivil(state.selected.year, state.selected.month, state.selected.day);
    const total = cronos.events.countForDay(state.events[0..state.events_count], selected_days);
    if (total == 0) return; // No events to edit

    // Find the actual event index
    const event_idx = cronos.events.indexForDayPosition(
        state.events[0..state.events_count],
        selected_days,
        state.view_selected_index,
    ) orelse return;

    // Preload the event data into the input buffer
    const event = &state.events[event_idx];
    state.event_input_len = cronos.events.formatEventAsInput(event, state.event_input[0..]);
    state.event_edit_index = event_idx;
    state.event_ignore_next_char = true;
    state.event_modal_mode = .edit;
    // Keep view_modal_open = true so we return to it on escape
}

pub fn openViewModal(state: *State) void {
    state.view_modal_open = true;
    state.event_modal_mode = .closed;
    state.view_selected_index = 0;
}

pub fn goToToday(state: *State) void {
    state.selected = state.today;
    state.current_year = state.today.year;
    state.current_month = state.today.month;
}

pub fn addEventFromInput(state: *State) bool {
    const input = std.mem.sliceTo(state.event_input[0..], 0);
    if (input.len == 0) return false;
    if (state.events_count >= state.events.len) return false;

    // Parse the input to extract title, time, and color
    const parsed = cronos.input_parser.parse(input);
    if (parsed.title.len == 0) return false;

    const date_days = cronos.calendar.daysFromCivil(state.selected.year, state.selected.month, state.selected.day);
    var ev = &state.events[state.events_count];
    ev.date_days = date_days;
    ev.start_minutes = parsed.start_minutes;
    ev.end_minutes = parsed.end_minutes;
    ev.color = parsed.color;

    const max_len = ev.title.len - 1;
    const copy_len = @min(max_len, parsed.title.len);
    @memset(ev.title[0..], 0);
    std.mem.copyForwards(u8, ev.title[0..copy_len], parsed.title[0..copy_len]);
    state.events_count += 1;
    return true;
}

pub fn saveEditedEvent(state: *State) bool {
    const input = std.mem.sliceTo(state.event_input[0..], 0);
    if (input.len == 0) return false;
    if (state.event_edit_index >= state.events_count) return false;

    // Parse the input to extract title, time, and color
    const parsed = cronos.input_parser.parse(input);
    if (parsed.title.len == 0) return false;

    // Update the existing event in-place
    var ev = &state.events[state.event_edit_index];
    // Keep the same date_days (editing doesn't change the date)
    ev.start_minutes = parsed.start_minutes;
    ev.end_minutes = parsed.end_minutes;
    ev.color = parsed.color;

    const max_len = ev.title.len - 1;
    const copy_len = @min(max_len, parsed.title.len);
    @memset(ev.title[0..], 0);
    std.mem.copyForwards(u8, ev.title[0..copy_len], parsed.title[0..copy_len]);
    return true;
}

pub fn openGotoModal(state: *State) void {
    @memset(state.goto_day_input[0..], 0);
    @memset(state.goto_month_input[0..], 0);
    @memset(state.goto_year_input[0..], 0);
    state.goto_day_len = 0;
    state.goto_month_len = 0;
    state.goto_year_len = 0;
    state.goto_focus = 0;
    state.goto_ignore_next_char = true;
    state.goto_modal_open = true;
    state.event_modal_mode = .closed;
    state.view_modal_open = false;
}

fn parseMonth(input: []const u8) ?u8 {
    const abbrevs = [_]struct { abbr: []const u8, month: u8 }{
        .{ .abbr = "jan", .month = 1 },
        .{ .abbr = "feb", .month = 2 },
        .{ .abbr = "mar", .month = 3 },
        .{ .abbr = "apr", .month = 4 },
        .{ .abbr = "may", .month = 5 },
        .{ .abbr = "jun", .month = 6 },
        .{ .abbr = "jul", .month = 7 },
        .{ .abbr = "aug", .month = 8 },
        .{ .abbr = "sep", .month = 9 },
        .{ .abbr = "oct", .month = 10 },
        .{ .abbr = "nov", .month = 11 },
        .{ .abbr = "dec", .month = 12 },
    };

    for (abbrevs) |entry| {
        if (std.ascii.eqlIgnoreCase(input, entry.abbr)) {
            return entry.month;
        }
    }
    return null;
}

pub fn goToDateFromInput(state: *State) bool {
    const day_str = std.mem.sliceTo(state.goto_day_input[0..], 0);
    const month_str = std.mem.sliceTo(state.goto_month_input[0..], 0);
    const year_str = std.mem.sliceTo(state.goto_year_input[0..], 0);

    const day = std.fmt.parseInt(u8, day_str, 10) catch return false;
    const month = parseMonth(month_str) orelse return false;

    const year = if (year_str.len == 0)
        state.today.year
    else
        std.fmt.parseInt(i32, year_str, 10) catch return false;

    const max_day = cronos.calendar.daysInMonth(year, month);
    if (day < 1 or day > max_day) return false;

    state.selected = .{ .year = year, .month = month, .day = day };
    state.current_year = year;
    state.current_month = month;
    return true;
}
