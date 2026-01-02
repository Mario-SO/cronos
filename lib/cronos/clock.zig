const std = @import("std");
const Date = @import("date.zig").Date;
const calendar = @import("calendar.zig");

pub fn currentUtcDate() Date {
    const seconds = std.time.timestamp();
    const days = @divFloor(seconds, 60 * 60 * 24);
    return calendar.civilFromDays(days);
}
