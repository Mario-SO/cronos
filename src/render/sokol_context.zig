const sokol = @import("sokol");
const sg = sokol.gfx;
const slog = sokol.log;
const sapp = sokol.app;
const sglue = sokol.glue;
const sgl = sokol.gl;
const sdtx = sokol.debugtext;
const simgui = sokol.imgui;
const blur_shader = @import("blur_shader");

pub var pass_action: sg.PassAction = .{};
pub var offscreen_pass_action: sg.PassAction = .{};

// Offscreen render targets
var scene_color: sg.Image = .{};
var scene_depth: sg.Image = .{};
var scene_color_view: sg.View = .{};
var scene_depth_view: sg.View = .{};

var blur_color: sg.Image = .{};
var blur_color_view: sg.View = .{};

// Texture views for sampling
var scene_texture_view: sg.View = .{};
var blur_texture_view: sg.View = .{};

// Blur pipelines and resources
var pip_blur_h: sg.Pipeline = .{};
var pip_blur_v: sg.Pipeline = .{};
var pip_display: sg.Pipeline = .{};
var quad_vbuf: sg.Buffer = .{};
var sampler: sg.Sampler = .{};

// Blur bindings
var bind_blur_h: sg.Bindings = .{};
var bind_blur_v: sg.Bindings = .{};
var bind_display: sg.Bindings = .{};

// Current render target dimensions
var rt_width: i32 = 0;
var rt_height: i32 = 0;

// Track if we're rendering with blur
var blur_enabled: bool = false;

// Offscreen sgl context (for rendering to RGBA8 + DEPTH targets)
var offscreen_sgl_ctx: sgl.Context = .{};

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

    offscreen_pass_action.colors[0] = .{
        .load_action = .CLEAR,
        .clear_value = .{ .r = 0.95, .g = 0.96, .b = 0.98, .a = 1.0 },
    };

    // Create offscreen sgl context with RGBA8 + DEPTH format
    offscreen_sgl_ctx = sgl.makeContext(.{
        .color_format = .RGBA8,
        .depth_format = .DEPTH,
        .sample_count = 1,
    });

    // Create fullscreen quad vertex buffer
    // Positions and UVs for a fullscreen triangle strip
    const quad_vertices = [_]f32{
        // pos x, pos y, pos z, pos w,  u, v
        -1.0, -1.0, 0.0, 1.0, 0.0, 1.0,
        1.0,  -1.0, 0.0, 1.0, 1.0, 1.0,
        -1.0, 1.0,  0.0, 1.0, 0.0, 0.0,
        1.0,  1.0,  0.0, 1.0, 1.0, 0.0,
    };
    quad_vbuf = sg.makeBuffer(.{
        .data = sg.asRange(&quad_vertices),
    });

    // Create sampler for texture sampling
    sampler = sg.makeSampler(.{
        .min_filter = .LINEAR,
        .mag_filter = .LINEAR,
        .wrap_u = .CLAMP_TO_EDGE,
        .wrap_v = .CLAMP_TO_EDGE,
    });

    // Create blur pipelines (render to RGBA8 targets, no depth)
    pip_blur_h = sg.makePipeline(.{
        .shader = sg.makeShader(blur_shader.blurHShaderDesc(sg.queryBackend())),
        .layout = .{
            .attrs = .{
                .{ .format = .FLOAT4 }, // position
                .{ .format = .FLOAT2 }, // texcoord
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
            },
        },
        .primitive_type = .TRIANGLE_STRIP,
        .color_count = 1,
        .colors = .{
            .{ .pixel_format = .RGBA8 },
            .{},
            .{},
            .{},
            .{},
            .{},
            .{},
            .{},
        },
        .depth = .{
            .pixel_format = .NONE,
            .write_enabled = false,
            .compare = .ALWAYS,
        },
    });

    pip_blur_v = sg.makePipeline(.{
        .shader = sg.makeShader(blur_shader.blurVShaderDesc(sg.queryBackend())),
        .layout = .{
            .attrs = .{
                .{ .format = .FLOAT4 }, // position
                .{ .format = .FLOAT2 }, // texcoord
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
            },
        },
        .primitive_type = .TRIANGLE_STRIP,
        .color_count = 1,
        .colors = .{
            .{ .pixel_format = .RGBA8 },
            .{},
            .{},
            .{},
            .{},
            .{},
            .{},
            .{},
        },
        .depth = .{
            .pixel_format = .NONE,
            .write_enabled = false,
            .compare = .ALWAYS,
        },
    });

    // Display pipeline renders to swapchain (default format)
    pip_display = sg.makePipeline(.{
        .shader = sg.makeShader(blur_shader.displayShaderDesc(sg.queryBackend())),
        .layout = .{
            .attrs = .{
                .{ .format = .FLOAT4 }, // position
                .{ .format = .FLOAT2 }, // texcoord
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
                .{},
            },
        },
        .primitive_type = .TRIANGLE_STRIP,
        .depth = .{
            .write_enabled = false,
            .compare = .ALWAYS,
        },
    });
}

