const std = @import("std");

pub const Event = struct {
    date_days: i64,
    title: [64:0]u8,
};

pub fn countForDay(events: []const Event, date_days: i64) usize {
    var count: usize = 0;
    var idx: usize = 0;
    while (idx < events.len) : (idx += 1) {
        if (events[idx].date_days == date_days) {
            count += 1;
        }
    }
    return count;
}

pub fn indexForDayPosition(events: []const Event, date_days: i64, position: usize) ?usize {
    var match_index: usize = 0;
    var idx: usize = 0;
    while (idx < events.len) : (idx += 1) {
        if (events[idx].date_days != date_days) continue;
        if (match_index == position) return idx;
        match_index += 1;
    }
    return null;
}

pub fn deleteForDayAt(events: []Event, count: *usize, date_days: i64, position: usize) void {
    const slice = events[0..count.*];
    const idx = indexForDayPosition(slice, date_days, position) orelse return;
    var i = idx;
    while (i + 1 < count.*) : (i += 1) {
        events[i] = events[i + 1];
    }
    count.* -= 1;
}

pub fn firstTitle(events: []const Event, date_days: i64) []const u8 {
    var idx: usize = 0;
    while (idx < events.len) : (idx += 1) {
        const ev = events[idx];
        if (ev.date_days != date_days) continue;
        return std.mem.sliceTo(ev.title[0..], 0);
    }
    return "";
}
