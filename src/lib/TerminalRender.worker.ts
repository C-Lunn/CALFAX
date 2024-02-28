import { colours_as_arr } from './Colours';
import char_set from './character_set_arr_new.json';

declare const self: DedicatedWorkerGlobalScope;
export default {} as typeof Worker & { new (): Worker };


let canvas: OffscreenCanvas;
let canvas_ctx: OffscreenCanvasRenderingContext2D;

const character_set = char_set;

for (let i = 0; i < 128; i++) {
    if (character_set[i] === null) continue;
    for (let r = 0; r < 24; r++) {
        character_set[i]?.unshift(1);
    }
    character_set[i] = character_set[i]?.slice(0, 12 * 20) ?? null;
}

const rows = 24;
let cols = 40;

const char_dimensions = {
    width: 12,
    height: 20
}


class Cell {
    private _char_code: number = 0;
    private _fg: number = 0;
    private _bg: number = 0;
    private _double_height: number = 0; // 0 = normal, 1 = top half, 2 = bottom half
    private _needs_render = true;
    private _inverted = false;
    private _rgba_buffer: Uint8ClampedArray;
    private _image_data?: ImageData;
    private _row_px: number;
    private _col_px: number;
    public dirty = false;

    constructor(row: number, col: number) {
        this._rgba_buffer = new Uint8ClampedArray(4 * char_dimensions.width * char_dimensions.height);
        this._row_px = row * char_dimensions.height;
        this._col_px = col * char_dimensions.width;
    }

    get char_code() {
        return this._char_code;
    }

    set char_code(char_code: number) {
        if (this._char_code !== char_code) {
            this._char_code = char_code;
            this._needs_render = true;
        }
    }

    get fg() {
        return this._fg;
    }

    set fg(fg: number) {
        if (this._fg !== fg) {
            this._fg = fg;
            this._needs_render = true;
        }
    }

    get bg() {
        return this._bg;
    }

    set bg(bg: number) {
        if (this._bg !== bg) {
            this._bg = bg;
            this._needs_render = true;
        }
    }

    get double_height() {
        return this._double_height;
    }

    set double_height(double_height: number) {
        if (this._double_height !== double_height) {
            this._double_height = double_height;
            this._needs_render = true;
        }
    }

    get inverted() {
        return this._inverted;
    }

    set inverted(inverted: boolean) {
        if (this._inverted !== inverted) {
            this._inverted = inverted;
            this._needs_render = true;
            this._render();
        }
    }

    get x() {
        return this._col_px;
    }

    get y() {
        return this._row_px;
    }

    public get image_data() {
        if (this._needs_render) {
            this._render();
        }
        return this._image_data;
    }

    public async read_cfxcode(code: number) {
        // 0XXXXXXX YYYYYYYI DDBBBFFF CCCCCCCC
        // backwards
        // CCCCCCCC DDBBBFFF YYYYYYYI 0XXXXXXX 
        const char_idx = code & 0xFF;
        const opts = (code >> 8);
        const fg_idx = opts & 0b111;
        const bg_idx = (opts >> 3) & 0b111;
        const double_height = ((opts >> 6) & 0b11);
        const inverted = ((opts >> 8) & 0b1) === 1;

        if (this._char_code !== char_idx) {
            this._char_code = char_idx;
            this._needs_render = true;
        }

        if (this._fg !== fg_idx) {
            this._fg = fg_idx;
            this._needs_render = true;
        }

        if (this._bg !== bg_idx) {
            this._bg = bg_idx;
            this._needs_render = true;
        }

        if (this._double_height !== double_height) {
            this._double_height = double_height;
            this._needs_render = true;
        }

        if (this._inverted !== inverted) {
            this._inverted = inverted;
            this._needs_render = true;
        }

        if (this._needs_render) {
            this._render();
        }

    }

