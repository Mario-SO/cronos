const std = @import("std");
const Build = std.Build;
const OptimizeMode = std.builtin.OptimizeMode;
const ResolvedTarget = Build.ResolvedTarget;
const cimgui = @import("cimgui");

pub fn build(b: *Build) !void {
    const sdkroot_opt = std.process.getEnvVarOwned(b.allocator, "SDKROOT") catch |err| switch (err) {
        error.EnvironmentVariableNotFound => null,
        else => return err,
    };
    if (sdkroot_opt) |sdkroot| {
        b.sysroot = sdkroot;
    }
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    const dev_overlay = b.option(bool, "dev", "Enable ImGui profiling overlay") orelse false;

    const mod = b.addModule("cronos", .{
        .root_source_file = b.path("lib/root.zig"),
        .target = target,
    });

    // Get the matching Zig module name, C header search path and C library for
    // vanilla imgui.
    const cimgui_conf = cimgui.getConfig(false);

    // note that the sokol dependency is built with `.with_sokol_imgui = true`
    const dep_sokol = b.dependency("sokol", .{
        .target = target,
        .optimize = optimize,
        .with_sokol_imgui = true,
        .with_tracing = true,
    });
    if (sdkroot_opt) |sdkroot| {
        const framework_path = Build.LazyPath{
            .cwd_relative = b.pathJoin(&.{ sdkroot, "System/Library/Frameworks" }),
        };
        dep_sokol.artifact("sokol_clib").root_module.addSystemFrameworkPath(framework_path);
    }
    const dep_cimgui = b.dependency("cimgui", .{
        .target = target,
        .optimize = optimize,
    });

    // inject the cimgui header search path into the sokol C library compile step
    dep_sokol.artifact("sokol_clib").addIncludePath(dep_cimgui.path(cimgui_conf.include_dir));

    const mod_main = createMainModule(
        b,
        target,
        optimize,
        dep_sokol,
        dep_cimgui,
        mod,
        cimgui_conf.module_name,
        dev_overlay,
        sdkroot_opt,
    );
    try buildNative(b, mod_main, "Cronos", "run", "Run demo");

    const mod_dev = createMainModule(
        b,
        target,
        optimize,
        dep_sokol,
        dep_cimgui,
        mod,
        cimgui_conf.module_name,
        true,
        sdkroot_opt,
    );
    try buildNative(b, mod_dev, "Cronos-dev", "dev", "Run demo with profiler overlay");
}

fn createMainModule(
    b: *Build,
    target: ResolvedTarget,
    optimize: OptimizeMode,
    dep_sokol: *Build.Dependency,
    dep_cimgui: *Build.Dependency,
    mod: *Build.Module,
    cimgui_module_name: []const u8,
    dev_overlay: bool,
    sdkroot_opt: ?[]const u8,
) *Build.Module {
    const mod_main = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
        .imports = &.{
            .{ .name = "sokol", .module = dep_sokol.module("sokol") },
            .{ .name = cimgui_module_name, .module = dep_cimgui.module(cimgui_module_name) },
            .{ .name = "cronos", .module = mod },
            .{ .name = "lib/cronos", .module = mod },
        },
    });
    const options = b.addOptions();
    options.addOption(bool, "dev", dev_overlay);
    mod_main.addOptions("build_options", options);
    if (sdkroot_opt) |sdkroot| {
        const framework_path = Build.LazyPath{
            .cwd_relative = b.pathJoin(&.{ sdkroot, "System/Library/Frameworks" }),
        };
        mod_main.addSystemFrameworkPath(framework_path);
    }
    return mod_main;
}

fn buildNative(
    b: *Build,
    mod: *Build.Module,
    exe_name: []const u8,
    step_name: []const u8,
    step_desc: []const u8,
) !void {
    const exe = b.addExecutable(.{
        .name = exe_name,
        .root_module = mod,
    });
    b.installArtifact(exe);
    b.step(step_name, step_desc).dependOn(&b.addRunArtifact(exe).step);
}
