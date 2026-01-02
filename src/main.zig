const std = @import("std");
const sokol = @import("sokol");
const slog = sokol.log;
const sg = sokol.gfx;
const sapp = sokol.app;
const sglue = sokol.glue;
const sgl = sokol.gl;
const sdtx = sokol.debugtext;
const simgui = sokol.imgui;
const builtin = @import("builtin");

const ObjcId = ?*anyopaque;
const ObjcSel = ?*anyopaque;

extern "c" fn sel_registerName(name: [*c]const u8) ObjcSel;
extern "c" fn objc_msgSend() void;

const Date = struct {
    year: i32,
    month: u8,
    day: u8,
};

const Event = struct {
    date_days: i64,
    title: [64:0]u8,
};

const state = struct {
    var pass_action: sg.PassAction = .{};
    var current_year: i32 = 1970;
    var current_month: u8 = 1;
    var selected: Date = .{ .year = 1970, .month = 1, .day = 1 };
    var today: Date = .{ .year = 1970, .month = 1, .day = 1 };
    var add_modal_open: bool = false;
    var add_input: [128:0]u8 = [_:0]u8{0} ** 128;
    var add_input_len: usize = 0;
    var add_ignore_next_char: bool = false;
    var view_modal_open: bool = false;
    var events: [128]Event = undefined;
    var events_count: usize = 0;
};

export fn init() void {
    // initialize sokol-gfx
    sg.setup(.{
        .environment = sglue.environment(),
        .logger = .{ .func = slog.func },
    });
    // initialize sokol-gl and sokol-debugtext
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
    // initialize sokol-imgui
    simgui.setup(.{
        .logger = .{ .func = slog.func },
    });

    state.today = currentUtcDate();
    state.current_year = state.today.year;
    state.current_month = state.today.month;
    state.selected = state.today;
    configureMacWindow();

    // initial clear color
    state.pass_action.colors[0] = .{
        .load_action = .CLEAR,
        .clear_value = .{ .r = 0.95, .g = 0.96, .b = 0.98, .a = 1.0 },
    };
}

export fn frame() void {
    // call simgui.newFrame() before any ImGui calls
    simgui.newFrame(.{
        .width = sapp.width(),
        .height = sapp.height(),
        .delta_time = sapp.frameDuration(),
        .dpi_scale = sapp.dpiScale(),
    });

    drawCalendarSokol(@as(f32, @floatFromInt(sapp.width())), @as(f32, @floatFromInt(sapp.height())));
    drawAddEventOverlay(@as(f32, @floatFromInt(sapp.width())), @as(f32, @floatFromInt(sapp.height())));
    drawViewEventsOverlay(@as(f32, @floatFromInt(sapp.width())), @as(f32, @floatFromInt(sapp.height())));

    // call simgui.render() inside a sokol-gfx pass
    sg.beginPass(.{ .action = state.pass_action, .swapchain = sglue.swapchain() });
    sgl.draw();
    sdtx.draw();
    simgui.render();
    sg.endPass();
    sg.commit();
}

export fn cleanup() void {
    simgui.shutdown();
    sdtx.shutdown();
    sgl.shutdown();
    sg.shutdown();
}

export fn event(ev: [*c]const sapp.Event) void {
    // forward input events to sokol-imgui
    _ = simgui.handleEvent(ev.*);
    if (state.add_modal_open) {
        handleAddModalEvent(ev.*);
        return;
    }
    if (state.view_modal_open) {
        handleViewModalEvent(ev.*);
        return;
    }
    if (ev.*.type == .KEY_DOWN and !ev.*.key_repeat) {
        switch (ev.*.key_code) {
            .LEFT => shiftMonth(-1),
            .RIGHT => shiftMonth(1),
            .H => moveSelectedByDays(-1),
            .J => moveSelectedByDays(7),
            .K => moveSelectedByDays(-7),
            .L => moveSelectedByDays(1),
            .A => openAddModal(),
            .T => goToToday(),
            .V => openViewModal(),
            else => {},
        }
    }
}

pub fn main() void {
    sapp.run(.{
        .init_cb = init,
        .frame_cb = frame,
        .cleanup_cb = cleanup,
        .event_cb = event,
        .window_title = "Cronos",
        .width = 1024,
        .height = 676,
        .icon = .{ .sokol_default = true },
        .logger = .{ .func = slog.func },
    });
}

