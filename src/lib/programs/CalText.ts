import { colours } from "../Colours";
import Page from "../Page";
import Terminal from "../Terminal";
import { OSEventTarget, Program } from "../util";

// Unfinished text editor. Turns out it's a lot harder than it looks. 

export default class CalText extends Program {
    private _term!: Terminal;
    private _ket!: OSEventTarget;
    private _document: string = ` Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam eu felis dui. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Mauris feugiat id lorem vel fringilla. Phasellus fringilla, diam vitae tristique consequat, turpis ipsum faucibus dui, non aliquam sem mi vel nulla. Praesent pellentesque dapibus nisi, id lacinia felis mollis et. Fusce nunc libero, venenatis vitae odio in, faucibus pulvinar ligula. Proin sem magna, vestibulum nec vulputate vitae, blandit ac est. Cras ac bibendum sapien, eu gravida diam. Duis vel tristique nisl. Phasellus blandit risus vitae turpis imperdiet, ut consectetur lacus sodales. Quisque mauris lacus, suscipit at hendrerit nec, tincidunt aliquam tellus.

Ut eget dolor et ante sagittis vulputate eget in sapien. Vestibulum consectetur risus ut metus egestas, laoreet porttitor neque tincidunt. Donec tempor magna at accumsan tempor. Nullam lacinia vulputate arcu, vel pulvinar nisl condimentum et. Aenean pulvinar sit amet nulla eu lobortis. Duis nec augue rhoncus, pulvinar tortor et, dictum nisi. Vestibulum in nibh ex. Sed urna magna, tincidunt non odio vel, semper lacinia augue. Pellentesque in feugiat augue, ut pretium sem. Morbi consectetur dui odio. Donec nisi turpis, lacinia vitae velit nec, pretium aliquam eros. Nunc eget vehicula ante, at mattis quam. Sed leo nisl, hendrerit at scelerisque sed, malesuada in nulla. Morbi a nulla venenatis est viverra facilisis et sit amet orci. Nam a erat semper mi viverra placerat sed non odio. In sodales ullamcorper turpis, vel euismod lorem molestie eu.

Nunc a volutpat justo, vel tempus leo. Suspendisse fringilla non orci non tincidunt. Suspendisse at ex ut neque pellentesque facilisis at at sem. Vestibulum nulla turpis, rutrum at aliquet nec, convallis sed lacus. Vivamus augue neque, ornare et sagittis vitae, sodales ac eros. Praesent lectus tortor, accumsan vitae dolor nec, feugiat laoreet nisl. Mauris blandit mauris nulla, at euismod dui elementum a. Nulla fermentum pellentesque tortor, eu cursus est rutrum eu. Sed pharetra eu ante varius sollicitudin. Vestibulum urna magna, vestibulum in nunc sit amet, ultricies accumsan orci. Vivamus tincidunt magna in ex faucibus fermentum. Pellentesque feugiat massa eu tristique elementum. Duis eget risus mollis, cursus dolor in, placerat nunc. Phasellus tincidunt augue ac velit malesuada, in maximus nulla malesuada. `;
    private _resolve_should_quit = () => { };
    private _should_quit!: Promise<void>;
    private _options = {
        text_wrap: true
    };
    private _cursor = {
        document: 0,
        row: 1,
        col: 0
    };
    private _key_handler_stack: ((ev: KeyboardEvent) => void)[] = [];
    private _page_stack: Page[] = [];
    private _top_bar!: Page;
    private _bottom_bar!: Page;
    private _viewport_offset = {
        row: 0,
        col: 0,
        max: {
            row: 0,
            col: 0
        }
    };

