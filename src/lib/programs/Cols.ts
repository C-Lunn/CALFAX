import Terminal from "../Terminal";
import { OSEventTarget, Program } from "../util";

export default class Cols extends Program {
    public async run(_: OSEventTarget, terminal: Terminal, args: string[]) {
        const cols = parseInt(args[0] ?? "");
        if (cols === 40 || cols === 80) {
            terminal.set_cols(cols);
            terminal.write_line(`Set number of columns to ${cols}.`);
        } else {
            terminal.write_line("Invalid number of columns. Valid numbers are 40 and 80.");
        }
    }
}