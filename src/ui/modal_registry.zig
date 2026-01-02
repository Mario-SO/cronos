//! Modal Registry - Unified modal management system
//!
//! This module provides a registry for all modals in the application,
//! following the Open/Closed Principle. Adding a new modal only requires:
//! 1. Creating the modal module with isOpen, handleEvent, draw functions
//! 2. Adding it to the modals array in this file
//!
//! The main.zig can then use this registry for all modal operations.

const sokol = @import("sokol");
const sapp = sokol.app;
const State = @import("../app/state.zig").State;

// Import all modals
const add_event = @import("modals/add_event.zig");
const view_events = @import("modals/view_events.zig");
const go_to_date = @import("modals/go_to_date.zig");

/// Modal interface - each modal must implement these functions
pub const Modal = struct {
    /// Check if this modal is currently open
    isOpen: *const fn (*const State) bool,
    /// Handle input events when this modal is active
    handleEvent: *const fn (*State, sapp.Event) void,
    /// Draw the modal
    draw: *const fn (*const State, f32, f32) void,
    /// Priority for event handling (higher = checked first)
    priority: u8,
};

/// Registry of all modals, sorted by priority (highest first)
/// Priority determines which modal handles events when multiple are open
pub const modals = [_]Modal{
    // Add/Edit event modal has highest priority (overlays view modal during edit)
    .{
        .isOpen = add_event.isOpen,
        .handleEvent = add_event.handleEvent,
        .draw = add_event.draw,
        .priority = 100,
    },
    // Go to date modal
    .{
        .isOpen = go_to_date.isOpen,
        .handleEvent = go_to_date.handleEvent,
        .draw = go_to_date.draw,
        .priority = 90,
    },
    // View events modal
    .{
        .isOpen = view_events.isOpen,
        .handleEvent = view_events.handleEvent,
        .draw = view_events.draw,
        .priority = 80,
    },
};

/// Check if any modal is currently open
pub fn isAnyOpen(state: *const State) bool {
    for (modals) |modal| {
        if (modal.isOpen(state)) return true;
    }
    return false;
}

/// Handle events for the currently active modal (highest priority open modal)
/// Returns true if an event was handled by a modal
pub fn handleEvent(state: *State, ev: sapp.Event) bool {
    for (modals) |modal| {
        if (modal.isOpen(state)) {
            modal.handleEvent(state, ev);
            return true;
        }
    }
    return false;
}

/// Draw all open modals in order (lowest priority first, so higher overlays)
pub fn drawAll(state: *const State, width: f32, height: f32) void {
    // Draw in reverse order so higher priority modals appear on top
    var i: usize = modals.len;
    while (i > 0) {
        i -= 1;
        modals[i].draw(state, width, height);
    }
}
