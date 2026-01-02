//! UI Primitives - Reusable drawing functions for common UI elements
//!
//! This module provides low-level drawing primitives that are used across
//! different UI components, eliminating code duplication and ensuring
//! visual consistency.

const sokol = @import("sokol");
const sgl = sokol.gl;
const sdtx = sokol.debugtext;
const theme = @import("theme.zig");

// =============================================================================
// Basic Shape Drawing
// =============================================================================

/// Draw a filled rectangle (quad)
pub fn fillRect(x: f32, y: f32, w: f32, h: f32, color: theme.Color) void {
    sgl.beginQuads();
    sgl.c4f(color.r, color.g, color.b, color.a);
    sgl.v2f(x, y);
    sgl.v2f(x + w, y);
    sgl.v2f(x + w, y + h);
    sgl.v2f(x, y + h);
    sgl.end();
}

/// Draw a rectangle border (outline only)
pub fn strokeRect(x: f32, y: f32, w: f32, h: f32, color: theme.Color) void {
    sgl.beginLines();
    sgl.c3f(color.r, color.g, color.b);
    // Top edge
    sgl.v2f(x, y);
    sgl.v2f(x + w, y);
    // Right edge
    sgl.v2f(x + w, y);
    sgl.v2f(x + w, y + h);
    // Bottom edge
    sgl.v2f(x + w, y + h);
    sgl.v2f(x, y + h);
    // Left edge
    sgl.v2f(x, y + h);
    sgl.v2f(x, y);
    sgl.end();
}

/// Draw a horizontal line
pub fn hline(x: f32, y: f32, length: f32, color: theme.Color) void {
    sgl.beginLines();
    sgl.c3f(color.r, color.g, color.b);
    sgl.v2f(x, y);
    sgl.v2f(x + length, y);
    sgl.end();
}

// =============================================================================
// Modal Components
// =============================================================================

/// Draw a semi-transparent overlay covering the entire screen
pub fn drawModalOverlay(width: f32, height: f32) void {
    fillRect(0.0, 0.0, width, height, theme.colors.modal_overlay);
}

/// Draw a modal box (background + border)
pub fn drawModalBox(x: f32, y: f32, w: f32, h: f32) void {
    fillRect(x, y, w, h, theme.colors.modal_background);
    strokeRect(x, y, w, h, theme.colors.border);
}

/// Draw a centered modal box and return its position
pub fn drawCenteredModal(screen_width: f32, screen_height: f32, modal_size: theme.ModalSize) theme.Position {
    const pos = theme.centerModal(screen_width, screen_height, modal_size);
    drawModalBox(pos.x, pos.y, modal_size.width, modal_size.height);
    return pos;
}

// =============================================================================
// Form Field Components
// =============================================================================

/// Draw a text input field box
pub fn drawInputField(x: f32, y: f32, w: f32, h: f32, focused: bool) void {
    // Background
    const bg_color = if (focused) theme.colors.field_focused else theme.colors.field_background;
    fillRect(x, y, w, h, bg_color);

    // Border
    const border_color = if (focused) theme.colors.border_focused else theme.colors.border_muted;
    strokeRect(x, y, w, h, border_color);

    // Underline accent for focused field
    if (focused) {
        hline(x, y + h, w, theme.colors.border_focused);
        hline(x, y + h + 1, w, theme.colors.border_focused);
    }
}

/// Draw a small color indicator square
pub fn drawColorIndicator(x: f32, y: f32, color_index: u8) void {
    const color = theme.getEventColor(color_index);
    fillRect(x, y, 16.0, 12.0, color);
}

/// Draw a color indicator with custom size
pub fn drawColorIndicatorSized(x: f32, y: f32, w: f32, h: f32, color_index: u8) void {
    const color = theme.getEventColor(color_index);
    fillRect(x, y, w, h, color);
}

// =============================================================================
// Text Setup Helpers
// =============================================================================

/// Initialize debug text rendering for a frame
pub fn setupText(width: f32, height: f32) void {
    sdtx.canvas(width, height);
    sdtx.origin(0.0, 0.0);
    sdtx.font(0);
    sdtx.color3f(theme.colors.text.r, theme.colors.text.g, theme.colors.text.b);
}

/// Set text color from theme
pub fn setTextColor(color: theme.Color) void {
    sdtx.color3f(color.r, color.g, color.b);
}

/// Position text in pixel coordinates
pub fn textPos(x: f32, y: f32) void {
    sdtx.pos(theme.toTextPos(x), theme.toTextPos(y));
}
