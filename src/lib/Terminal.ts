import TerminalRenderWorker from "./TerminalRender.worker?worker";

class CursorOutOfBoundsError extends Error {
    constructor(x: number, y: number) {
        super(`Cursor out of bounds: (${x}, ${y})`);
    }
}

export class TerminalCell {
    private _character_index: number;
    private _foreground_colour: number;
    private _background_colour: number;
    private _double_height: 'top' | 'bottom' | null;
    private _inverted: boolean;
    private _row: number;
    private _col: number;
    private _code?: number;
    dirty: boolean = true;

    constructor(params: {
        row: number,
        col: number,
        character_index: number,
        foreground_colour: number,
        background_colour: number,
        double_height?: "top" | "bottom",
        inverted?: boolean
        dirty?: boolean
    }) {
        this._character_index = params.character_index;
        this._foreground_colour = params.foreground_colour;
        this._background_colour = params.background_colour;
        this._double_height = params.double_height ?? null;
        this._inverted = params.inverted ?? false;
        this._row = params.row;
        this._col = params.col;
        this._code = this._get_code();
        this.dirty = params.dirty ?? false;
    }

    static from(c: TerminalCell) {
        return new TerminalCell({
            row: c.row,
            col: c.col,
            character_index: c.character_index,
            foreground_colour: c.foreground_colour,
            background_colour: c.background_colour,
            inverted: c.inverted,
            dirty: c.dirty
        });
    }

    private _get_code() {
        return this._character_index | (this._foreground_colour << 8) | (this._background_colour << 11) | (this._double_height ? 1 << 14 : 0) | (this._inverted ? 1 << 16 : 0) | (this._col << 17) | (this._row << 24);
    }

    public get code() {
        if (!this._code) {
            this._code = this._get_code();
        }
        return this._code;
    }

    public set character_index(character_index: number) {
        if (this._character_index !== character_index) {
            this._character_index = character_index;
            this._code = this._get_code();
            this.dirty = true;
        }
    }

    public get character_index() {
        return this._character_index;
    }

    public set foreground_colour(foreground_colour: number) {
        if (this._foreground_colour !== foreground_colour) {
            this._foreground_colour = foreground_colour;
            this._code = this._get_code();
            this.dirty = true;
        }
    }

    public get foreground_colour() {
        return this._foreground_colour;
    }

    public set background_colour(background_colour: number) {
        if (this._background_colour !== background_colour) {
            this._background_colour = background_colour;
            this._code = this._get_code();
            this.dirty = true;
        }
    }

    public get background_colour() {
        return this._background_colour;
    }

    public set double_height(double_height: 'top' | 'bottom' | null) {
        if (this._double_height !== double_height) {

            this._double_height = double_height;
            this._code = this._get_code();
            this.dirty = true;
        }
    }

    public get double_height() {
        return this._double_height;
    }

    public set inverted(inverted: boolean) {
        if (this._inverted !== inverted) {

            this._inverted = inverted;
            this._code = this._get_code();
            this.dirty = true;
        }
    }

    public get inverted() {
        return this._inverted;
    }

    public set row(row: number) {
        if (this._row !== row) {

            this._row = row;
            this._code = this._get_code();
            this.dirty = true;
        }
    }

    public set col(col: number) {
        if (this._col !== col) {

            this._col = col;
            this._code = this._get_code();
            this.dirty = true;
        }
    }

    public get row() {
        return this._row;
    }

    public get col() {
        return this._col;
    }

    public copy_from(t: TerminalCell) {
        if (t.character_index !== undefined) {
            this.character_index = t.character_index;
        }
        if (t.foreground_colour !== undefined) {
            this.foreground_colour = t.foreground_colour;
        }
        if (t.background_colour !== undefined) {
            this.background_colour = t.background_colour;
        }
        if (t.double_height !== undefined) {
            this.double_height = t.double_height;
        }
        if (t.inverted !== undefined) {
            this.inverted = t.inverted;
        }
    }

    public set({
        character_index,
        foreground_colour,
        background_colour,
        double_height,
        inverted,
    }: {
        character_index?: number,
        foreground_colour?: number,
        background_colour?: number,
        double_height?: 'top' | 'bottom' | null,
        inverted?: boolean
    }) {
        if (character_index !== undefined) {
            this.character_index = character_index;
        }
        if (foreground_colour !== undefined) {
            this.foreground_colour = foreground_colour;
        }
        if (background_colour !== undefined) {
            this.background_colour = background_colour;
        }
        if (double_height !== undefined) {
            this.double_height = double_height;
        }
        if (inverted !== undefined) {
            this.inverted = inverted;
        }
    }

    static from_code(code: number) {
        const character_index = code & 0xFF;
        const opts = (code >> 8);
        const foreground_colour = opts & 0b111;
        const background_colour = (opts >> 3) & 0b111;
        //const double_height = ((opts >> 6) & 0b11);
        const inverted = ((opts >> 8) & 0b1) === 1;
        const row = code >> 24;
        const col = ((code >> 17) & 0x7F);

        return new TerminalCell({
            row,
            col,
            foreground_colour,
            background_colour,
            inverted,
            character_index,
            dirty: true
        });
    }



}

