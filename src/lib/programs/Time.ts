import Terminal from "../Terminal";
import { OSEventTarget, Program } from "../util";

export default class Time extends Program {
    async run(keyboard_event_target: OSEventTarget, terminal: Terminal) {
        let _resolve_quit: any = () => { };
        const should_quit = new Promise((resolve) => {
            _resolve_quit = resolve;
        });

        keyboard_event_target.addEventListener('keydown', (ev) => {
            if (ev.key === "c" && ev.ctrlKey) {
                console.log("CTRL + C");
                _resolve_quit();
            }
        });

        terminal.write_line("CTRL + C to quit");
        const interval = setInterval(() => {
            const line = terminal.row;
            terminal.clear_line(line);
            terminal.move_cursor(0, line);
            terminal.write_string_at_cursor(new Date().toLocaleTimeString());
        }, 200);

        await should_quit;
        clearInterval(interval);
    }
}