const sapp = @import("sokol").app;
const builtin = @import("builtin");

const ObjcId = ?*anyopaque;
const ObjcSel = ?*anyopaque;

extern "c" fn sel_registerName(name: [*c]const u8) ObjcSel;
extern "c" fn objc_msgSend() void;

pub fn configureMacWindow() void {
    if (builtin.os.tag != .macos) return;
    const window = @constCast(sapp.macosGetWindow() orelse return);

    const sel_style_mask = sel_registerName("styleMask");
    const sel_set_style_mask = sel_registerName("setStyleMask:");
    const sel_title_visibility = sel_registerName("setTitleVisibility:");
    const sel_titlebar_transparent = sel_registerName("setTitlebarAppearsTransparent:");
    const sel_standard_button = sel_registerName("standardWindowButton:");
    const sel_set_hidden = sel_registerName("setHidden:");

    const msgUsize = @as(*const fn (ObjcId, ObjcSel) callconv(.c) usize, @ptrCast(&objc_msgSend));
    const msgVoidUsize = @as(*const fn (ObjcId, ObjcSel, usize) callconv(.c) void, @ptrCast(&objc_msgSend));
    const msgVoidIsize = @as(*const fn (ObjcId, ObjcSel, isize) callconv(.c) void, @ptrCast(&objc_msgSend));
    const msgVoidBool = @as(*const fn (ObjcId, ObjcSel, bool) callconv(.c) void, @ptrCast(&objc_msgSend));
    const msgIdUsize = @as(*const fn (ObjcId, ObjcSel, usize) callconv(.c) ObjcId, @ptrCast(&objc_msgSend));

    const style_mask = msgUsize(window, sel_style_mask);
    const full_size_mask: usize = 1 << 15;
    msgVoidUsize(window, sel_set_style_mask, style_mask | full_size_mask);
    msgVoidIsize(window, sel_title_visibility, 1);
    msgVoidBool(window, sel_titlebar_transparent, true);

    const btn_close = msgIdUsize(window, sel_standard_button, 0);
    const btn_min = msgIdUsize(window, sel_standard_button, 1);
    const btn_zoom = msgIdUsize(window, sel_standard_button, 2);
    if (btn_close != null) msgVoidBool(btn_close, sel_set_hidden, true);
    if (btn_min != null) msgVoidBool(btn_min, sel_set_hidden, true);
    if (btn_zoom != null) msgVoidBool(btn_zoom, sel_set_hidden, true);
}
