import Terminal from "../Terminal";
import { OSEventTarget, Program } from "../util";

export default class Disco extends Program {
    async run(keyboard_event_target: OSEventTarget, terminal: Terminal) {
        let _resolve_quit: any = () => { };
        const should_quit = new Promise((resolve) => {
            _resolve_quit = resolve;
        });

        keyboard_event_target.addEventListener('keydown', (ev) => {
            if (ev.key === "c" && ev.ctrlKey) {
                _resolve_quit();
            }
        });

        terminal.set_cols(80);

        terminal.write_line("CTRL + C to exit");
        const interval = setInterval(() => {
            for(let i = 1; i < 24; i++) {
                for(let j = 0; j < 80; j++) {
                    let code = Math.floor(Math.random() * 160) + 32;
                    if (code === 127) code = 32;
                    const bg = Math.floor(Math.random() * 8);
                    const fg = Math.floor(Math.random() * 8);
                    terminal.write_character_code(code, fg, bg, i, j);
                }
            }
        }, 1000/20);

        await should_quit;
        clearInterval(interval);
        terminal.clear();
    }
}