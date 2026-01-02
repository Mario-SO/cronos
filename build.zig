const std = @import("std");
const Build = std.Build;
const OptimizeMode = std.builtin.OptimizeMode;
const ResolvedTarget = Build.ResolvedTarget;
const cimgui = @import("cimgui");

pub fn build(b: *Build) !void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const opt_docking = b.option(bool, "docking", "Build with docking support") orelse false;

    const mod = b.addModule("cronos", .{
        .root_source_file = b.path("lib/root.zig"),
        .target = target,
    });

    // Get the matching Zig module name, C header search path and C library for
    // vanilla imgui vs the imgui docking branch.
    const cimgui_conf = cimgui.getConfig(opt_docking);

    // note that the sokol dependency is built with `.with_sokol_imgui = true`
    const dep_sokol = b.dependency("sokol", .{
        .target = target,
        .optimize = optimize,
        .with_sokol_imgui = true,
        .with_tracing = true,
    });
    const dep_cimgui = b.dependency("cimgui", .{
        .target = target,
        .optimize = optimize,
    });

    // inject the cimgui header search path into the sokol C library compile step
    dep_sokol.artifact("sokol_clib").addIncludePath(dep_cimgui.path(cimgui_conf.include_dir));

    // main module with sokol and cimgui imports
    const mod_main = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
        .imports = &.{
            .{ .name = "sokol", .module = dep_sokol.module("sokol") },
            .{ .name = cimgui_conf.module_name, .module = dep_cimgui.module(cimgui_conf.module_name) },
            .{ .name = "cronos", .module = mod },
        },
    });
    const mod_options = b.addOptions();
    mod_options.addOption(bool, "docking", opt_docking);
    mod_main.addOptions("build_options", mod_options);

    try buildNative(b, mod_main);
}

fn buildNative(b: *Build, mod: *Build.Module) !void {
    const exe = b.addExecutable(.{
        .name = "Cronos",
        .root_module = mod,
    });
    b.installArtifact(exe);
    b.step("run", "Run demo").dependOn(&b.addRunArtifact(exe).step);
}
