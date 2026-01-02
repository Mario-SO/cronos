//! UI Theme - Centralized colors, dimensions, and layout constants
//!
//! This module provides a single source of truth for all UI styling,
//! making it easy to maintain visual consistency and adjust the look.

pub const Color = struct {
    r: f32,
    g: f32,
    b: f32,
    a: f32 = 1.0,

    pub fn rgb(r: f32, g: f32, b: f32) Color {
        return .{ .r = r, .g = g, .b = b, .a = 1.0 };
    }

    pub fn rgba(r: f32, g: f32, b: f32, a: f32) Color {
        return .{ .r = r, .g = g, .b = b, .a = a };
    }
};

// =============================================================================
// Color Palette
// =============================================================================

pub const colors = struct {
    // Background colors
    pub const app_background = Color.rgb(0.95, 0.96, 0.98);
    pub const modal_background = Color.rgb(0.98, 0.98, 0.98);
    pub const modal_overlay = Color.rgba(0.0, 0.0, 0.0, 0.35);
    pub const info_box = Color.rgb(0.94, 0.94, 0.96);
    pub const field_background = Color.rgb(0.92, 0.92, 0.92);
    pub const field_focused = Color.rgb(1.0, 1.0, 1.0);

    // Border colors
    pub const border = Color.rgb(0.2, 0.2, 0.25);
    pub const border_muted = Color.rgb(0.7, 0.7, 0.7);
    pub const border_focused = Color.rgb(0.2, 0.5, 0.9);

    // Text colors
    pub const text = Color.rgb(0.1, 0.1, 0.15);
    pub const text_muted = Color.rgb(0.3, 0.3, 0.35);
    pub const text_hint = Color.rgb(0.5, 0.5, 0.55);
    pub const text_placeholder = Color.rgb(0.6, 0.6, 0.6);
    pub const text_time = Color.rgb(0.4, 0.4, 0.45);
    pub const text_error = Color.rgb(0.8, 0.2, 0.2);

    // Calendar cell highlights
    pub const cell_selected = Color.rgba(0.9, 0.6, 0.2, 0.35);
    pub const cell_today = Color.rgba(0.2, 0.6, 0.2, 0.25);
};

// =============================================================================
// Event Colors (kept in sync with lib/cronos/events.zig)
// =============================================================================

pub const EventColor = struct {
    name: []const u8,
    color: Color,
};

pub const event_colors = [_]EventColor{
    .{ .name = "gray", .color = Color.rgb(0.5, 0.5, 0.5) },
    .{ .name = "blue", .color = Color.rgb(0.2, 0.4, 0.8) },
    .{ .name = "green", .color = Color.rgb(0.2, 0.7, 0.3) },
    .{ .name = "red", .color = Color.rgb(0.85, 0.2, 0.2) },
    .{ .name = "yellow", .color = Color.rgb(0.85, 0.75, 0.1) },
    .{ .name = "purple", .color = Color.rgb(0.6, 0.3, 0.7) },
    .{ .name = "orange", .color = Color.rgb(0.9, 0.5, 0.1) },
};

pub fn getEventColor(index: u8) Color {
    if (index < event_colors.len) {
        return event_colors[index].color;
    }
    return event_colors[0].color;
}

pub fn getEventColorName(index: u8) []const u8 {
    if (index < event_colors.len) {
        return event_colors[index].name;
    }
    return event_colors[0].name;
}

// =============================================================================
// Layout Constants
// =============================================================================

pub const layout = struct {
    // General spacing
    pub const padding: f32 = 16.0;
    pub const padding_small: f32 = 8.0;
    pub const line_height: f32 = 14.0;

    // Calendar
    pub const calendar_margin: f32 = 32.0;
    pub const header_height: f32 = 28.0;
    pub const weekday_height: f32 = 20.0;

    // Debug text scale (sokol debugtext uses 8x8 pixel chars)
    pub const text_scale: f32 = 8.0;
};

// =============================================================================
// Modal Sizes
// =============================================================================

pub const ModalSize = struct {
    width: f32,
    height: f32,
};

pub const Position = struct {
    x: f32,
    y: f32,
};

pub const modal_sizes = struct {
    pub const add_event = ModalSize{ .width = 420.0, .height = 220.0 };
    pub const view_events = ModalSize{ .width = 520.0, .height = 240.0 };
    pub const goto_date = ModalSize{ .width = 380.0, .height = 140.0 };
};

// =============================================================================
// Helpers
// =============================================================================

/// Calculate centered modal position
pub fn centerModal(screen_width: f32, screen_height: f32, modal_size: ModalSize) Position {
    return .{
        .x = (screen_width - modal_size.width) * 0.5,
        .y = (screen_height - modal_size.height) * 0.5,
    };
}

/// Convert pixel position to debug text position
pub fn toTextPos(pixels: f32) f32 {
    return pixels / layout.text_scale;
}
