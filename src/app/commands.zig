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
    @memset(state.add_input[0..], 0);
    state.add_input_len = 0;
    state.add_ignore_next_char = true;
    state.add_modal_open = true;
    state.view_modal_open = false;
}

pub fn openViewModal(state: *State) void {
    state.view_modal_open = true;
    state.add_modal_open = false;
    state.view_selected_index = 0;
}

pub fn goToToday(state: *State) void {
    state.selected = state.today;
    state.current_year = state.today.year;
    state.current_month = state.today.month;
}

pub fn addEventFromInput(state: *State) bool {
    const input = std.mem.sliceTo(state.add_input[0..], 0);
    if (input.len == 0) return false;
    if (state.events_count >= state.events.len) return false;

    const date_days = cronos.calendar.daysFromCivil(state.selected.year, state.selected.month, state.selected.day);
    var ev = &state.events[state.events_count];
    ev.date_days = date_days;
    const max_len = ev.title.len - 1;
    const copy_len = @min(max_len, input.len);
    std.mem.copyForwards(u8, ev.title[0..copy_len], input[0..copy_len]);
    ev.title[copy_len] = 0;
    state.events_count += 1;
    return true;
}