fn configureMacWindow() void {
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

fn setup2D(width: f32, height: f32) void {
    sgl.defaults();
    sgl.viewportf(0.0, 0.0, width, height, true);
    sgl.matrixModeProjection();
    sgl.loadIdentity();
    sgl.ortho(0.0, width, height, 0.0, -1.0, 1.0);
    sgl.matrixModeModelview();
    sgl.loadIdentity();
}

fn drawCalendarSokol(width: f32, height: f32) void {
    const month_names = [_][]const u8{
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    };
    const weekday_names = [_][]const u8{
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
    };

    const margin: f32 = 32.0;
    const header_h: f32 = 28.0;
    const weekday_h: f32 = 20.0;
    const grid_left = margin;
    const grid_right = width - margin;
    const grid_top = margin + header_h + weekday_h;
    const grid_bottom = height - margin;
    const cell_w = (grid_right - grid_left) / 7.0;
    const cell_h = (grid_bottom - grid_top) / 6.0;

    setup2D(width, height);

    const days_in_month = daysInMonth(state.current_year, state.current_month);
    const first_weekday = weekdayOfFirst(state.current_year, state.current_month);

    sgl.beginQuads();
    var day: u8 = 1;
    while (day <= days_in_month) : (day += 1) {
        const cell_index = first_weekday + (day - 1);
        const row = cell_index / 7;
        const col = cell_index % 7;

        const x0 = grid_left + cell_w * @as(f32, @floatFromInt(col));
        const y0 = grid_top + cell_h * @as(f32, @floatFromInt(row));
        const x1 = x0 + cell_w;
        const y1 = y0 + cell_h;

        const is_today = state.current_year == state.today.year and
            state.current_month == state.today.month and
            day == state.today.day;
        const is_selected = state.current_year == state.selected.year and
            state.current_month == state.selected.month and
            day == state.selected.day;

        if (is_selected) {
            sgl.c4f(0.9, 0.6, 0.2, 0.35);
        } else if (is_today) {
            sgl.c4f(0.2, 0.6, 0.2, 0.25);
        } else {
            continue;
        }

        sgl.v2f(x0, y0);
        sgl.v2f(x1, y0);
        sgl.v2f(x1, y1);
        sgl.v2f(x0, y1);
    }
    sgl.end();

    sgl.beginLines();
    sgl.c3f(0.2, 0.2, 0.25);
    day = 1;
    while (day <= days_in_month) : (day += 1) {
        const cell_index = first_weekday + (day - 1);
        const row = cell_index / 7;
        const col = cell_index % 7;

        const x0 = grid_left + cell_w * @as(f32, @floatFromInt(col));
        const y0 = grid_top + cell_h * @as(f32, @floatFromInt(row));
        const x1 = x0 + cell_w;
        const y1 = y0 + cell_h;

        sgl.v2f(x0, y0);
        sgl.v2f(x1, y0);
        sgl.v2f(x1, y0);
        sgl.v2f(x1, y1);
        sgl.v2f(x1, y1);
        sgl.v2f(x0, y1);
        sgl.v2f(x0, y1);
        sgl.v2f(x0, y0);
    }
    sgl.end();

    if (!(state.add_modal_open or state.view_modal_open)) {
        sdtx.canvas(width, height);
        sdtx.origin(0.0, 0.0);
        sdtx.font(0);
        sdtx.color3f(0.1, 0.1, 0.15);

        const month_name = month_names[state.current_month - 1];
        sdtx.pos(grid_left / 8.0, margin / 8.0);
        sdtx.print("< {s} {d} >", .{ month_name, state.current_year });
        sdtx.pos(grid_left / 8.0, (margin + 14.0) / 8.0);

        var wd: u8 = 0;
        while (wd < weekday_names.len) : (wd += 1) {
            const label = weekday_names[wd];
            const x = grid_left + cell_w * @as(f32, @floatFromInt(wd)) + 6.0;
            const y = grid_top - weekday_h + 4.0;
            sdtx.pos(x / 8.0, y / 8.0);
            sdtx.print("{s}", .{label});
        }

        day = 1;
        while (day <= days_in_month) : (day += 1) {
            const cell_index = first_weekday + (day - 1);
            const row = cell_index / 7;
            const col = cell_index % 7;
            const x = grid_left + cell_w * @as(f32, @floatFromInt(col)) + 6.0;
            const y = grid_top + cell_h * @as(f32, @floatFromInt(row)) + 6.0;
            sdtx.pos(x / 8.0, y / 8.0);
            sdtx.print("{d}", .{day});

            const date_days = daysFromCivil(state.current_year, state.current_month, day);
            const title = firstEventTitle(date_days);
            if (title.len > 0) {
                const preview_len = if (title.len > 8) 8 else title.len;
                sdtx.pos(x / 8.0, (y + 12.0) / 8.0);
                sdtx.print("{s}", .{title[0..preview_len]});
            }
        }
    }
}

fn shiftMonth(delta: i32) void {
    var year = state.current_year;
    var month = @as(i32, state.current_month) + delta;

    while (month < 1) : (month += 12) {
        year -= 1;
    }
    while (month > 12) : (month -= 12) {
        year += 1;
    }

    state.current_year = year;
    state.current_month = @intCast(month);
    state.selected.year = year;
    state.selected.month = @intCast(month);
    const max_day = daysInMonth(state.selected.year, state.selected.month);
    if (state.selected.day > max_day) {
        state.selected.day = max_day;
    }
}

fn moveSelectedByDays(delta: i32) void {
    const current_days = daysFromCivil(state.selected.year, state.selected.month, state.selected.day);
    const next_days = current_days + @as(i64, delta);
    const next = civilFromDays(next_days);
    state.selected = next;
    state.current_year = next.year;
    state.current_month = next.month;
}

fn openAddModal() void {
    @memset(state.add_input[0..], 0);
    state.add_input_len = 0;
    state.add_ignore_next_char = true;
    state.add_modal_open = true;
    state.view_modal_open = false;
}

fn openViewModal() void {
    state.view_modal_open = true;
    state.add_modal_open = false;
}

fn goToToday() void {
    state.selected = state.today;
    state.current_year = state.today.year;
    state.current_month = state.today.month;
}

fn handleAddModalEvent(ev: sapp.Event) void {
    if (ev.type == .KEY_DOWN and !ev.key_repeat) {
        switch (ev.key_code) {
            .ESCAPE => {
                state.add_modal_open = false;
            },
            .ENTER, .KP_ENTER => {
                if (addEventFromInput()) {
                    state.add_modal_open = false;
                }
            },
            .BACKSPACE => {
                if (state.add_input_len > 0) {
                    state.add_input_len -= 1;
                    state.add_input[state.add_input_len] = 0;
                }
            },
            else => {},
        }
    } else if (ev.type == .CHAR) {
        const ch = ev.char_code;
        if (state.add_ignore_next_char) {
            state.add_ignore_next_char = false;
            if (ch == 'a' or ch == 'A') return;
        }
        if (ch >= 32 and ch < 127) {
            if (state.add_input_len + 1 < state.add_input.len) {
                state.add_input[state.add_input_len] = @intCast(ch);
                state.add_input_len += 1;
                state.add_input[state.add_input_len] = 0;
            }
        }
    }
}

fn handleViewModalEvent(ev: sapp.Event) void {
    if (ev.type == .KEY_DOWN and !ev.key_repeat) {
        if (ev.key_code == .ESCAPE or ev.key_code == .V) {
            state.view_modal_open = false;
        }
    }
}

fn drawAddEventOverlay(width: f32, height: f32) void {
    if (!state.add_modal_open) return;

    setup2D(width, height);
    sgl.beginQuads();
    sgl.c4f(0.0, 0.0, 0.0, 0.35);
    sgl.v2f(0.0, 0.0);
    sgl.v2f(width, 0.0);
    sgl.v2f(width, height);
    sgl.v2f(0.0, height);
    sgl.end();

    const box_w: f32 = 420.0;
    const box_h: f32 = 160.0;
    const box_x = (width - box_w) * 0.5;
    const box_y = (height - box_h) * 0.5;

    sgl.beginQuads();
    sgl.c4f(0.98, 0.98, 0.98, 1.0);
    sgl.v2f(box_x, box_y);
    sgl.v2f(box_x + box_w, box_y);
    sgl.v2f(box_x + box_w, box_y + box_h);
    sgl.v2f(box_x, box_y + box_h);
    sgl.end();

    sgl.beginLines();
    sgl.c3f(0.2, 0.2, 0.25);
    sgl.v2f(box_x, box_y);
    sgl.v2f(box_x + box_w, box_y);
    sgl.v2f(box_x + box_w, box_y);
    sgl.v2f(box_x + box_w, box_y + box_h);
    sgl.v2f(box_x + box_w, box_y + box_h);
    sgl.v2f(box_x, box_y + box_h);
    sgl.v2f(box_x, box_y + box_h);
    sgl.v2f(box_x, box_y);
    sgl.end();

    sdtx.canvas(width, height);
    sdtx.origin(0.0, 0.0);
    sdtx.font(0);
    sdtx.color3f(0.1, 0.1, 0.15);

    sdtx.pos((box_x + 16.0) / 8.0, (box_y + 14.0) / 8.0);
    sdtx.print("Add Event", .{});
    sdtx.pos((box_x + 16.0) / 8.0, (box_y + 30.0) / 8.0);
    sdtx.print("Enter title and press Enter", .{});

    const month_names = [_][]const u8{
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    };
    const sel_month = month_names[state.selected.month - 1];
    sdtx.pos((box_x + 16.0) / 8.0, (box_y + 46.0) / 8.0);
    sdtx.print("{s} {d}, {d}", .{ sel_month, state.selected.day, state.selected.year });

    const input = std.mem.sliceTo(state.add_input[0..], 0);
    sdtx.pos((box_x + 16.0) / 8.0, (box_y + 70.0) / 8.0);
    sdtx.print("> {s}_", .{input});

    sdtx.pos((box_x + 16.0) / 8.0, (box_y + 110.0) / 8.0);
    sdtx.print("Esc: cancel", .{});
}

fn drawViewEventsOverlay(width: f32, height: f32) void {
    if (!state.view_modal_open) return;

    setup2D(width, height);
    sgl.beginQuads();
    sgl.c4f(0.0, 0.0, 0.0, 0.35);
    sgl.v2f(0.0, 0.0);
    sgl.v2f(width, 0.0);
    sgl.v2f(width, height);
    sgl.v2f(0.0, height);
    sgl.end();

    const box_w: f32 = 520.0;
    const box_h: f32 = 240.0;
    const box_x = (width - box_w) * 0.5;
    const box_y = (height - box_h) * 0.5;

    sgl.beginQuads();
    sgl.c4f(0.98, 0.98, 0.98, 1.0);
    sgl.v2f(box_x, box_y);
    sgl.v2f(box_x + box_w, box_y);
    sgl.v2f(box_x + box_w, box_y + box_h);
    sgl.v2f(box_x, box_y + box_h);
    sgl.end();

    sgl.beginLines();
    sgl.c3f(0.2, 0.2, 0.25);
    sgl.v2f(box_x, box_y);
    sgl.v2f(box_x + box_w, box_y);
    sgl.v2f(box_x + box_w, box_y);
    sgl.v2f(box_x + box_w, box_y + box_h);
    sgl.v2f(box_x + box_w, box_y + box_h);
    sgl.v2f(box_x, box_y + box_h);
    sgl.v2f(box_x, box_y + box_h);
    sgl.v2f(box_x, box_y);
    sgl.end();

    sdtx.canvas(width, height);
    sdtx.origin(0.0, 0.0);
    sdtx.font(0);
    sdtx.color3f(0.1, 0.1, 0.15);

    const month_names = [_][]const u8{
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    };
    const sel_month = month_names[state.selected.month - 1];
    sdtx.pos((box_x + 16.0) / 8.0, (box_y + 14.0) / 8.0);
    sdtx.print("Events for {s} {d}, {d}", .{ sel_month, state.selected.day, state.selected.year });

    const selected_days = daysFromCivil(state.selected.year, state.selected.month, state.selected.day);
    var line_y = box_y + 44.0;
    var shown: usize = 0;
    var idx: usize = 0;
    while (idx < state.events_count and shown < 10) : (idx += 1) {
        const ev = state.events[idx];
        if (ev.date_days != selected_days) continue;
        const title = std.mem.sliceTo(ev.title[0..], 0);
        sdtx.pos((box_x + 16.0) / 8.0, line_y / 8.0);
        sdtx.print("- {s}", .{title});
        line_y += 14.0;
        shown += 1;
    }
    if (shown == 0) {
        sdtx.pos((box_x + 16.0) / 8.0, line_y / 8.0);
        sdtx.print("No events.", .{});
    }
    sdtx.pos((box_x + 16.0) / 8.0, (box_y + box_h - 20.0) / 8.0);
    sdtx.print("Esc or V: close", .{});
}

fn addEventFromInput() bool {
    const input = std.mem.sliceTo(state.add_input[0..], 0);
    if (input.len == 0) return false;
    if (state.events_count >= state.events.len) return false;

    const date_days = daysFromCivil(state.selected.year, state.selected.month, state.selected.day);
    var ev = &state.events[state.events_count];
    ev.date_days = date_days;
    const max_len = ev.title.len - 1;
    const copy_len = @min(max_len, input.len);
    std.mem.copyForwards(u8, ev.title[0..copy_len], input[0..copy_len]);
    ev.title[copy_len] = 0;
    state.events_count += 1;
    return true;
}

fn firstEventTitle(date_days: i64) []const u8 {
    var idx: usize = 0;
    while (idx < state.events_count) : (idx += 1) {
        const ev = state.events[idx];
        if (ev.date_days != date_days) continue;
        return std.mem.sliceTo(ev.title[0..], 0);
    }
    return "";
}

fn currentUtcDate() Date {
    const seconds = std.time.timestamp();
    const days = @divFloor(seconds, 60 * 60 * 24);
    return civilFromDays(days);
}

fn daysInMonth(year: i32, month: u8) u8 {
    return switch (month) {
        1, 3, 5, 7, 8, 10, 12 => 31,
        4, 6, 9, 11 => 30,
        2 => if (isLeapYear(year)) 29 else 28,
        else => 30,
    };
}

fn isLeapYear(year: i32) bool {
    if (@mod(year, 4) != 0) return false;
    if (@mod(year, 100) != 0) return true;
    return (@mod(year, 400) == 0);
}

fn weekdayOfFirst(year: i32, month: u8) u8 {
    return dayOfWeek(year, month, 1);
}

fn dayOfWeek(year: i32, month: u8, day: u8) u8 {
    const days = daysFromCivil(year, month, day);
    const shifted = days + 4;
    const mod = @mod(shifted, 7);
    return @intCast(mod);
}

fn daysFromCivil(year: i32, month: u8, day: u8) i64 {
    var y = year;
    const m = @as(i32, month);
    const d = @as(i32, day);

    y -= if (m <= 2) 1 else 0;
    const era = @divFloor(y, 400);
    const yoe = y - era * 400;
    const mp = m + (if (m <= 2) @as(i32, 9) else @as(i32, -3));
    const doy = @divFloor(153 * mp + 2, 5) + d - 1;
    const doe = yoe * 365 + @divFloor(yoe, 4) - @divFloor(yoe, 100) + doy;
    return @as(i64, era) * 146097 + @as(i64, doe) - 719468;
}

fn civilFromDays(days: i64) Date {
    const z = days + 719468;
    const era = @divFloor(z, 146097);
    const doe = z - era * 146097;
    const yoe = @divFloor(doe - @divFloor(doe, 1460) + @divFloor(doe, 36524) - @divFloor(doe, 146096), 365);
    var y = yoe + era * 400;
    const doy = doe - (365 * yoe + @divFloor(yoe, 4) - @divFloor(yoe, 100));
    const mp = @divFloor(5 * doy + 2, 153);
    const d = doy - @divFloor(153 * mp + 2, 5) + 1;
    const m = mp + (if (mp < 10) @as(i64, 3) else @as(i64, -9));
    y += if (m <= 2) 1 else 0;

    return .{
        .year = @intCast(y),
        .month = @intCast(m),
        .day = @intCast(d),
    };
}
