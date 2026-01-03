const std = @import("std");
const builtin = @import("builtin");

const SampleIntervalNs: u64 = 500_000_000;

pub const Profiler = struct {
    last_sample_ns: u64 = 0,
    last_cpu_ns: u64 = 0,
    cpu_percent: f32 = 0,
    max_rss_bytes: u64 = 0,
    frame_ms: f32 = 0,
    fps: f32 = 0,
    avg_frame_ms: f32 = 0,
    avg_fps: f32 = 0,

    pub fn reset(self: *Profiler) void {
        self.* = .{};
    }

    pub fn update(self: *Profiler, frame_delta_s: f64) void {
        if (frame_delta_s > 0) {
            self.frame_ms = @as(f32, @floatCast(frame_delta_s * 1000.0));
            self.fps = @as(f32, @floatCast(1.0 / frame_delta_s));
        } else {
            self.frame_ms = 0;
            self.fps = 0;
        }

        const alpha: f32 = 0.1;
        if (self.avg_frame_ms == 0) {
            self.avg_frame_ms = self.frame_ms;
            self.avg_fps = self.fps;
        } else {
            self.avg_frame_ms += alpha * (self.frame_ms - self.avg_frame_ms);
            self.avg_fps += alpha * (self.fps - self.avg_fps);
        }

        const now_ns: u64 = @intCast(std.time.nanoTimestamp());
        if (self.last_sample_ns == 0) {
            self.last_sample_ns = now_ns;
            self.last_cpu_ns = readCpuTimeNs();
            self.max_rss_bytes = readMaxRssBytes();
            return;
        }

        const elapsed_ns = now_ns - self.last_sample_ns;
        if (elapsed_ns < SampleIntervalNs) {
            return;
        }

        const cpu_ns = readCpuTimeNs();
        const delta_cpu = cpu_ns - self.last_cpu_ns;
        if (elapsed_ns > 0) {
            const cpu_ratio = @as(f32, @floatFromInt(delta_cpu)) /
                @as(f32, @floatFromInt(elapsed_ns));
            self.cpu_percent = cpu_ratio * 100.0;
        } else {
            self.cpu_percent = 0;
        }
        self.max_rss_bytes = readMaxRssBytes();
        self.last_sample_ns = now_ns;
        self.last_cpu_ns = cpu_ns;
    }
};

fn readCpuTimeNs() u64 {
    const usage = std.posix.getrusage(std.posix.rusage.SELF);
    return timevalToNs(usage.utime) + timevalToNs(usage.stime);
}

fn timevalToNs(tv: std.posix.timeval) u64 {
    return @as(u64, @intCast(tv.sec)) * 1_000_000_000 +
        @as(u64, @intCast(tv.usec)) * 1_000;
}

fn readMaxRssBytes() u64 {
    const usage = std.posix.getrusage(std.posix.rusage.SELF);
    const rss = usage.maxrss;
    if (rss <= 0) {
        return 0;
    }
    if (builtin.os.tag == .linux) {
        return @as(u64, @intCast(rss)) * 1024;
    }
    return @as(u64, @intCast(rss));
}
