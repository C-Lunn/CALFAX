import { TerminalCell } from "./Terminal";
// Page is a convenience class that represents a 2D array of TerminalCells
// In this way, we can do things like windows by stacking Pages.
// Also, Pages are the base way that PageEdit saves and loads.
export default class Page extends Array<Array<TerminalCell>> {
    _row_offset = 0;
    _col_offset = 0;
    _rows: number;
    _cols: number;
    constructor(rows: number, cols: number, row_offset?: number, col_offset?: number) {
        super();
        if (row_offset) this._row_offset = row_offset;
        if (col_offset) this._col_offset = col_offset;

        this._rows = rows;
        this._cols = cols;

        for (let i = 0; i < rows; i++) {
            this.push([]);
            for (let j = 0; j < cols; j++) {
                this[i].push(new TerminalCell({
                    character_index: 0x20,
                    foreground_colour: 7,
                    background_colour: 0,
                    row: i + this._row_offset,
                    col: j + this._col_offset
                }));
            }
        }
    }

    public copy_from(page: Page) {
        for (let r = 0; r < page.length; r++) {
            for (let c = 0; c < page[r].length; c++) {
                this[r][c].copy_from(page[r][c]);
            }
        }
    }

    static from_b64(b64: string) {
        const page = new Page(24, 40);
        if (b64.slice(0, 2) !== "PE") throw new Error();
        const ar: Array<any> = [];
        for (const ch of window.atob(b64.slice(3))) {
            ar.push(ch.charCodeAt(0));
        }
        const u8 = new Uint8Array(ar);
        const u32 = new Uint32Array(u8.buffer);
        for (const ch of u32) {
            const cell = TerminalCell.from_code(ch);
            page[cell.row][cell.col] = cell;
        }
        return page;
    }

    public to_b64() {
        const u32 = new Uint32Array(this._rows * this._cols);
        let i = 0;
        for (const row of this) {
            for (const cell of row) {
                u32[i++] = cell.code;
            }
        }
        const removed_1824 = u32.filter((code) => !((code & 0x1FFFF) === 1824));
        const u8 = new Uint8Array(removed_1824.buffer);
        const ar: Array<any> = [];
        for (const ch of u8) {
            ar.push(String.fromCharCode(ch));
        }
        return "PE," + window.btoa(ar.join(""));
    }

    public write_string_at(row: number, col: number, str: string, fg: number, bg: number) {
        for (let i = 0; i < str.length; i++) {
            if (col + i >= this[row].length) break;
            this[row][col + i].set({
                character_index: str.charCodeAt(i),
                foreground_colour: fg,
                background_colour: bg
            });
        }
    }

    // Allows for plaintext notation of colours and special characters.
    // A basic state machine that stores the FG/BG colour and writes sequentially.
    public write_formatted_string_at(row: number, col: number, str: string, fg = 7, bg = 0) {
        // First, replace all ¬AA¬ with the hex char code contained in AA
        str = str.replace(/¬(..)¬/g, (_, p1) => {
            return String.fromCharCode(parseInt(p1, 16));
        });

        // Colour notation is £FX£ and £BX£ for foreground and background X respectively
        // Split the string around these colour notations
        const parts = str.split(/(£[F|B].)£/);
        for (const p of parts) {
            if (col >= this[row].length) break;
            if (p === "") continue;
            // If the part matches £F.£, then set the foreground colour
            if (p.startsWith("£F")) {
                fg = parseInt(p[2]);
            }
            // If the part matches £B.£, then set the background colour
            else if (p.startsWith("£B")) {
                bg = parseInt(p[2]);
            } else {
                // Otherwise, write the string with the current fg and bg colours
                this.write_string_at(row, col, p, fg, bg);
                col += p.length;
            }
        }
    }

    public clear() {
        for (const row of this) {
            for (const cell of row) {
                cell.set({
                    character_index: 0x20,
                    foreground_colour: 7,
                    background_colour: 0
                });
            }
        }
    }

    public clear_line(row: number, bg_colour: number) {
        for (const cell of this[row]) {
            cell.set({
                character_index: 0x20,
                foreground_colour: 7,
                background_colour: bg_colour
            });
        }
    }

}