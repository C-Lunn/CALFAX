import { colours } from "../Colours";
import Terminal from "../Terminal";
import { OSEventTarget, Program } from "../util";

export default class ShowGraphics extends Program {
    public async run(_: OSEventTarget, terminal: Terminal) {
        terminal.write_line("  0 1 2 3 4 5 6 7 8 9 A B C D E F");
        for (const i of '89ABC') {
            terminal.write_string_at_cursor((i) + " ");
            terminal.move_by(2, 0);
            for (let j = 0; j < 16; j++) {
                console.log(`writing character code ${parseInt((i + j.toString(16)), 16)}`);
                terminal.write_character_code(parseInt((i + j.toString(16)), 16), colours.yellow,colours.blue);
                terminal.move_by(2, 0);
            }
            terminal.next_line();
            terminal.next_line();
        }
    }
}