const std = @import("std");
const events = @import("events.zig");

pub const ParsedInput = struct {
    title: []const u8,
    start_minutes: ?u16 = null,
    end_minutes: ?u16 = null,
    color: u8 = 0,
};

/// Parse event input with format: "Title text 2pm-3pm #blue"
/// Time formats: 2pm, 2:30pm, 14:00, 2-3pm, 2pm-3:30pm
/// Color: #red, #blue, #green, #yellow, #purple, #orange, #gray
pub fn parse(input: []const u8) ParsedInput {
    var result = ParsedInput{ .title = input };

    // Find color tag (must be at end, starts with #)
    var working = std.mem.trimRight(u8, input, " ");
    if (findColorTag(working)) |color_info| {
        result.color = color_info.color;
        working = std.mem.trimRight(u8, working[0..color_info.start], " ");
    }

    // Find time pattern at end
    if (findTimePattern(working)) |time_info| {
        result.start_minutes = time_info.start;
        result.end_minutes = time_info.end;
        working = std.mem.trimRight(u8, working[0..time_info.title_end], " ");
    }

    result.title = working;
    return result;
}

const ColorInfo = struct {
    color: u8,
    start: usize,
};

fn findColorTag(input: []const u8) ?ColorInfo {
    // Look for #colorname at the end
    var i: usize = input.len;
    while (i > 0) {
        i -= 1;
        if (input[i] == '#') {
            const tag = input[i + 1 ..];
            for (events.colors, 0..) |c, idx| {
                if (std.ascii.eqlIgnoreCase(tag, c.name)) {
                    return .{ .color = @intCast(idx), .start = i };
                }
            }
            // Also support #0, #1, etc.
            if (tag.len == 1 and tag[0] >= '0' and tag[0] <= '6') {
                return .{ .color = tag[0] - '0', .start = i };
            }
            return null;
        }
        if (input[i] == ' ') break; // # must start a word
    }
    return null;
}

const TimeInfo = struct {
    start: u16,
    end: ?u16,
    title_end: usize,
};

fn findTimePattern(input: []const u8) ?TimeInfo {
    // Scan backwards to find time pattern
    // Look for patterns like: 2pm, 2:30pm, 14:00, 2-3pm, 2pm-3pm
    var end_pos = input.len;

    // Skip trailing spaces
    while (end_pos > 0 and input[end_pos - 1] == ' ') {
        end_pos -= 1;
    }

    if (end_pos == 0) return null;

    // Find the start of the time token (last word)
    var token_start = end_pos;
    while (token_start > 0 and input[token_start - 1] != ' ') {
        token_start -= 1;
    }

    const token = input[token_start..end_pos];
    if (token.len == 0) return null;

    // Check if this looks like a time (contains digits and optionally am/pm/colon/dash)
    var has_digit = false;
    for (token) |c| {
        if (c >= '0' and c <= '9') has_digit = true;
    }
    if (!has_digit) return null;

    // Try to parse as time range (2pm-3pm or 2-3pm)
    if (std.mem.indexOf(u8, token, "-")) |dash_pos| {
        const first_part = token[0..dash_pos];
        const second_part = token[dash_pos + 1 ..];

        const start_time = parseTimeToken(first_part, null) orelse return null;
        // Second part inherits am/pm from first if not specified
        const end_time = parseTimeToken(second_part, if (start_time >= 720) true else null) orelse return null;

        return .{
            .start = start_time,
            .end = end_time,
            .title_end = token_start,
        };
    }

    // Single time
    const time = parseTimeToken(token, null) orelse return null;
    return .{
        .start = time,
        .end = null,
        .title_end = token_start,
    };
}

fn parseTimeToken(token: []const u8, inherit_pm: ?bool) ?u16 {
    if (token.len == 0) return null;

    var is_pm: ?bool = inherit_pm;
    var time_str = token;

    // Check for am/pm suffix
    if (std.ascii.endsWithIgnoreCase(token, "pm")) {
        is_pm = true;
        time_str = token[0 .. token.len - 2];
    } else if (std.ascii.endsWithIgnoreCase(token, "am")) {
        is_pm = false;
        time_str = token[0 .. token.len - 2];
    }

    if (time_str.len == 0) return null;

    var hours: u16 = 0;
    var minutes: u16 = 0;

    // Check for HH:MM format
    if (std.mem.indexOf(u8, time_str, ":")) |colon_pos| {
        hours = std.fmt.parseInt(u16, time_str[0..colon_pos], 10) catch return null;
        minutes = std.fmt.parseInt(u16, time_str[colon_pos + 1 ..], 10) catch return null;
    } else {
        // Just hours
        hours = std.fmt.parseInt(u16, time_str, 10) catch return null;
    }

    // Validate
    if (hours > 23 or minutes > 59) return null;

    // Apply am/pm conversion
    if (is_pm) |pm| {
        if (pm) {
            if (hours < 12) hours += 12;
        } else {
            if (hours == 12) hours = 0;
        }
    }

    return hours * 60 + minutes;
}

// Tests
test "parse simple title" {
    const result = parse("Team meeting");
    try std.testing.expectEqualStrings("Team meeting", result.title);
    try std.testing.expectEqual(@as(?u16, null), result.start_minutes);
    try std.testing.expectEqual(@as(?u16, null), result.end_minutes);
    try std.testing.expectEqual(@as(u8, 0), result.color);
}

test "parse with time" {
    const result = parse("Team meeting 2pm");
    try std.testing.expectEqualStrings("Team meeting", result.title);
    try std.testing.expectEqual(@as(?u16, 14 * 60), result.start_minutes);
    try std.testing.expectEqual(@as(?u16, null), result.end_minutes);
}

test "parse with time range" {
    const result = parse("Team meeting 2pm-3:30pm");
    try std.testing.expectEqualStrings("Team meeting", result.title);
    try std.testing.expectEqual(@as(?u16, 14 * 60), result.start_minutes);
    try std.testing.expectEqual(@as(?u16, 15 * 60 + 30), result.end_minutes);
}

test "parse with color" {
    const result = parse("Team meeting #blue");
    try std.testing.expectEqualStrings("Team meeting", result.title);
    try std.testing.expectEqual(@as(u8, 1), result.color);
}

test "parse with time and color" {
    const result = parse("Team meeting 2pm #red");
    try std.testing.expectEqualStrings("Team meeting", result.title);
    try std.testing.expectEqual(@as(?u16, 14 * 60), result.start_minutes);
    try std.testing.expectEqual(@as(u8, 3), result.color);
}