class Terminal {
    public is_ready: Promise<void>;
    private _resolve_ready: () => void = () => { };

    private _render_worker: Worker;
    private _canvas: HTMLCanvasElement;

    private _display_data: TerminalCell[][];

    private _rows: number;
    private _cols: number;

    private _cursor: {
        x: number,
        y: number
    } = {
        x: 0,
        y: 0
    };
    private _show_cursor: boolean = true;

    constructor(canvas: HTMLCanvasElement, rows: number, cols: number) {
        this._canvas = canvas;
        this._rows = rows;
        this._cols = cols;

        this._display_data = [];
        for (let i = 0; i < rows; i++) {
            let j = 0;
            this._display_data[i] = [];
            for (; j < this._cols; j++) {
                this._display_data[i].push(new TerminalCell({
                    row: i,
                    col: j,
                    character_index: " ".charCodeAt(0),
                    foreground_colour: 7,
                    background_colour: 0,
                    inverted: false
                }));
                this._display_data[i][j].dirty = true;
            }
        }

        this._render_worker = new TerminalRenderWorker();
        this._render_worker.postMessage({
            type: 'init',
            rows: rows,
            cols: cols
        });

        this.is_ready = new Promise((resolve) => {
            this._resolve_ready = resolve;
        });

        let cv: OffscreenCanvas
        try {
            this._canvas.width = cols * 12;
            this._canvas.height = rows * 20;
            cv = this._canvas.transferControlToOffscreen();
        } catch (e) {
            // HMR probably
        }

        this._render_worker.postMessage({
            type: 'canvas',
            canvas: cv
        }, [cv]);

        setInterval(() => {
            this._package_data().then((data) => {
                this._render_worker.postMessage({
                    type: 'data',
                    data: data.buffer
                }, [data.buffer]);
            });
        }, 1000 / 25);

        this._resolve_ready();
    }

    public clear_line(line: number) {
        this._display_data[line] = [];
        for (let i = 0; i < this._cols; i++) {
            this._display_data[line][i] = new TerminalCell({
                row: line,
                col: i,
                character_index: " ".charCodeAt(0),
                foreground_colour: 7,
                background_colour: 0,
                inverted: false
            });
            this._display_data[line][i].dirty = true;
        }
    }

    public move_by(x: number, y: number) {
        const new_x = this._cursor.x + x;
        const new_y = this._cursor.y + y;
        try{
            this.move_cursor(this._cursor.x + x, this._cursor.y + y);
        } catch (e) {
            if (e instanceof CursorOutOfBoundsError) {
                if (new_x < 0) {
                    this.move_cursor(0, this._cursor.y);
                } else if (new_x >= this._cols) {
                    this.move_cursor(this._cols - 1, this._cursor.y);
                } else if (new_y < 0) {
                    this.move_cursor(this._cursor.x, 0);
                } else if (new_y >= this._rows) {
                    this.move_cursor(this._cursor.x, this._rows - 1);
                }
            }
        }
    }

    public move_cursor(x: number, y: number) {
        if (x < 0 || x >= this._cols || y < 0 || y >= this._rows) {
            throw new CursorOutOfBoundsError(x, y);
        }
        if (this._show_cursor) {
            this._erase_cursor();
        }
        this._cursor.x = x;
        this._cursor.y = y;
        if (this._show_cursor) {
            this._display_cursor();
        }
    }

    public next_line() {
        try {
            this.move_cursor(0, this._cursor.y + 1);
        } catch (e) {
            if (e instanceof CursorOutOfBoundsError) {
                if (this._show_cursor) this._erase_cursor();
                this._shift_up();
                this.move_cursor(0, this._cursor.y);
            }
        }

    }

    private _shift_up() {
        this._display_data.shift();
        this._display_data.push([]);
        for (let i = 0; i < this._cols; i++) {
            this._display_data[this._rows - 1][i] = new TerminalCell({
                row: this._rows - 1,
                col: i,
                character_index: 32,
                foreground_colour: 7,
                background_colour: 0,
                inverted: false
            })
        }
        //change the row numbers
        for (let i = 0; i < (this._rows - 1); i++) {
            for (let j = 0; j < this._cols; j++) {
                this._display_data[i][j].row = i;
            }
        }
        for (let j = 0; j < this._cols; j++) {
            this._display_data[this._rows - 1][j].dirty = true;
        }
    }
    

    public write_character_code(
        character: number, 
        foreground_colour: number, 
        background_colour: number,
        row: number = this._cursor.y,
        col: number = this._cursor.x,
        inverted: boolean = false,
        double_height: 'top' | 'bottom' | null = null
    ) {
        this._display_data[row][col].set({
            character_index: character,
            foreground_colour: foreground_colour,
            background_colour: background_colour,
            double_height: double_height,
            inverted: inverted
        });
    }

