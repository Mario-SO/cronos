//! Application State Management
//!
//! This module defines the application state, split into focused sub-structs
//! for better organization and maintainability following the Single Responsibility Principle.

const cronos = @import("lib/cronos");

// =============================================================================
// Calendar Navigation State
// =============================================================================

pub const CalendarState = struct {
    current_year: i32 = 1970,
    current_month: u8 = 1,
    selected: cronos.Date = .{ .year = 1970, .month = 1, .day = 1 },
    today: cronos.Date = .{ .year = 1970, .month = 1, .day = 1 },

    pub fn selectedDateDays(self: *const CalendarState) i64 {
        return cronos.calendar.daysFromCivil(self.selected.year, self.selected.month, self.selected.day);
    }
};

// =============================================================================
// Events Storage
// =============================================================================

pub const EventStore = struct {
    items: [128]cronos.Event = undefined,
    count: usize = 0,

    pub fn slice(self: *EventStore) []cronos.Event {
        return self.items[0..self.count];
    }

    pub fn constSlice(self: *const EventStore) []const cronos.Event {
        return self.items[0..self.count];
    }
};

// =============================================================================
// Modal States
// =============================================================================

pub const EventModalMode = enum {
    closed,
    add,
    edit,
};

/// State for the Add/Edit Event modal
pub const EventModalState = struct {
    mode: EventModalMode = .closed,
    input: [128:0]u8 = [_:0]u8{0} ** 128,
    input_len: usize = 0,
    ignore_next_char: bool = false,
    edit_index: usize = 0, // index in events array when editing

    pub fn isOpen(self: *const EventModalState) bool {
        return self.mode != .closed;
    }

    pub fn clear(self: *EventModalState) void {
        @memset(self.input[0..], 0);
        self.input_len = 0;
    }
};

/// State for the View Events modal
pub const ViewModalState = struct {
    open: bool = false,
    selected_index: usize = 0,
};

/// State for the Go To Date modal
pub const GotoModalState = struct {
    open: bool = false,
    focus: u8 = 0, // 0=day, 1=month, 2=year
    day_input: [4:0]u8 = [_:0]u8{0} ** 4,
    day_len: usize = 0,
    month_input: [4:0]u8 = [_:0]u8{0} ** 4,
    month_len: usize = 0,
    year_input: [8:0]u8 = [_:0]u8{0} ** 8,
    year_len: usize = 0,
    ignore_next_char: bool = false,

    pub fn clear(self: *GotoModalState) void {
        @memset(self.day_input[0..], 0);
        @memset(self.month_input[0..], 0);
        @memset(self.year_input[0..], 0);
        self.day_len = 0;
        self.month_len = 0;
        self.year_len = 0;
        self.focus = 0;
    }
};

// =============================================================================
// Main Application State
// =============================================================================

pub const State = struct {
    calendar: CalendarState = .{},
    events: EventStore = .{},
    event_modal: EventModalState = .{},
    view_modal: ViewModalState = .{},
    goto_modal: GotoModalState = .{},

    // -------------------------------------------------------------------------
    // Compatibility accessors (for gradual migration)
    // These allow existing code to continue working while we migrate
    // -------------------------------------------------------------------------

    pub fn isAnyModalOpen(self: *const State) bool {
        return self.event_modal.isOpen() or
            self.view_modal.open or
            self.goto_modal.open;
    }

    // Calendar state shortcuts
    pub inline fn current_year(self: *const State) i32 {
        return self.calendar.current_year;
    }
    pub inline fn current_month(self: *const State) u8 {
        return self.calendar.current_month;
    }
    pub inline fn selected(self: *const State) cronos.Date {
        return self.calendar.selected;
    }
    pub inline fn today(self: *const State) cronos.Date {
        return self.calendar.today;
    }

    // Event modal shortcuts (for compatibility during migration)
    pub inline fn event_modal_mode(self: *const State) EventModalMode {
        return self.event_modal.mode;
    }
    pub inline fn event_input(self: *const State) *const [128:0]u8 {
        return &self.event_modal.input;
    }
    pub inline fn event_input_len(self: *const State) usize {
        return self.event_modal.input_len;
    }

    // View modal shortcuts
    pub inline fn view_modal_open(self: *const State) bool {
        return self.view_modal.open;
    }
    pub inline fn view_selected_index(self: *const State) usize {
        return self.view_modal.selected_index;
    }

    // Events shortcuts
    pub inline fn events_count(self: *const State) usize {
        return self.events.count;
    }

    // Goto modal shortcuts
    pub inline fn goto_modal_open(self: *const State) bool {
        return self.goto_modal.open;
    }
};

// =============================================================================
// Initialization
// =============================================================================

pub fn init(state: *State) void {
    state.calendar.today = cronos.clock.currentUtcDate();
    state.calendar.current_year = state.calendar.today.year;
    state.calendar.current_month = state.calendar.today.month;
    state.calendar.selected = state.calendar.today;
}

pub fn selectedDateDays(state: *const State) i64 {
    return state.calendar.selectedDateDays();
}