fn createRenderTargets(width: i32, height: i32) void {
    // Destroy old resources if they exist
    if (rt_width != 0) {
        sg.destroyView(scene_color_view);
        sg.destroyView(scene_depth_view);
        sg.destroyView(blur_color_view);
        sg.destroyView(scene_texture_view);
        sg.destroyView(blur_texture_view);
        sg.destroyImage(scene_color);
        sg.destroyImage(scene_depth);
        sg.destroyImage(blur_color);
    }

    rt_width = width;
    rt_height = height;

    // Scene render target
    scene_color = sg.makeImage(.{
        .usage = .{ .color_attachment = true },
        .width = width,
        .height = height,
        .pixel_format = .RGBA8,
        .sample_count = 1,
    });

    scene_depth = sg.makeImage(.{
        .usage = .{ .depth_stencil_attachment = true },
        .width = width,
        .height = height,
        .pixel_format = .DEPTH,
        .sample_count = 1,
    });

    // Create views for attachments (render targets)
    scene_color_view = sg.makeView(.{
        .color_attachment = .{ .image = scene_color },
    });

    scene_depth_view = sg.makeView(.{
        .depth_stencil_attachment = .{ .image = scene_depth },
    });

    // Blur intermediate render target
    blur_color = sg.makeImage(.{
        .usage = .{ .color_attachment = true },
        .width = width,
        .height = height,
        .pixel_format = .RGBA8,
        .sample_count = 1,
    });

    blur_color_view = sg.makeView(.{
        .color_attachment = .{ .image = blur_color },
    });

    // Create texture views for sampling
    scene_texture_view = sg.makeView(.{
        .texture = .{ .image = scene_color },
    });

    blur_texture_view = sg.makeView(.{
        .texture = .{ .image = blur_color },
    });

    // Update bindings
    bind_blur_h.vertex_buffers[0] = quad_vbuf;
    bind_blur_h.views[0] = scene_texture_view;
    bind_blur_h.samplers[0] = sampler;

    bind_blur_v.vertex_buffers[0] = quad_vbuf;
    bind_blur_v.views[0] = blur_texture_view;
    bind_blur_v.samplers[0] = sampler;

    bind_display.vertex_buffers[0] = quad_vbuf;
    bind_display.views[0] = scene_texture_view;
    bind_display.samplers[0] = sampler;
}

pub fn beginFrame(width: i32, height: i32) void {
    // Recreate render targets if size changed
    if (width != rt_width or height != rt_height) {
        createRenderTargets(width, height);
    }

    simgui.newFrame(.{
        .width = width,
        .height = height,
        .delta_time = sapp.frameDuration(),
        .dpi_scale = sapp.dpiScale(),
    });
}

/// Begin rendering scene to offscreen target (for blur)
pub fn beginScenePass() void {
    blur_enabled = true;
    // Switch to offscreen sgl context (RGBA8 + DEPTH format)
    sgl.setContext(offscreen_sgl_ctx);
    sg.beginPass(.{
        .action = offscreen_pass_action,
        .attachments = .{
            .colors = .{ scene_color_view, .{}, .{}, .{}, .{}, .{}, .{}, .{} },
            .depth_stencil = scene_depth_view,
        },
    });
}

/// End the offscreen scene pass
pub fn endScenePass() void {
    // Draw using offscreen context
    sgl.contextDraw(offscreen_sgl_ctx);
    sdtx.draw();
    sg.endPass();
    // Switch back to default context
    sgl.setContext(sgl.defaultContext());
}