    public put_termchar(
        char_code: number
    ) {
        const row = char_code >> 24;
        const col = ((char_code >> 17) & 0x7F);
        const character_index = char_code & 0xFF;
        const opts = (char_code >> 8);
        const foreground_colour = opts & 0b111;
        const background_colour = (opts >> 3) & 0b111;
        // const double_height = ((opts >> 6) & 0b11);
        const inverted = ((opts >> 8) & 0b1) === 1
        this._display_data[row][col].set({
            character_index,
            foreground_colour,
            background_colour,
            inverted
        })
    }

    public _advance_cursor(distance: number = 1, wrap: boolean = true, shift_up: boolean = true) {
        if (wrap) {
            const new_row = this._cursor.y + Math.floor((this._cursor.x + distance) / this._cols);
            const new_col = (this._cursor.x + distance) % this._cols;
            if (new_row >= this._rows && shift_up) {
                    this._cursor.x = new_col;
                    this._cursor.y = new_row - this._rows;
            } else if (new_row >= this._rows && !shift_up) {
                this._cursor.x = this._cols - 1;
                this._cursor.y = this._rows - 1;
            }
        } else {
            this._cursor.x += distance;
            if (this._cursor.x >= this._cols) {
                this._cursor.x = this._cols - 1;
            }
        }
        this.move_cursor_display();
    }

    get row() {
        return this._cursor.y;
    }

    get col() {
        return this._cursor.x;
    }

    public write_string_at_cursor(
        string: string,
        foreground_colour: number = 7,
        background_colour: number = 0,
        wrap = true,
        double_height: 'top' | 'bottom' | null = null
    ) {
        this.put_string_at(string, foreground_colour, background_colour, this._cursor.y, this._cursor.x, double_height, wrap);
        this._advance_cursor(string.length, wrap);
    }

    public put_string_at(
        string: string,
        foreground_colour: number = 7,
        background_colour: number = 0,
        row: number,
        col: number,
        double_height: 'top' | 'bottom' | null = null,
        wrap = true
    ) {
        for (let i = 0; i < string.length; i++) {
            if (col >= this._cols && wrap) {
                row++;
                col = 0;
            } else if (col >= this._cols) {
                return;
            }
            this.write_character_code(string.charCodeAt(i), foreground_colour, background_colour, row, col++, false, double_height);
        }
    }

    public set_cols(cols: number) {
        this._cols = cols;
        this._cursor.x = 0;
        this._cursor.y = 0;
        this._display_data.length = this._rows;
        for (let r = 0; r < this._rows; r++) {
            this._display_data[r].length = this._cols;
            for (let c = 0; c < this._cols; c++) {
                this._display_data[r][c] =  new TerminalCell({
                    row: r,
                    col: c,
                    character_index: " ".charCodeAt(0),
                    foreground_colour: 7,
                    background_colour: 0,
                    inverted: false
                });
                this._display_data[r][c].dirty = true;
            }
        }
        for (const row of this._display_data) {
            for (let i = 0; i < row.length; i++) {
                row[i].col = i;
            }
        }

        this._render_worker.postMessage({
            type: 'cols',
            cols: cols
        });
    }


    public clear() {
        for (let i = 0; i < this._rows; i++) {
            this.clear_line(i);
        }
    }

    public write_line(
        string: string,
        foreground_colour: number = 7,
        background_colour: number = 0,
        wrap = true,
        double_height: 'top' | 'bottom' | null = null
    ) {
        this.put_string_at(string, foreground_colour, background_colour, this._cursor.y, this._cursor.x, double_height, wrap);
        this.next_line();
    }
    
    public show_cursor() {
        this._show_cursor = true;
        this._display_cursor();
    }

    public hide_cursor() {
        this._show_cursor = false;
    }

    private _display_cursor() {
        this._display_data[this._cursor.y][this._cursor.x].inverted = true;
    }

    private _erase_cursor() {
        this._display_data[this._cursor.y][this._cursor.x].inverted = false;
    }

    get cols() {
        return this._cols;
    }

    get rows() {
        return this._rows;
    }

    public move_cursor_display() {
        this._erase_cursor();
        this._display_cursor();
    }

    private async _package_data() {
        const data = [];
        for (const r of this._display_data) {
            for (const c of r) {
                if (c.dirty) {
                    data.push(c.code & 0xFFFFFFFF);
                    c.dirty = false;
                }
            }
        }
        return new Uint32Array(data);
    }

    public print_disp_data_to_console() {
        for (const row of this._display_data) {
            let line = "";
            for (const cell of row) {
                if (cell.character_index >= 32 && cell.character_index <= 126) {
                    line += String.fromCharCode(cell.character_index);
                } else {
                    line += "?";
                }
                if (cell.inverted) {
                    line += "i ";
                } else {
                    line += "  ";
                }
            }
            console.log(line);
        }
    }

}

export default Terminal;