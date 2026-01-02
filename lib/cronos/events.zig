const std = @import("std");

pub const Event = struct {
    date_days: i64,
    title: [64:0]u8,
    start_minutes: ?u16 = null, // null = all-day, otherwise minutes from midnight (0-1439)
    end_minutes: ?u16 = null, // null = same as start or all-day
    color: u8 = 0, // index into color palette (0 = default/gray)
};

pub const Color = struct {
    name: []const u8,
    r: f32,
    g: f32,
    b: f32,
};

pub const colors = [_]Color{
    .{ .name = "gray", .r = 0.5, .g = 0.5, .b = 0.5 },
    .{ .name = "blue", .r = 0.2, .g = 0.4, .b = 0.8 },
    .{ .name = "green", .r = 0.2, .g = 0.7, .b = 0.3 },
    .{ .name = "red", .r = 0.85, .g = 0.2, .b = 0.2 },
    .{ .name = "yellow", .r = 0.85, .g = 0.75, .b = 0.1 },
    .{ .name = "purple", .r = 0.6, .g = 0.3, .b = 0.7 },
    .{ .name = "orange", .r = 0.9, .g = 0.5, .b = 0.1 },
};

pub fn formatMinutes(minutes: u16, buf: []u8) []const u8 {
    const hours = minutes / 60;
    const mins = minutes % 60;
    const is_pm = hours >= 12;
    const display_hours = if (hours == 0) 12 else if (hours > 12) hours - 12 else hours;
    const suffix: []const u8 = if (is_pm) "PM" else "AM";

    if (mins == 0) {
        return std.fmt.bufPrint(buf, "{d}{s}", .{ display_hours, suffix }) catch "";
    } else {
        return std.fmt.bufPrint(buf, "{d}:{d:0>2}{s}", .{ display_hours, mins, suffix }) catch "";
    }
}

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
    if (firstEvent(events, date_days)) |ev| {
        return std.mem.sliceTo(ev.title[0..], 0);
    }
    return "";
}

/// Returns a pointer to the first event for a given day, or null if none exists
pub fn firstEvent(events: []const Event, date_days: i64) ?*const Event {
    for (events) |*ev| {
        if (ev.date_days == date_days) return ev;
    }
    return null;
}

/// Reconstructs the input string from an event (e.g., "Team meeting 2pm-3pm #blue")
/// Returns the length of the formatted string
pub fn formatEventAsInput(event: *const Event, buf: []u8) usize {
    var pos: usize = 0;

    // Copy title
    const title = std.mem.sliceTo(event.title[0..], 0);
    if (pos + title.len < buf.len) {
        @memcpy(buf[pos .. pos + title.len], title);
        pos += title.len;
    }

    // Add time if present
    if (event.start_minutes) |start| {
        if (pos + 1 < buf.len) {
            buf[pos] = ' ';
            pos += 1;
        }

        var time_buf: [16]u8 = undefined;
        const start_str = formatMinutes(start, &time_buf);
        if (pos + start_str.len < buf.len) {
            @memcpy(buf[pos .. pos + start_str.len], start_str);
            pos += start_str.len;
        }

        if (event.end_minutes) |end_val| {
            if (pos + 1 < buf.len) {
                buf[pos] = '-';
                pos += 1;
            }
            var end_buf: [16]u8 = undefined;
            const end_str = formatMinutes(end_val, &end_buf);
            if (pos + end_str.len < buf.len) {
                @memcpy(buf[pos .. pos + end_str.len], end_str);
                pos += end_str.len;
            }
        }
    }

    // Add color if not default (gray)
    if (event.color > 0 and event.color < colors.len) {
        const color_name = colors[event.color].name;
        // Add " #colorname"
        if (pos + 2 + color_name.len < buf.len) {
            buf[pos] = ' ';
            buf[pos + 1] = '#';
            pos += 2;
            @memcpy(buf[pos .. pos + color_name.len], color_name);
            pos += color_name.len;
        }
    }

    // Null terminate
    if (pos < buf.len) {
        buf[pos] = 0;
    }

    return pos;
}
