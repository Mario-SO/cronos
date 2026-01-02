const cronos = @import("lib/cronos");

pub const State = struct {
    current_year: i32 = 1970,
    current_month: u8 = 1,
    selected: cronos.Date = .{ .year = 1970, .month = 1, .day = 1 },
    today: cronos.Date = .{ .year = 1970, .month = 1, .day = 1 },
    add_modal_open: bool = false,
    add_input: [128:0]u8 = [_:0]u8{0} ** 128,
    add_input_len: usize = 0,
    add_ignore_next_char: bool = false,
    view_modal_open: bool = false,
    view_selected_index: usize = 0,
    events: [128]cronos.Event = undefined,
    events_count: usize = 0,
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
