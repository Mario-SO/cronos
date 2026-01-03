const std = @import("std");
const cimgui = @import("cimgui");

const profiler = @import("../app/profiler.zig");

pub fn draw(stats: *const profiler.Profiler) void {
    const pos = cimgui.ImVec2{ .x = 12.0, .y = 12.0 };
    cimgui.igSetNextWindowPos(pos, cimgui.ImGuiCond_FirstUseEver);

    const flags = cimgui.ImGuiWindowFlags_AlwaysAutoResize |
        cimgui.ImGuiWindowFlags_NoSavedSettings;

    if (cimgui.igBegin("Profiler", null, flags)) {
        cimgui.igTextUnformatted("Performance");
        cimgui.igSeparator();

        drawLine("Frame: {d:.2} ms (avg {d:.2})", .{ stats.frame_ms, stats.avg_frame_ms });
        drawLine("FPS: {d:.1} (avg {d:.1})", .{ stats.fps, stats.avg_fps });
        drawLine("CPU: {d:.1}%", .{stats.cpu_percent});
        drawLine("Max RSS: {d:.1} MB", .{bytesToMiB(stats.max_rss_bytes)});
    }
    cimgui.igEnd();
}

fn drawLine(comptime fmt: []const u8, args: anytype) void {
    var buf: [128]u8 = undefined;
    if (std.fmt.bufPrintZ(&buf, fmt, args)) |text| {
        cimgui.igTextUnformatted(text);
    } else |_| {
        cimgui.igTextUnformatted("format error");
    }
}

fn bytesToMiB(bytes: u64) f64 {
    return @as(f64, @floatFromInt(bytes)) / (1024.0 * 1024.0);
}
