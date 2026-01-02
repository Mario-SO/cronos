const sokol = @import("sokol");
const sg = sokol.gfx;
const slog = sokol.log;
const sapp = sokol.app;
const sglue = sokol.glue;
const sgl = sokol.gl;
const sdtx = sokol.debugtext;
const simgui = sokol.imgui;

pub var pass_action: sg.PassAction = .{};

pub fn setup() void {
    sg.setup(.{
        .environment = sglue.environment(),
        .logger = .{ .func = slog.func },
    });
    sgl.setup(.{ .logger = .{ .func = slog.func } });
    sdtx.setup(.{
        .logger = .{ .func = slog.func },
        .fonts = .{
            sdtx.fontKc853(),
            sdtx.fontKc854(),
            sdtx.fontZ1013(),
            sdtx.fontCpc(),
            sdtx.fontC64(),
            sdtx.fontOric(),
            .{},
            .{},
        },
    });
    simgui.setup(.{
        .logger = .{ .func = slog.func },
    });

    pass_action.colors[0] = .{
        .load_action = .CLEAR,
        .clear_value = .{ .r = 0.95, .g = 0.96, .b = 0.98, .a = 1.0 },
    };
}

pub fn beginFrame(width: i32, height: i32) void {
    simgui.newFrame(.{
        .width = width,
        .height = height,
        .delta_time = sapp.frameDuration(),
        .dpi_scale = sapp.dpiScale(),
    });
}

pub fn endFrame() void {
    sg.beginPass(.{ .action = pass_action, .swapchain = sglue.swapchain() });
    sgl.draw();
    sdtx.draw();
    simgui.render();
    sg.endPass();
    sg.commit();
}

pub fn shutdown() void {
    simgui.shutdown();
    sdtx.shutdown();
    sgl.shutdown();
    sg.shutdown();
}

pub fn handleEvent(ev: sapp.Event) bool {
    return simgui.handleEvent(ev);
}

pub fn setup2D(width: f32, height: f32) void {
    sgl.defaults();
    sgl.viewportf(0.0, 0.0, width, height, true);
    sgl.matrixModeProjection();
    sgl.loadIdentity();
    sgl.ortho(0.0, width, height, 0.0, -1.0, 1.0);
    sgl.matrixModeModelview();
    sgl.loadIdentity();
}
