//! Application Commands
//!
//! This module contains all the high-level commands/actions that can be
//! performed in the application. Commands modify state in response to user input.

const std = @import("std");
const cronos = @import("lib/cronos");
const state_mod = @import("state.zig");
const State = state_mod.State;

// =============================================================================
// Calendar Navigation
// =============================================================================

pub fn shiftMonth(state: *State, delta: i32) void {
    var year = state.calendar.current_year;
    var month = @as(i32, state.calendar.current_month) + delta;

    while (month < 1) : (month += 12) {
        year -= 1;
    }
    while (month > 12) : (month -= 12) {
        year += 1;
    }

    state.calendar.current_year = year;
    state.calendar.current_month = @intCast(month);
    state.calendar.selected.year = year;
    state.calendar.selected.month = @intCast(month);
    const max_day = cronos.calendar.daysInMonth(state.calendar.selected.year, state.calendar.selected.month);
    if (state.calendar.selected.day > max_day) {
        state.calendar.selected.day = max_day;
    }
}

pub fn moveSelectedByDays(state: *State, delta: i32) void {
    const current_days = cronos.calendar.daysFromCivil(
        state.calendar.selected.year,
        state.calendar.selected.month,
        state.calendar.selected.day,
    );
    const next_days = current_days + @as(i64, delta);
    const next = cronos.calendar.civilFromDays(next_days);
    state.calendar.selected = next;
    state.calendar.current_year = next.year;
    state.calendar.current_month = next.month;
}

pub fn goToToday(state: *State) void {
    state.calendar.selected = state.calendar.today;
    state.calendar.current_year = state.calendar.today.year;
    state.calendar.current_month = state.calendar.today.month;
}

// =============================================================================
// Event Modal Commands
// =============================================================================

pub fn openAddModal(state: *State) void {
    state.event_modal.clear();
    state.event_modal.ignore_next_char = true;
    state.event_modal.mode = .add;
    state.view_modal.open = false;
}

pub fn openEditModal(state: *State) void {
    const selected_days = state.calendar.selectedDateDays();
    const total = cronos.events.countForDay(state.events.constSlice(), selected_days);
    if (total == 0) return; // No events to edit

    // Find the actual event index
    const event_idx = cronos.events.indexForDayPosition(
        state.events.constSlice(),
        selected_days,
        state.view_modal.selected_index,
    ) orelse return;

    // Preload the event data into the input buffer
    const event = &state.events.items[event_idx];
    state.event_modal.input_len = cronos.events.formatEventAsInput(event, state.event_modal.input[0..]);
    state.event_modal.edit_index = event_idx;
    state.event_modal.ignore_next_char = true;
    state.event_modal.mode = .edit;
    // Keep view_modal.open = true so we return to it on escape
}

pub fn addEventFromInput(state: *State) bool {
    const input = std.mem.sliceTo(state.event_modal.input[0..], 0);
    if (input.len == 0) return false;
    if (state.events.count >= state.events.items.len) return false;

    // Parse the input to extract title, time, and color
    const parsed = cronos.input_parser.parse(input);
    if (parsed.title.len == 0) return false;

    const date_days = state.calendar.selectedDateDays();
    var ev = &state.events.items[state.events.count];
    ev.date_days = date_days;
    ev.start_minutes = parsed.start_minutes;
    ev.end_minutes = parsed.end_minutes;
    ev.color = parsed.color;

    const max_len = ev.title.len - 1;
    const copy_len = @min(max_len, parsed.title.len);
    @memset(ev.title[0..], 0);
    std.mem.copyForwards(u8, ev.title[0..copy_len], parsed.title[0..copy_len]);
    state.events.count += 1;
    return true;
}

pub fn saveEditedEvent(state: *State) bool {
    const input = std.mem.sliceTo(state.event_modal.input[0..], 0);
    if (input.len == 0) return false;
    if (state.event_modal.edit_index >= state.events.count) return false;

    // Parse the input to extract title, time, and color
    const parsed = cronos.input_parser.parse(input);
    if (parsed.title.len == 0) return false;

    // Update the existing event in-place
    var ev = &state.events.items[state.event_modal.edit_index];
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

// =============================================================================
// View Modal Commands
// =============================================================================

pub fn openViewModal(state: *State) void {
    state.view_modal.open = true;
    state.event_modal.mode = .closed;
    state.view_modal.selected_index = 0;
}

// =============================================================================
// Go To Date Modal Commands
// =============================================================================

pub fn openGotoModal(state: *State) void {
    state.goto_modal.clear();
    state.goto_modal.ignore_next_char = true;
    state.goto_modal.open = true;
    state.event_modal.mode = .closed;
    state.view_modal.open = false;
}

pub fn goToDateFromInput(state: *State) bool {
    const day_str = std.mem.sliceTo(state.goto_modal.day_input[0..], 0);
    const month_str = std.mem.sliceTo(state.goto_modal.month_input[0..], 0);
    const year_str = std.mem.sliceTo(state.goto_modal.year_input[0..], 0);

    const day = std.fmt.parseInt(u8, day_str, 10) catch return false;
    const month = if (month_str.len == 0)
        state.calendar.current_month
    else
        cronos.calendar.parseMonthAbbrev(month_str) orelse return false;

    const year = if (year_str.len == 0)
        state.calendar.today.year
    else
        std.fmt.parseInt(i32, year_str, 10) catch return false;

    const max_day = cronos.calendar.daysInMonth(year, month);
    if (day < 1 or day > max_day) return false;

    state.calendar.selected = .{ .year = year, .month = month, .day = day };
    state.calendar.current_year = year;
    state.calendar.current_month = month;
    return true;
}