    public async run(keyboard_event_target: OSEventTarget, terminal: Terminal) {
        this._term = terminal;
        this._ket = keyboard_event_target;
        this._term.clear();
        this._term.move_cursor(0, 1);
        this._key_handler_stack = [async(ev: KeyboardEvent) => {
            if (ev.key === "c" && ev.ctrlKey) {
                this._resolve_should_quit();
            } else if (ev.key === "ArrowDown") {
                if (terminal.row < terminal.rows - 2) {
                    await this._move_cursor("down");

                } else {
                    if (this._viewport_offset.row < this._viewport_offset.max.row) {
                        this._viewport_offset.row++;
                        await this._move_cursor("down");
                        await this._dump_to_screen();
                    }
                }
                this._term.move_cursor(this._cursor.col, this._cursor.row);
            } else if (ev.key === "ArrowUp") {
                if (terminal.row > 1) {
                    await this._move_cursor("up");
                } else {
                    if (this._viewport_offset.row > 0) {
                        this._viewport_offset.row--;
                        await this._move_cursor("up");
                        await this._dump_to_screen();
                    }
                }
                this._term.move_cursor(this._cursor.col, this._cursor.row);
            } else if (ev.key === "ArrowLeft") {
                await this._move_cursor("left");
            } else if (ev.key === "ArrowRight") {
                await this._move_cursor("right");
            } else if (ev.key === "w") {
                this._options.text_wrap = !this._options.text_wrap;
            }
            this._dump_to_screen();
        }];
        this._ket.addEventListener("keydown", this._key_handler_stack[0]);
        this._should_quit = new Promise((resolve) => {
            this._resolve_should_quit = resolve;
        });
        this._top_bar = new Page(1, this._term.cols, 0, 0);
        this._top_bar.write_string_at(0, 0, " File Edit View Help".padEnd(this._term.cols, " "), colours.white, colours.blue);
        this._bottom_bar = new Page(1, this._term.cols, this._term.rows - 1, 0);
        this._bottom_bar.write_string_at(0, 0, "Ln 0 Col 0".padEnd(this._term.cols, " "), colours.white, colours.blue);
        this._page_stack.push(new Page(this._term.rows - 2, this._term.cols - 1, 1, 0));
        this._page_stack.push(new Page(this._term.rows - 2, 1, 1, this._term.cols - 1)); //vertical scrollbar
        this._page_stack.push(new Page(1, this._term.cols - 12, this._term.rows - 1, 12));
        await this._dump_to_screen();
        await this._should_quit;
        this._term.clear();
    }

    private async _move_cursor(direction: "up" | "down" | "left" | "right") {
        if (this._options.text_wrap) {
            if (direction === "up") {
                if (this._cursor.document - this._page_stack[0]._cols < 0) {
                    this._cursor.document = 0;
                } else {
                    this._cursor.document -= this._page_stack[0]._cols;
                }
            } else if (direction === "down") {
                if (this._cursor.document + this._page_stack[0]._cols > this._document.length) {
                    this._cursor.document = this._document.length;
                } else {
                    this._cursor.document += this._page_stack[0]._cols;
                }
            } else if (direction === "left") {
                if (this._cursor.document - 1 < 0) {
                    this._cursor.document = 0;
                } else {
                    this._cursor.document--;
                }
            } else {
                if (this._cursor.document + 1 > this._document.length) {
                    this._cursor.document = this._document.length;
                } else {
                    this._cursor.document++;
                }
            }
        }
        this._calculate_cursor_position();
    }

    private async _calculate_cursor_position() {
        if (this._options.text_wrap) {
            const col = this._cursor.document % this._page_stack[0]._cols;
            const row = Math.floor(this._cursor.document / this._page_stack[0]._cols);
            this._cursor.col = col;
            this._cursor.row = row - this._viewport_offset.row + 1;
        } else {
            const split_doc = this._document.split("\n");
            let r = 0;
            let total_len = 0;
            do {
                total_len += split_doc[r].length + 1;
                r++;
            } while(total_len < this._cursor.document);
            r--;
            const c = this._cursor.document - total_len + split_doc[r].length;
            this._cursor.col = c - this._viewport_offset.col;
            this._cursor.row = r - this._viewport_offset.row + 1;
        }
        this._term.move_cursor(this._cursor.col, this._cursor.row);
    }

