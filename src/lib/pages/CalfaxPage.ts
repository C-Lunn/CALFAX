import { TerminalCell } from "../Terminal";

export default abstract class CalfaxPage {
    public abstract num: number;
    public abstract get(page: TerminalCell[][]): Promise<void>;
}

export function decode_page_from_b64(b64: string): TerminalCell[][] {
    if (b64.slice(0, 2) !== "PE") throw new Error();
    const page: TerminalCell[][] = [];
    for (let i = 0; i < 24; i++) {
        page.push([]);
    }
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