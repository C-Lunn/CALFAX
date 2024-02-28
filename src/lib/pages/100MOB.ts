import { TerminalCell } from "../Terminal";
import CalfaxPage, { decode_page_from_b64 } from "./CalfaxPage";
import p_100MOB from "./p_100MOB.json";

export class P100M extends CalfaxPage {
    num = 100;
    dumped = false;
    public async get(page: TerminalCell[][]): Promise<void> {
        if (this.dumped) return;
        const p = decode_page_from_b64(p_100MOB.b64);
        for (let r of p) {
            if (!r) continue;
            for (let c of r) {
                if (!c) continue;
                page[c.row][c.col].copy_from(c);
            }
        }
        this.dumped = true;
    }
}