    private async _gen_scrollbars(flattened_document: string[]) {
        // always gen vertical unless fewer rows than lines
        // vert is display_stack 1
        // horiz is display_stack 2
        const vert = this._page_stack[1];
        const horiz = this._page_stack[2];
        const max_lines = this._page_stack[0]._rows;
        // Clear the column
        for (let i = 1; i < vert._rows - 1; i++) {
            vert.write_string_at(i, 0, " ", colours.white, colours.black);
        }
        // Clear the row
        for (let i = 1; i < horiz._cols - 1; i++) {
            horiz.write_string_at(0, i, " ", colours.white, colours.black);
        }
        //draw arrows
        vert.write_string_at(0, 0, String.fromCharCode(0xBF), colours.white, colours.black);
        vert.write_string_at(vert._rows - 1, 0, String.fromCharCode(0xC0), colours.white, colours.black);
        horiz.write_string_at(0, 0, String.fromCharCode(0xC1), colours.white, colours.black);
        horiz.write_string_at(0, horiz._cols - 1, String.fromCharCode(0xC2), colours.white, colours.black);
        if (flattened_document.length >= max_lines) {
            // Get viewport offset as a percentage of the max viewport offset
            const vp_offset_percent = this._viewport_offset.row / (flattened_document.length - max_lines);
            // Get the height of the scroll bar
            // the arrows take two away, so the total height is the number of rows - 2
            const scroll_bar_area = vert._rows - 2;
            const scroll_bar_height = Math.max(Math.round(scroll_bar_area * scroll_bar_area / flattened_document.length), 1);
            // Get the top of the scroll bar
            const scroll_bar_top = Math.round(vp_offset_percent * (scroll_bar_area - scroll_bar_height));
            // Draw the scroll bar
            for (let i = 0; i < scroll_bar_height; i++) {
                vert.write_string_at(i + scroll_bar_top + 1, 0, String.fromCharCode(0xBE), colours.white, colours.black);
            }
        }
        // Draw the horizontal scrollbar
        // Get the longest line
        const longest_line = flattened_document.reduce((a, b) => a.length > b.length ? a : b);
        if (longest_line.length <= this._term.cols - 1) return;
        // Get the viewport offset as a percentage of the max viewport offset
        const vp_offset_percent = this._viewport_offset.col / (longest_line.length - this._page_stack[0]._cols);
        // Get the width of the scroll bar
        const scroll_bar_width = Math.max(Math.floor((horiz._cols - 2) * (horiz._cols - 2) / longest_line.length), 1);
        // Get the left of the scroll bar
        const scroll_bar_left = Math.floor(vp_offset_percent * (horiz._cols - 2 - scroll_bar_width));
        // Draw the scroll bar
        for (let i = 0; i < scroll_bar_width; i++) {
            horiz.write_string_at(0, i + scroll_bar_left + 1, String.fromCharCode(0xBE), colours.white, colours.black);
        }
    }

    private async _gen_text_display() {
        const page = this._page_stack[0];
        const document_lines = this._document.split("\n").map((line) => [line]);
        if (this._options.text_wrap) {
            for (const line of document_lines) {
                // Split the line at the max width, don't care about words
                let l = line[0];
                const max_cols = page._cols;
                while (l.length > max_cols) {
                    const new_line = l.slice(0, max_cols);
                    l = l.slice(max_cols);
                    line.push(new_line);
                }
                line.push(l);
                line.shift();
                // console.log(line);
            }
        }
        //flatten the array
        const fl: string[] = document_lines.flat();
        // generate maximum viewport offset
        this._viewport_offset.max.row = Math.max(fl.length - page._rows, 0);
        this._viewport_offset.max.col = Math.max(fl.reduce((a, b) => a.length > b.length ? a : b).length - page._cols, 0);
        await this._gen_scrollbars(fl);
        const max_lines = page._rows;
        page.clear();
        for (let r = this._viewport_offset.row; r < Math.min(fl.length, this._viewport_offset.row + max_lines); r++) {
            let string_to_write;
            if (!this._options.text_wrap) {
                string_to_write = fl[r].slice(this._viewport_offset.col, this._viewport_offset.col + page._cols);
            } else {
                string_to_write = fl[r];
            }
            page.write_string_at(r - this._viewport_offset.row, 0, string_to_write, colours.white, colours.black);
        }

    }

    private async _dump_to_screen() {
        const final_display = new Page(this._term.rows, this._term.cols, 0, 0);
        await this._gen_text_display();
        for (const [idx, char] of this._top_bar[0].entries()) final_display[0][idx].copy_from(char);
        for (const [idx, char] of this._bottom_bar[0].entries()) final_display[this._term.rows - 1][idx].copy_from(char);
        for (const page of this._page_stack) {
            for (const row of page) {
                for (const char of row) {
                    final_display[char.row][char.col].copy_from(char);
                }
            }
        }
        for (const r of final_display) {
            for (const c of r) {
                this._term.put_termchar(c.code);
            }
        }
        this._term.hide_cursor();
        this._term.show_cursor();
    }
}