    private _render() {
        let character_mask = character_set[this._char_code];
        if (character_mask === null || character_mask === undefined) {
            character_mask = character_set["?".charCodeAt(0)];
        }
        const fg_rgba = [...colours_as_arr[this._fg]];
        const bg_rgba = [...colours_as_arr[this._bg]];
        if (this._inverted) {
            for (let j = 0; j < 3; j++) {
                fg_rgba[j] = 255 - fg_rgba[j];
                bg_rgba[j] = 255 - bg_rgba[j];
            }
        }
        if (this._double_height !== 0) {
            // TODO: deal with dh here
        }

        for (let i = 0; i < character_mask!.length; i++) {
            const rgba_offset = 4 * i;
            const fg = character_mask![i] === 0;
            this._rgba_buffer.set(fg ? fg_rgba : bg_rgba, rgba_offset);
        }
        this._image_data = new ImageData(this._rgba_buffer, char_dimensions.width, char_dimensions.height);
        this._needs_render = false;
        this.dirty = true;
    }
}

const screen: Cell[][] = [];

for (let i = 0; i < rows; i++) {
    screen[i] = [];
    for (let j = 0; j < cols; j++) {
        screen[i][j] = new Cell(i, j);
    }
}

const raf_render = () => {
    if (canvas) {
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const cell = screen[i][j];
                if (cell.dirty) {
                    //if (j > 39) console.log(`col: ${j}, putting imagedata at ${cell.x}, ${cell.y}`)
                    canvas_ctx.putImageData(cell.image_data!, cell.x, cell.y);
                    cell.dirty = false;
                }
            }
        }
    }
    //requestAnimationFrame(raf_render);
}

const handle_char_data = async (data: ArrayBuffer) => {
    const dv = new DataView(data);
    let offset = 0;
    while (offset < data.byteLength) {
        const char_code = dv.getUint32(offset, true);
        const row = char_code >> 24;
        const col = ((char_code >> 17) & 0x7F);
        screen[row][col].read_cfxcode(char_code);
        offset += 4;
    }
    if (canvas) {
        requestAnimationFrame(raf_render);
    }
}

self.onmessage = async (event: MessageEvent) => {
    if (event.data.type === 'render') {
        requestAnimationFrame(raf_render);
    } else if (event.data.type === 'canvas') {
        canvas = event.data.canvas;
        canvas_ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    } else if (event.data.type === 'data') {
        handle_char_data(event.data.data);
    } else if (event.data.type === 'cols') {
        handle_cols(event.data.cols);
    }
}

setInterval(() => {
    if (canvas) {
        requestAnimationFrame(raf_render);
    }
}, 1000 / 50);

const handle_cols = (columns: number) => {
    if (columns !== 80 && columns !== 40) {
        throw new Error(`Unsupported number of columns: ${columns}`);
    }
    screen.length = 0;
    screen.length = rows;
    for (let i = 0; i < rows; i++) {
        screen[i] = [];
        for (let j = 0; j < columns; j++) {
            screen[i][j] = new Cell(i, j);
            screen[i][j].char_code = 0x20;
            screen[i][j].fg = 7;
            screen[i][j].bg = 0;
        }
    }
    cols = columns;
    canvas.width = columns * char_dimensions.width;
    requestAnimationFrame(raf_render);
}

/*
    private _generate_double_height_template(character: number[], half: 'top' | 'bottom') {
        const num_pixels = this._character_dimensions.width * this._character_dimensions.height * 4;
        const template = new Uint8ClampedArray(num_pixels);
        let pixels_written = 0;
        let row_offset = half === 'top' ? 0 : (this._character_dimensions.height * this._character_dimensions.width) / 2;

        while (pixels_written < num_pixels) {
            template.set(character.slice(row_offset, row_offset + this._character_dimensions.width * 4), pixels_written);
            pixels_written += this._character_dimensions.width * 4;
            template.set(character.slice(row_offset, row_offset + this._character_dimensions.width * 4), pixels_written);
            pixels_written += this._character_dimensions.width * 4;
            row_offset += this._character_dimensions.width * 4;
        }

        return template;
    }
*/