/// Apply blur and render to screen
pub fn renderBlurredBackground(blur_amount: f32) void {
    const width_f: f32 = @floatFromInt(rt_width);
    const height_f: f32 = @floatFromInt(rt_height);
    const texel_size = [2]f32{ 1.0 / width_f, 1.0 / height_f };

    // Pass 1: Horizontal blur (scene -> blur target)
    sg.beginPass(.{
        .action = .{},
        .attachments = .{
            .colors = .{ blur_color_view, .{}, .{}, .{}, .{}, .{}, .{}, .{} },
        },
    });
    sg.applyPipeline(pip_blur_h);
    sg.applyBindings(bind_blur_h);
    sg.applyUniforms(blur_shader.UB_fs_blur_params, sg.asRange(&blur_shader.FsBlurParams{
        .texel_size = texel_size,
        .blur_amount = blur_amount,
        ._pad = 0.0,
    }));
    sg.draw(0, 4, 1);
    sg.endPass();

    // Pass 2: Vertical blur (blur target -> scene target)
    sg.beginPass(.{
        .action = .{},
        .attachments = .{
            .colors = .{ scene_color_view, .{}, .{}, .{}, .{}, .{}, .{}, .{} },
        },
    });
    sg.applyPipeline(pip_blur_v);
    sg.applyBindings(bind_blur_v);
    sg.applyUniforms(blur_shader.UB_fs_blur_params, sg.asRange(&blur_shader.FsBlurParams{
        .texel_size = texel_size,
        .blur_amount = blur_amount,
        ._pad = 0.0,
    }));
    sg.draw(0, 4, 1);
    sg.endPass();

    // Additional blur passes for stronger effect
    for (0..2) |_| {
        sg.beginPass(.{
            .action = .{},
            .attachments = .{
                .colors = .{ blur_color_view, .{}, .{}, .{}, .{}, .{}, .{}, .{} },
            },
        });
        sg.applyPipeline(pip_blur_h);
        bind_blur_h.views[0] = scene_texture_view;
        sg.applyBindings(bind_blur_h);
        sg.applyUniforms(blur_shader.UB_fs_blur_params, sg.asRange(&blur_shader.FsBlurParams{
            .texel_size = texel_size,
            .blur_amount = blur_amount,
            ._pad = 0.0,
        }));
        sg.draw(0, 4, 1);
        sg.endPass();

        sg.beginPass(.{
            .action = .{},
            .attachments = .{
                .colors = .{ scene_color_view, .{}, .{}, .{}, .{}, .{}, .{}, .{} },
            },
        });
        sg.applyPipeline(pip_blur_v);
        sg.applyBindings(bind_blur_v);
        sg.applyUniforms(blur_shader.UB_fs_blur_params, sg.asRange(&blur_shader.FsBlurParams{
            .texel_size = texel_size,
            .blur_amount = blur_amount,
            ._pad = 0.0,
        }));
        sg.draw(0, 4, 1);
        sg.endPass();
    }

    // Final pass: Draw blurred result to screen
    sg.beginPass(.{ .action = pass_action, .swapchain = sglue.swapchain() });
    sg.applyPipeline(pip_display);
    bind_display.views[0] = scene_texture_view;
    sg.applyBindings(bind_display);
    sg.draw(0, 4, 1);
}

/// Begin the main screen pass for modal content (after blur)
pub fn beginModalPass() void {
    // Continue drawing on the already-begun swapchain pass
    // Reset sgl state for modal rendering
}

pub fn endFrame() void {
    if (!blur_enabled) {
        sg.beginPass(.{ .action = pass_action, .swapchain = sglue.swapchain() });
    }
    sgl.draw();
    sdtx.draw();
    simgui.render();
    sg.endPass();
    sg.commit();
    blur_enabled = false;
}

pub fn shutdown() void {
    if (rt_width != 0) {
        sg.destroyView(scene_color_view);
        sg.destroyView(scene_depth_view);
        sg.destroyView(blur_color_view);
        sg.destroyView(scene_texture_view);
        sg.destroyView(blur_texture_view);
        sg.destroyImage(scene_color);
        sg.destroyImage(scene_depth);
        sg.destroyImage(blur_color);
    }
    sg.destroyBuffer(quad_vbuf);
    sg.destroySampler(sampler);
    sg.destroyPipeline(pip_blur_h);
    sg.destroyPipeline(pip_blur_v);
    sg.destroyPipeline(pip_display);
    sgl.destroyContext(offscreen_sgl_ctx);

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
