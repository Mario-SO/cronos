const std = @import("std");
const Date = @import("date.zig").Date;

// Month names and abbreviations
pub const month_names = [_][]const u8{
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
};

pub const month_abbrevs = [_][]const u8{
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
};

pub const weekday_names = [_][]const u8{
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
};

/// Returns month name for 1-indexed month (1 = January)
pub fn monthName(month: u8) []const u8 {
    if (month >= 1 and month <= 12) {
        return month_names[month - 1];
    }
    return "Unknown";
}

/// Parse a month abbreviation (case-insensitive) and return 1-indexed month
pub fn parseMonthAbbrev(input: []const u8) ?u8 {
    for (month_abbrevs, 0..) |abbr, i| {
        if (std.ascii.eqlIgnoreCase(input, abbr)) {
            return @intCast(i + 1);
        }
    }
    return null;
}

/// Check if input is a valid prefix of any month abbreviation
pub fn isValidMonthPrefix(input: []const u8) bool {
    if (input.len == 0) return true;
    for (month_abbrevs) |abbr| {
        if (input.len <= abbr.len) {
            var matches = true;
            for (0..input.len) |i| {
                if (std.ascii.toLower(input[i]) != abbr[i]) {
                    matches = false;
                    break;
                }
            }
            if (matches) return true;
        }
    }
    return false;
}

pub fn daysInMonth(year: i32, month: u8) u8 {
    return switch (month) {
        1, 3, 5, 7, 8, 10, 12 => 31,
        4, 6, 9, 11 => 30,
        2 => if (isLeapYear(year)) 29 else 28,
        else => 30,
    };
}

pub fn isLeapYear(year: i32) bool {
    if (@mod(year, 4) != 0) return false;
    if (@mod(year, 100) != 0) return true;
    return (@mod(year, 400) == 0);
}

pub fn weekdayOfFirst(year: i32, month: u8) u8 {
    return dayOfWeek(year, month, 1);
}

pub fn dayOfWeek(year: i32, month: u8, day: u8) u8 {
    const days = daysFromCivil(year, month, day);
    const shifted = days + 3; // +3 makes Monday = 0
    const mod = @mod(shifted, 7);
    return @intCast(mod);
}

pub fn daysFromCivil(year: i32, month: u8, day: u8) i64 {
    var y = year;
    const m = @as(i32, month);
    const d = @as(i32, day);

    y -= if (m <= 2) 1 else 0;
    const era = @divFloor(y, 400);
    const yoe = y - era * 400;
    const mp = m + (if (m <= 2) @as(i32, 9) else @as(i32, -3));
    const doy = @divFloor(153 * mp + 2, 5) + d - 1;
    const doe = yoe * 365 + @divFloor(yoe, 4) - @divFloor(yoe, 100) + doy;
    return @as(i64, era) * 146097 + @as(i64, doe) - 719468;
}

pub fn civilFromDays(days: i64) Date {
    const z = days + 719468;
    const era = @divFloor(z, 146097);
    const doe = z - era * 146097;
    const yoe = @divFloor(doe - @divFloor(doe, 1460) + @divFloor(doe, 36524) - @divFloor(doe, 146096), 365);
    var y = yoe + era * 400;
    const doy = doe - (365 * yoe + @divFloor(yoe, 4) - @divFloor(yoe, 100));
    const mp = @divFloor(5 * doy + 2, 153);
    const d = doy - @divFloor(153 * mp + 2, 5) + 1;
    const m = mp + (if (mp < 10) @as(i64, 3) else @as(i64, -9));
    y += if (m <= 2) 1 else 0;

    return .{
        .year = @intCast(y),
        .month = @intCast(m),
        .day = @intCast(d),
    };
}
