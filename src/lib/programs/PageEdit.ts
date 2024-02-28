import { colours } from "../Colours";
import Page from "../Page";
import Terminal, { TerminalCell } from "../Terminal";
import { OSEventTarget, Program } from "../util";

export default class PageEdit extends Program {
    _resolve_quit!: (v: unknown) => void;
    _ket!: OSEventTarget;
    _term!: Terminal;
    _page!: Page;
    _page_cursor = {
        row: 0,
        col: 0
    };
    _arrow_handler_stack: Array<[(key: string, data: any) => Promise<void>, any]> = [];
    _key_handler_stack: Array<[(key: KeyboardEvent, data: any) => Promise<void>, any]> = [];
    _page_name = ""
    _ins = true;
    _btm_bar: TerminalCell[] = [];
    _display_stack!: Page[];
    _final_display!: Page;
    _fg_colour = colours.white;
    _bg_colour = colours.black;
    _clipboard: TerminalCell[][] | TerminalCell | null = null;
    _selection = {
        start: {
            row: 0,
            col: 0
        },
        end: {
            row: 0,
            col: 0
        }
    }
    _selection_active = false;
    async run(keyboard_event_target: OSEventTarget, terminal: Terminal) {
        let should_quit = false;
        this._ket = keyboard_event_target;
        this._term = terminal;
        terminal.clear();
        this._page = new Page(this._term.rows - 2, this._term.cols);
        this._display_stack = [this._page];
        this._final_display = new Page(this._term.rows, this._term.cols);
        this._term.move_cursor(0, 1);
        this._arrow_handler_stack[0] = [this._main_arrow_handler, {}];
        this._key_handler_stack[0] = [this._main_key_handler, {}];
        await this.dump_to_screen();
        while (!should_quit){
            const kp = await this.next_keypress();
            if (kp.key === "c" && kp.ctrlKey) {
                console.log("quit");
                should_quit = true;
                this._term.clear();
                this._term.move_cursor(0,0);
                break;
            }
            else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(kp.key)) {
                this._handle_arrow(kp.key);
            } else {
                this._handle_key(kp);
            }
            await this.dump_to_screen();
        }
    }

    private async _handle_arrow(key: string) {
        await this._arrow_handler_stack.at(-1)![0](key, this._arrow_handler_stack.at(-1)![1]);
    }

    private async _handle_key(key: KeyboardEvent) {
        await this._key_handler_stack.at(-1)![0](key, this._key_handler_stack.at(-1)![1]);
    }

    public async next_keypress(): Promise<KeyboardEvent> {
        let res_next_key: (k: any) => void;
        const el: EventListener = (key: Event) => {
            res_next_key(key);
        }
        this._ket.addEventListener("keydown", el);
        const next_key_promise = new Promise(r => {
            res_next_key = r;
        });
        const kp = await next_key_promise;
        this._ket.removeEventListener("keydown", el);
        return kp as KeyboardEvent;
    }

    public async dump_to_screen() {
        this._generate_topbar();
        let q = 0;
        for (const d of this._display_stack) {
            let row = 0;
            for (const r of d) {
                if (r === undefined) continue;
                if (++row > this._term.rows - 2) continue;
                for (const c of r) {
                    try {
                        this._final_display[q === 0 ? c.row + 1 : c.row][c.col].copy_from(c);
                    } catch (e) {
                        //do nothing
                    }
                }
            }
            q++;
        }
        this._generate_bottombar();
        for (const r of this._final_display) {
            for (const c of r) {
                this._term.put_termchar(c.code);
            }
        }
        this._term.hide_cursor();
        this._term.show_cursor();
    }

    private _generate_topbar() {
        const topbar_left = `PageEdit`;
        const topbar_right = `R${this._page_cursor.row}, C${this._page_cursor.col}`;
        const total_length = topbar_left.length + topbar_right.length;
        const spaces = this._term.cols - total_length;
        const space_str = " ".repeat(spaces);
        const tb = topbar_left + space_str + topbar_right;
        this._final_display.write_string_at(0, 0, tb, colours.yellow, colours.blue);
        this._final_display[0][27].set({
            character_index: "A".charCodeAt(0),
            foreground_colour: this._fg_colour,
            background_colour: this._bg_colour
        });
        if (this._clipboard !== null && this._clipboard instanceof TerminalCell) this._final_display[0][25].set({
            character_index: this._clipboard.character_index,
            foreground_colour: this._clipboard.foreground_colour,
            background_colour: this._clipboard.background_colour
        });
        else if (this._clipboard !== null) this._final_display[0][25].set({
            character_index: "M".charCodeAt(0),
            foreground_colour: this._clipboard[0][0].foreground_colour,
            background_colour: this._clipboard[0][0].background_colour
        });
    }

    private _bottom_bar_text = "PRESS CTRL+H FOR HELP.";

    private _generate_bottombar() {
        this._final_display.clear_line(this._term.rows - 1, colours.green);
        this._final_display.write_string_at(this._term.rows - 1, 0, this._bottom_bar_text, colours.black, colours.green);
        const bb_rh = `${this._selection_active ? "VIS" : (this._ins ? " INS" : "EDIT")}`;
        this._final_display.write_string_at(this._term.rows - 1, this._term.cols - bb_rh.length, bb_rh, colours.black, colours.green);
    }

    private _main_arrow_handler = async(key: string) => {
        const t = this._term;
        const p = this._page_cursor;
        if (key === "ArrowUp") {
            if (t.row !== 1 && p.row !== 0) {
                p.row -= 1;
                t.move_by(0, -1);
            }
        } else if (key === "ArrowDown") {
            if (t.row !== t.rows - 2 && p.row !== this._page.length - 1) {
                p.row += 1;
                t.move_by(0, 1);
            }
        } else if (key === "ArrowLeft") {
            t.move_by(-1, 0);
            p.col = t.col;
        } else {
            t.move_by(1, 0);
            p.col = t.col;
        }
    }

    private _main_key_handler = async(kb_event: KeyboardEvent) => {
        const key = kb_event.key;
        const t = this._term;
        const p = this._page_cursor;
        if (this._ins && (!kb_event.ctrlKey)) {
            if (key === "Backspace") {
                if (t.col !== 0) {
                    t.move_by(-1, 0);
                    p.col = t.col;
                    if (kb_event.altKey) {
                    this._page[p.row][p.col].set({
                        character_index: 0x20,
                        foreground_colour: colours.white,
                        background_colour: colours.black,
                    }) }
                    else {
                        this._page[p.row][p.col].set({
                            character_index: 0x20
                        })
                    }
                }
            } else if (key === "Enter") {
                if (t.row !== t.rows - 2) {
                    t.move_by(0, 1);
                    p.row = t.row - 1;
                    p.col = t.col;
                }
            } else if (key === "Escape") {
                this._ins = false;
            } else if (key === "/") {
                if (kb_event.altKey) {
                    this._page[p.row][p.col].set({
                        character_index: key.charCodeAt(0),
                        foreground_colour: this._fg_colour,
                        background_colour: this._bg_colour
                    });
                    if (t.col !== t.cols - 1) {
                        t.move_by(1, 0);
                        p.col = t.col;
                    }
                } else {
                    const code = await this._graphics_selector();
                    if (code !== null) {
                        this._page[this._page_cursor.row][this._page_cursor.col].character_index = code;
                        this._page[this._page_cursor.row][this._page_cursor.col].foreground_colour = this._fg_colour;
                        this._page[this._page_cursor.row][this._page_cursor.col].background_colour = this._bg_colour;
                    }
                    this.dump_to_screen();
                }
            } else if (key.length === 1) {
                this._page[p.row][p.col].set({
                    character_index: key.charCodeAt(0),
                    foreground_colour: this._fg_colour,
                    background_colour: this._bg_colour
                });
                if (t.col !== t.cols - 1) {
                    t.move_by(1, 0);
                    p.col = t.col;
                }
            }
        } else if ((!this._ins) || kb_event.ctrlKey) {
            if (key === "i") {
                this._ins = true;
            } else if (key === "f") {
                const clr = await this._colour_selector();
                if (clr !== null) {
                    this._fg_colour = clr;
                    this._page[this._page_cursor.row][this._page_cursor.col].foreground_colour = clr;
                }
                this.dump_to_screen();
            } else if (key === "b") {
                const clr = await this._colour_selector();
                if (clr !== null) {
                    this._bg_colour = clr;
                    this._page[this._page_cursor.row][this._page_cursor.col].background_colour = clr;
                }
                this.dump_to_screen();
            } else if (key === "y") {
                this._clipboard = TerminalCell.from(this._page[this._page_cursor.row][this._page_cursor.col]);
            } else if (key === "p") {
                if (this._clipboard !== null) {
                    if (this._clipboard instanceof TerminalCell) this._page[this._page_cursor.row][this._page_cursor.col].copy_from(this._clipboard);
                    else {
                        for (let r = 0; r < this._clipboard.length; r++) {
                            if (this._page_cursor.row + r >= this._page.length) break;
                            for (let c = 0; c < this._clipboard[0].length; c++) {
                                if (this._page_cursor.col + c >= this._page[0].length) break;
                                this._page[this._page_cursor.row + r][this._page_cursor.col + c].copy_from(this._clipboard[r][c]);
                            }
                        }
                    }
                    this.dump_to_screen();
                }
            } else if (key === "g") {
                const code = await this._graphics_selector();
                if (code !== null) {
                    this._page[this._page_cursor.row][this._page_cursor.col].character_index = code;
                    this._page[this._page_cursor.row][this._page_cursor.col].foreground_colour = this._fg_colour;
                    this._page[this._page_cursor.row][this._page_cursor.col].background_colour = this._bg_colour;
                }
                this.dump_to_screen();
            } else if (key === "s") {
                navigator.clipboard.writeText(this._page.to_b64());
                this._bottom_bar_text = "COPIED TO CLIPBOARD."
            } else if (key === "l") {
                await this._load_page();
            } else if (key === "h") {
                await this._show_help();
            } else if (key === "v") {
                //enter selection mode
                this._selection_active = true;
                this._selection.start.row = this._page_cursor.row;
                this._selection.start.col = this._page_cursor.col;
                this._selection.end.row = this._page_cursor.row;
                this._selection.end.col = this._page_cursor.col;
                for (let r = this._selection.start.row; r <= this._selection.end.row; r++) {
                    for (let c = this._selection.start.col; c <= this._selection.end.col; c++) {
                        this._page[r][c].inverted = true;
                    }
                }
                this._arrow_handler_stack.push([async(key: string) => {
                    for (let r = this._selection.start.row; r <= this._selection.end.row; r++) {
                        for (let c = this._selection.start.col; c <= this._selection.end.col; c++) {
                            this._page[r][c].inverted = false;
                        }
                    }
                    if (key === "ArrowUp") {
                        if (this._selection.end.row !== 0 && this._selection.end.row !== this._selection.start.row) {
                            this._selection.end.row -= 1;
                            this._arrow_handler_stack[0][0](key, {});
                        }
                    } else if (key === "ArrowDown") {
                        if (this._selection.end.row !== this._page.length - 1) {
                            this._selection.end.row += 1;
                            this._arrow_handler_stack[0][0](key, {});
                        }
                    } else if (key === "ArrowLeft") {
                        if (this._selection.end.col !== 0 && this._selection.end.col !== this._selection.start.col) {
                            this._selection.end.col -= 1;
                            this._arrow_handler_stack[0][0](key, {});
                        }
                    } else {
                        if (this._selection.end.col !== this._page[0].length - 1) {
                            this._selection.end.col += 1;
                            this._arrow_handler_stack[0][0](key, {});
                        }
                    }
                    for (let r = this._selection.start.row; r <= this._selection.end.row; r++) {
                        for (let c = this._selection.start.col; c <= this._selection.end.col; c++) {
                            this._page[r][c].inverted = true;
                        }
                    }
                    this.dump_to_screen();
                }, {}]);
                this._key_handler_stack.push([async(kb_ev: KeyboardEvent) => {
                    const key = kb_ev.key;
                    if (kb_ev.key === "Escape") {
                        this._selection_active = false;
                        this._arrow_handler_stack.pop();
                        this._key_handler_stack.pop();
                        for (const row of this._page) {
                            for (const char of row) {
                                char.inverted = false;
                            }
                        }
                        this.dump_to_screen();
                    } else if (key === "y") {
                        this._clipboard = [];
                        for (let r = this._selection.start.row; r <= this._selection.end.row; r++) {
                            this._clipboard.push([]);
                            for (let c = this._selection.start.col; c <= this._selection.end.col; c++) {
                                this._clipboard[this._clipboard.length - 1].push(TerminalCell.from(this._page[r][c]));
                                this._clipboard[this._clipboard.length - 1][this._clipboard[this._clipboard.length - 1].length - 1].inverted = false;
                            }
                        }
                        this._bottom_bar_text = "COPIED SELECTION."
                    }
                }, {}]);
            }
        }
    }

    private async _load_page() {
        try {
            let res_clp: any;
            const clipboard_prom = new Promise((res) => res_clp = res);
            this._bottom_bar_text = "LISTENING FOR PASTE. ESC TO CANCEL.";
            this._key_handler_stack.push([async(kb_ev: KeyboardEvent) => {
                if (kb_ev.key === "Escape") {
                    kb_ev.preventDefault();
                    res_clp(null);
                }
            }, {}]);
            const pl = (ev: ClipboardEvent) => {
                ev.clipboardData!.items[0].getAsString((s) => {
                    res_clp(s);
                })
            };
            document.addEventListener("paste", pl);
            const cb_string = await clipboard_prom as string;
            document.removeEventListener("paste", pl);
            if (cb_string.slice(0, 2) !== "PE") throw new Error("EXPECTED PE, SAW " + cb_string);
            const ar: Array<any> = [];
            for (const ch of window.atob(cb_string.slice(3))) {
                ar.push(ch.charCodeAt(0));
            }
            const u8 = new Uint8Array(ar);
            const u32 = new Uint32Array(u8.buffer);
            this._clear_page();
            for (const ch of u32) {
                const cell = TerminalCell.from_code(ch);
                this._page[cell.row][cell.col] = cell;
            }
            this._bottom_bar_text = "LOADED";
        } catch (e) {
            console.error(e);
            this._bottom_bar_text = "LOAD ERROR. CHECK CONSOLE.";
        }
        this._key_handler_stack.pop();
        this.dump_to_screen();
    }

    private _clear_page() {
        this._page.clear();
    }

    private async _colour_selector() {
        const t = this._term;
        const r = t.row < t.rows / 2 ? t.rows - 4 : 2;
        const page_index = this._display_stack.push(new Page(3, this._term.cols, r));
        const d = this._display_stack[page_index - 1];
        let row_offset = 0;
        if (t.row < t.rows / 2) {
            d.write_formatted_string_at(0, 0, String.fromCharCode(0x82).repeat(t.cols));
            row_offset = 1;
        } else {
            d.write_formatted_string_at(2, 0, String.fromCharCode(0x82).repeat(t.cols));
        }

        let s = "COLOUR? ¬98¬ ";
        for (let i = 0; i < 8; i++) {
            s += `${i}£B${i}£ £B0£ `
        }
        d.write_formatted_string_at(row_offset, 0, s, colours.white, colours.black);
        
        let res_key: (n: number | null) => void;
        const key_prom = new Promise<number | null>((res) => res_key = res);
        this._arrow_handler_stack.push([async() => {}, {}])
        this._key_handler_stack.push([async(kb_ev: KeyboardEvent) => {
            const key = kb_ev.key;
            if (key.length === 1 && parseInt(key) >= 0 && parseInt(key) < 8) {
                res_key(parseInt(key));
            } else if (key === "Escape") {
                res_key(null)
            }
        }, {}])
        const clr = await key_prom;
        this._arrow_handler_stack.pop();
        this._key_handler_stack.pop()
        this._display_stack.pop();
        return clr;
    }

    public async _graphics_selector() {
        const t = this._term;
        const r = t.row < t.rows / 2 ? t.rows - 12 : 1;
        const page_index = this._display_stack.push(new Page(10, this._term.cols, r));
        const d = this._display_stack[page_index - 1];
        let row_offset = 0;
        if (t.row < t.rows / 2) {
            d.write_formatted_string_at(0, 0, String.fromCharCode(0x82).repeat(t.cols));
            row_offset = 1;
        } else {
            d.write_formatted_string_at(9, 0, String.fromCharCode(0x82).repeat(t.cols));
        }
        let top_row_text = "GRAPHIC?: ";
        const render_top_row_text = () => {
            d.clear_line(row_offset, colours.black);
            d.write_string_at(row_offset, 0, top_row_text, colours.white, colours.black);
        }
        render_top_row_text();
        let active_row = row_offset + 1;
        d.write_string_at(active_row++, 0, "  0 1 2 3 4 5 6 7 8 9 A B C D E F", 7, 0);
        for (const l of "89AB") {
            d.write_string_at(active_row, 0, l, 7, 0);
            for (let i = 0; i < 16; i++) {
                d.write_string_at(active_row, 2 + i * 2, String.fromCharCode(parseInt(l + i.toString(16), 16)), this._fg_colour, this._bg_colour);
            }
            active_row += 2;
        }
        let res_key: (n: number | null) => void;
        const key_prom = new Promise<number | null>((res) => res_key = res);
        this._arrow_handler_stack.push([async() => {}, {}])
        this._key_handler_stack.push([async(kb_ev: KeyboardEvent, data: any) => {
            const key = kb_ev.key;
            if (key === "Escape") {
                res_key(null);
            } else if ("0123456789ABCDEF".includes(key.toUpperCase())) {
                if (!data.idx) data.idx = "";
                if (data.idx.length < 2) {
                    data.idx += key.toUpperCase();
                    top_row_text += key.toUpperCase();
                    render_top_row_text();
                    return;
                }
            } else if (key === "Enter") {
                if (data.idx.length === 2) {
                    const idx = parseInt(data.idx, 16);
                    if (idx >= 0x80 && idx < 0xBF) res_key(idx);
                    else {
                        top_row_text = "INVALID INDEX. TRY AGAIN: ";
                        data.idx = "";
                        render_top_row_text();
                    }
                }
            } else if (key === "Backspace") {
                if (data.idx.length > 0) {
                    data.idx = (data.idx as string).slice(0, -1);
                    top_row_text = top_row_text.slice(0, -1);
                    render_top_row_text();
                }
            }
        }, {}]);
        const code = await key_prom;
        this._arrow_handler_stack.pop();
        this._key_handler_stack.pop()
        this._display_stack.pop();
        return code;
    }

    private async _show_help() {
        this._display_stack.push(new Page(this._term.rows - 6, this._term.cols - 4, 3, 2));
        let res: any;
        const prom = new Promise((r) => {
            res = r;
        });
        const d = this._display_stack[this._display_stack.length - 1];
        let viewport_offset = 0;
        let max_viewport_offset = 0;
        const processed_help_text: string[] = [];
        const render_processed_help_text = () => {
            for (let i = 0; i < d._rows - 4; i++) {
                if (i + viewport_offset > processed_help_text.length - 1) break;
                d.write_string_at(i+2, 2, processed_help_text[i + viewport_offset].padEnd(d._cols - 4, " "), colours.white, colours.black);
            }

            // scroll bar
            // Get viewport offset as a percentage of the max viewport offset
            const vp_offset_percent = viewport_offset / max_viewport_offset;
            // Get the height of the scroll bar
            const scroll_bar_height = Math.floor((d._rows - 4) * (d._rows - 4) / processed_help_text.length);
            // Get the top of the scroll bar
            const scroll_bar_top = Math.floor(vp_offset_percent * (d._rows - 4 - scroll_bar_height));
            // Clear the column
            for (let i = 0; i < d._rows - 4; i++) {
                d.write_string_at(i + 2, d._cols - 2, " ", colours.white, colours.black);
            }
            // Draw the scroll bar
            for (let i = 0; i < scroll_bar_height; i++) {
                d.write_string_at(i + 2 + scroll_bar_top, d._cols - 2, String.fromCharCode(0xBE), colours.white, colours.black);
            }
        }

        this._arrow_handler_stack.push([async(key: string) => {
            if (key === "ArrowUp") {
                if (viewport_offset > 0) {
                    viewport_offset--;
                    render_processed_help_text();
                }
            } else if (key === "ArrowDown") {
                if (viewport_offset < max_viewport_offset) {
                    viewport_offset++;
                    render_processed_help_text();
                }
            }
        }, {}]);
        this._key_handler_stack.push([async(kb_ev: KeyboardEvent) => {
            if (kb_ev.key === "Escape") {
                res();
                this._arrow_handler_stack.pop();
                this._key_handler_stack.pop();
                this._display_stack.pop();
                this.dump_to_screen();
            }
        }, {}]);
        d.write_string_at(0, 0, String.fromCharCode(0x9B) + String.fromCharCode(0x83), colours.white, colours.black);
        d.write_string_at(0, 2, "HELP", colours.white, colours.black);
        d.write_string_at(0, 6, String.fromCharCode(0x8B).repeat(d._cols - 5), colours.white, colours.black);
        d.write_string_at(0, d._cols - 1, String.fromCharCode(0xAB), colours.white, colours.black);
        for (let r = 1; r < d._rows - 1; r++) {
            d.write_string_at(r, 0, String.fromCharCode(0x94), colours.white, colours.black);
            d.write_string_at(r, d._cols - 1, String.fromCharCode(0xA9), colours.white, colours.black);
        }
        d.write_string_at(d._rows-1, 0, String.fromCharCode(0x8C), colours.white, colours.black);
        d.write_string_at(d._rows-1, d._cols - 1, String.fromCharCode(0x8D), colours.white, colours.black);
        d.write_string_at(d._rows - 1, 1, String.fromCharCode(0x8B).repeat(d._cols - 2), colours.white, colours.black);

        const help_text = [
            'PageEdit is a simple program. It allows you to edit a CALFAX page, which can be saved to and loaded from the clipboard.',
            'The top bar shows the clipboard if anything is in it, the current foreground and background selection, and the co-ordinates of the cursor on the page.',
            'In INS mode, you can type characters into the page. You can also use the arrow keys to move the cursor around.',
            'To enter a graphics character, you can press / and then enter the code in hex. For example, /80 will enter the character with code 0x80.',
            'To enter EDIT mode, press Esc whilst in INS mode. In EDIT mode, you can use the arrow keys to move the cursor around, and make changes to the page.',
            'The following commands are available:',
            'i - enter INS mode',
            'f - change foreground colour',
            'b - change background colour',
            'y - copy the current character to the internal clipboard',
            'p - paste the clipboard into the current character',
            'g - enter graphics character',
            's - save the page to your OS clipboard',
            'l - load the page from your OS clipboard',
            'h - show this help',
            'v - enter selection mode',
            'In selection mode, you can use the arrow keys to move the selection around. Pressing y will copy the selection to the internal clipboard.',
            'To exit selection mode, press Esc.',
            'In INS mode, CTRL + any of the above commands will work.',
            'In INS mode, pressing ALT+Bksp will replace the character to the left of the cursor with blank space, but backspace will simply erase the foreground.',
            'To exit the program, press Ctrl+C.'
        ];

        const viewport_width = d._cols - 4;
        const viewport_height = d._rows - 4;

        // Process help text so it wraps to the displayport width
        for (const line of help_text) {
            let current_line = "";
            for (const word of line.split(" ")) {
                if (current_line.length + word.length + 1 > viewport_width) {
                    processed_help_text.push(current_line);
                    current_line = word;
                } else {
                    current_line += " " + word;
                }
            }
            processed_help_text.push(current_line);
            processed_help_text.push("");
        }

        max_viewport_offset = processed_help_text.length - viewport_height;
        render_processed_help_text();


        await prom;
    }
}

