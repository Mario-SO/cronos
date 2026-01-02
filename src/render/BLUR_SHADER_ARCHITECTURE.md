# Blur Shader Architecture - Critical Implementation Notes

This document explains the blur shader implementation for modal backgrounds. **Read this before refactoring any rendering code** to avoid breaking the blur effect.

## Overview

When a modal opens, instead of showing a simple dark overlay, we render the calendar to an offscreen texture, apply a Gaussian blur, and display the blurred result behind the modal.

## Architecture Flow

```
Modal Opens:
1. beginScenePass()     → Render calendar to offscreen RGBA8+DEPTH texture
2. endScenePass()       → Finalize offscreen rendering
3. renderBlurredBackground() → Multi-pass blur + display to swapchain
4. Modal draws on top   → Modal content renders over blurred background
5. endFrame()           → Commit frame
```

---

## Critical Implementation Details

### 1. Separate sgl Context for Offscreen Rendering

**Problem encountered:** Runtime validation error:
```
VALIDATE_APIP_COLORATTACHMENTS_FORMAT: sg_apply_pipeline: pipeline .colors[n].pixel_format doesn't match sg_pass.attachments
```

**Root cause:** `sgl` (sokol-gl) creates internal pipelines during `sgl.setup()` using the **swapchain's pixel format** (typically BGRA8 on macOS). When we tried to use `sgl.draw()` inside an offscreen pass with RGBA8 format, the pipeline formats didn't match.

**Solution:** Create a **separate sgl context** with the correct formats:

```zig
// In setup():
offscreen_sgl_ctx = sgl.makeContext(.{
    .color_format = .RGBA8,
    .depth_format = .DEPTH,
    .sample_count = 1,
});
```

**Critical code that MUST be preserved:**
- `offscreen_sgl_ctx` variable declaration
- `sgl.makeContext()` call in `setup()`
- `sgl.setContext(offscreen_sgl_ctx)` in `beginScenePass()`
- `sgl.contextDraw(offscreen_sgl_ctx)` in `endScenePass()` 
- `sgl.setContext(sgl.defaultContext())` after offscreen rendering
- `sgl.destroyContext(offscreen_sgl_ctx)` in `shutdown()`

### 2. Pipeline Pixel Format Specifications

**Problem encountered:** Same validation error as above, but for blur pipelines.

**Root cause:** Blur pipelines render to RGBA8 textures with no depth buffer, but pipelines default to swapchain format.

**Solution:** Explicitly specify formats in pipeline creation:

```zig
// Blur pipelines (render to RGBA8, no depth):
pip_blur_h = sg.makePipeline(.{
    .color_count = 1,
    .colors = .{
        .{ .pixel_format = .RGBA8 },
        // ... 7 more empty entries
    },
    .depth = .{
        .pixel_format = .NONE,  // No depth buffer for blur passes
        // ...
    },
});

// Display pipeline (renders to swapchain, uses default format):
pip_display = sg.makePipeline(.{
    // No explicit color format = uses swapchain default
    .depth = .{
        .write_enabled = false,
        .compare = .ALWAYS,
    },
});
```

**Critical:** `pip_blur_h` and `pip_blur_v` MUST have `.colors[0].pixel_format = .RGBA8` and `.depth.pixel_format = .NONE`.

### 3. Image Usage Flags (Not "render_target")

**Problem encountered:** Compilation error - no field named `render_target` in ImageDesc.

**Root cause:** Sokol API changed. Render target capability is now specified via `usage` flags.

**Solution:**
```zig
scene_color = sg.makeImage(.{
    .usage = .{ .color_attachment = true },  // NOT .render_target = true
    .pixel_format = .RGBA8,
    // ...
});

scene_depth = sg.makeImage(.{
    .usage = .{ .depth_stencil_attachment = true },
    .pixel_format = .DEPTH,
    // ...
});
```

### 4. Views Instead of Direct Image References

**Problem encountered:** Compilation errors with `Attachments` and `Bindings` structs.

**Root cause:** Modern Sokol uses `View` objects as an abstraction layer between images and their usage.

**Solution:** Create separate views for:
- **Attachment views** (for render targets):
  ```zig
  scene_color_view = sg.makeView(.{
      .color_attachment = .{ .image = scene_color },
  });
  ```
- **Texture views** (for sampling in shaders):
  ```zig
  scene_texture_view = sg.makeView(.{
      .texture = .{ .image = scene_color },
  });
  ```

**Critical:** Each image used as both a render target AND a texture source needs TWO views.

### 5. Shader Syntax for sokol-shdc

**Problem encountered:** Multiple shader compilation errors.

**Issues and fixes:**
1. **Combined sampler2D not allowed** → Use separate `texture2D` and `sampler`:
   ```glsl
   layout(binding=0) uniform texture2D tex;
   layout(binding=0) uniform sampler smp;
   // Then combine: texture(sampler2D(tex, smp), uv)
   ```

2. **Bindings required** → All uniforms need `layout(binding=X)`:
   ```glsl
   layout(binding=0) uniform texture2D tex;
   layout(binding=0) uniform sampler smp;
   layout(binding=0) uniform fs_blur_params { ... };
   ```

3. **Uniform block padding** → Uniform blocks must be 16-byte aligned:
   ```glsl
   uniform fs_blur_params {
       vec2 texel_size;   // 8 bytes
       float blur_amount; // 4 bytes
       float _pad;        // 4 bytes padding to reach 16
   };
   ```

---

## Files Involved

| File | Purpose |
|------|---------|
| `src/shaders/blur.glsl` | GLSL shader source (compiled by sokol-shdc) |
| `src/render/sokol_context.zig` | Render targets, pipelines, blur passes |
| `src/main.zig` | Frame logic that detects modals and triggers blur path |
| `build.zig` | Shader compilation via `sokol.shdc.createModule()` |
| `build.zig.zon` | Contains `sokol-tools-bin` dependency |

---

## What NOT to Simplify/Remove

1. **Do NOT merge the two sgl contexts** - They have different pixel formats
2. **Do NOT remove `color_count` or `colors` from blur pipelines** - Format must match render targets
3. **Do NOT remove the `_pad` field from shader uniforms** - Causes GPU memory alignment issues
4. **Do NOT use `sgl.draw()` in offscreen pass** - Must use `sgl.contextDraw(offscreen_sgl_ctx)`
5. **Do NOT remove texture views** - Both attachment and texture views are needed
6. **Do NOT remove `layout(binding=X)` from shaders** - Required by sokol-shdc for Metal

---

## Testing the Blur Feature

1. Run `zig build run`
2. Press `A` to open Add Event modal
3. Press `V` to open View Events modal  
4. Press `G` to open Go To Date modal

All three should show a blurred calendar background instead of a solid dark overlay.
