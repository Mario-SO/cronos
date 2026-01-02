const sapp = @import("sokol").app;
const commands = @import("commands.zig");
const State = @import("state.zig").State;

pub fn handleKeyDown(state: *State, key_code: sapp.Keycode) void {
    switch (key_code) {
        .LEFT => commands.shiftMonth(state, -1),
        .RIGHT => commands.shiftMonth(state, 1),
        .H => commands.moveSelectedByDays(state, -1),
        .J => commands.moveSelectedByDays(state, 7),
        .K => commands.moveSelectedByDays(state, -7),
        .L => commands.moveSelectedByDays(state, 1),
        .A => commands.openAddModal(state),
        .T => commands.goToToday(state),
        .V => commands.openViewModal(state),
        else => {},
    }
}
