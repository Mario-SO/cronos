//! TextField Component - Reusable text input field
//!
//! This component handles the common pattern of text input with:
//! - Character input handling
//! - Backspace support
//! - "Ignore next char" for modal opening shortcuts
//! - Maximum length enforcement

const sokol = @import("sokol");
const sapp = sokol.app;

/// A reusable text field that manages input state
pub fn TextField(comptime buffer_size: usize) type {
    return struct {
        buffer: [buffer_size:0]u8 = [_:0]u8{0} ** buffer_size,
        len: usize = 0,
        ignore_next_char: bool = false,

        const Self = @This();

        /// Clear the field contents
        pub fn clear(self: *Self) void {
            @memset(self.buffer[0..], 0);
            self.len = 0;
        }

        /// Get the current text as a slice
        pub fn text(self: *const Self) []const u8 {
            return self.buffer[0..self.len];
        }

        /// Get the buffer for direct access (e.g., for printing with cursor)
        pub fn getBuffer(self: *const Self) *const [buffer_size:0]u8 {
            return &self.buffer;
        }

        /// Handle a character input event
        /// Returns true if the character was handled
        pub fn handleChar(self: *Self, char_code: u32, ignore_chars: []const u8) bool {
            // Check if we should ignore this character (e.g., the key that opened the modal)
            if (self.ignore_next_char) {
                self.ignore_next_char = false;
                for (ignore_chars) |c| {
                    if (char_code == c or char_code == c - 32) { // Check both cases
                        return true;
                    }
                }
            }

            // Only accept printable ASCII characters
            if (char_code >= 32 and char_code < 127) {
                if (self.len + 1 < buffer_size) {
                    self.buffer[self.len] = @intCast(char_code);
                    self.len += 1;
                    self.buffer[self.len] = 0;
                    return true;
                }
            }
            return false;
        }

        /// Handle backspace
        /// Returns true if a character was deleted
        pub fn handleBackspace(self: *Self) bool {
            if (self.len > 0) {
                self.len -= 1;
                self.buffer[self.len] = 0;
                return true;
            }
            return false;
        }

        /// Set the content of the field
        pub fn setText(self: *Self, content: []const u8) void {
            self.clear();
            const copy_len = @min(buffer_size - 1, content.len);
            @memcpy(self.buffer[0..copy_len], content[0..copy_len]);
            self.len = copy_len;
        }

        /// Set the length (useful after formatting into buffer)
        pub fn setLen(self: *Self, new_len: usize) void {
            self.len = @min(new_len, buffer_size - 1);
        }

        /// Prepare to ignore the next character (call when opening modal with a key)
        pub fn prepareForInput(self: *Self) void {
            self.ignore_next_char = true;
        }
    };
}

/// A simple numeric-only text field
pub fn NumericField(comptime buffer_size: usize) type {
    return struct {
        buffer: [buffer_size:0]u8 = [_:0]u8{0} ** buffer_size,
        len: usize = 0,

        const Self = @This();

        pub fn clear(self: *Self) void {
            @memset(self.buffer[0..], 0);
            self.len = 0;
        }

        pub fn text(self: *const Self) []const u8 {
            return self.buffer[0..self.len];
        }

        /// Handle digit input, returns true if accepted
        pub fn handleChar(self: *Self, char_code: u32) bool {
            if (char_code >= '0' and char_code <= '9') {
                if (self.len < buffer_size - 1) {
                    self.buffer[self.len] = @intCast(char_code);
                    self.len += 1;
                    self.buffer[self.len] = 0;
                    return true;
                }
            }
            return false;
        }

        pub fn handleBackspace(self: *Self) bool {
            if (self.len > 0) {
                self.len -= 1;
                self.buffer[self.len] = 0;
                return true;
            }
            return false;
        }
    };
}

/// A letter-only text field (for month abbreviations, etc.)
pub fn AlphaField(comptime buffer_size: usize) type {
    return struct {
        buffer: [buffer_size:0]u8 = [_:0]u8{0} ** buffer_size,
        len: usize = 0,

        const Self = @This();

        pub fn clear(self: *Self) void {
            @memset(self.buffer[0..], 0);
            self.len = 0;
        }

        pub fn text(self: *const Self) []const u8 {
            return self.buffer[0..self.len];
        }

        /// Handle letter input, returns true if accepted
        pub fn handleChar(self: *Self, char_code: u32) bool {
            const is_letter = (char_code >= 'a' and char_code <= 'z') or
                (char_code >= 'A' and char_code <= 'Z');
            if (is_letter) {
                if (self.len < buffer_size - 1) {
                    self.buffer[self.len] = @intCast(char_code);
                    self.len += 1;
                    self.buffer[self.len] = 0;
                    return true;
                }
            }
            return false;
        }

        pub fn handleBackspace(self: *Self) bool {
            if (self.len > 0) {
                self.len -= 1;
                self.buffer[self.len] = 0;
                return true;
            }
            return false;
        }
    };
}
