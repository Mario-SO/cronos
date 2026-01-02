const std = @import("std");
const Build = std.Build;
const OptimizeMode = std.builtin.OptimizeMode;
const ResolvedTarget = Build.ResolvedTarget;
const cimgui = @import("cimgui");
const sokol = @import("sokol");

pub fn build(b: *Build) !void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

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
    const dep_cimgui = b.dependency("cimgui", .{
        .target = target,
        .optimize = optimize,
    });

    // inject the cimgui header search path into the sokol C library compile step
    dep_sokol.artifact("sokol_clib").addIncludePath(dep_cimgui.path(cimgui_conf.include_dir));

    // Get sokol module and shader compiler
    const mod_sokol = dep_sokol.module("sokol");

    // Compile blur shader for macOS Metal
    const blur_shader = sokol.shdc.createModule(b, "blur_shader", mod_sokol, .{
        .shdc_dep = b.dependency("sokol-tools-bin", .{}),
        .input = "src/shaders/blur.glsl",
        .output = "blur.zig",
        .slang = .{ .metal_macos = true },
    }) catch @panic("Failed to create blur shader module");

    // main module with sokol, cimgui, and shader imports
    const mod_main = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
        .imports = &.{
            .{ .name = "sokol", .module = mod_sokol },
            .{ .name = cimgui_conf.module_name, .module = dep_cimgui.module(cimgui_conf.module_name) },
            .{ .name = "cronos", .module = mod },
            .{ .name = "lib/cronos", .module = mod },
            .{ .name = "blur_shader", .module = blur_shader },
        },
    });

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
