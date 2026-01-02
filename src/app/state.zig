const cronos = @import("lib/cronos");

pub const EventModalMode = enum {
    closed,
    add,
    edit,
};

pub const State = struct {
    current_year: i32 = 1970,
    current_month: u8 = 1,
    selected: cronos.Date = .{ .year = 1970, .month = 1, .day = 1 },
    today: cronos.Date = .{ .year = 1970, .month = 1, .day = 1 },
    // Event modal (add/edit)
    event_modal_mode: EventModalMode = .closed,
    event_input: [128:0]u8 = [_:0]u8{0} ** 128,
    event_input_len: usize = 0,
    event_ignore_next_char: bool = false,
    event_edit_index: usize = 0, // index in events array when editing
    // View events modal
    view_modal_open: bool = false,
    view_selected_index: usize = 0,
    // Events storage
    events: [128]cronos.Event = undefined,
    events_count: usize = 0,
    // Go to date modal
    goto_modal_open: bool = false,
    goto_focus: u8 = 0, // 0=day, 1=month, 2=year
    goto_day_input: [4:0]u8 = [_:0]u8{0} ** 4,
    goto_day_len: usize = 0,
    goto_month_input: [4:0]u8 = [_:0]u8{0} ** 4,
    goto_month_len: usize = 0,
    goto_year_input: [8:0]u8 = [_:0]u8{0} ** 8,
    goto_year_len: usize = 0,
    goto_ignore_next_char: bool = false,
};

pub fn init(state: *State) void {
    state.today = cronos.clock.currentUtcDate();
    state.current_year = state.today.year;
    state.current_month = state.today.month;
    state.selected = state.today;
}

pub fn selectedDateDays(state: *const State) i64 {
    return cronos.calendar.daysFromCivil(state.selected.year, state.selected.month, state.selected.day);
}
