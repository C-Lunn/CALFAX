import Terminal from "./Terminal";
import BASIC from "./programs/BASIC";
import CalText from "./programs/CalText";
import CalfaxViewer from "./programs/CalfaxViewer";
import Cols from "./programs/Cols";
import Disco from "./programs/Disco";
import PageEdit from "./programs/PageEdit";
import ShowGraphics from "./programs/ShowGraphics";
import Time from "./programs/Time";
import { OSEventTarget, Program } from "./util";

class Echo extends Program {
    async run(_: OSEventTarget, terminal: Terminal, args: string[]) {
        terminal.write_line(args.join(" "));
    }
}

class Help extends Program {
    async run (_: OSEventTarget, terminal: Terminal, args: string[]) {
        for (const p of args[0]) {
            terminal.write_line(p);
        }
    }
}

class Clear extends Program {
    async run (_: OSEventTarget, terminal: Terminal) {
        terminal.clear();
        terminal.move_cursor(0, 0);
    }

}

// Simulates a basic OS. Programs are classes that have an asynchronous `run` method, which takes control of the terminal.
export default class OSCMD {
    _programs: {
        [key: string]: any
    } = {
        'echo': Echo,
        'time': Time,
        'gfx': ShowGraphics,
        'cols': Cols,
        'disco': Disco,
        'pageedit': PageEdit,
        'pe': PageEdit,
        'calfax': CalfaxViewer,
        'caltext': CalText,
        'ct': CalText,
        'help': Help,
        'clear': Clear,
        'basic': BASIC
    }
    _terminal: Terminal;
    _cmd_ev_dispatcher: OSEventTarget = new OSEventTarget();
    _ev_dispatcher: OSEventTarget = this._cmd_ev_dispatcher;
    private _input_buffer: string = "";
    private _input_buf_history: string[] = [];
    private _input_buf_history_idx: number = 0;
    protected _is_mobile: boolean = false;
    

    constructor(terminal: any, is_mobile: boolean) {
        this._terminal = terminal;
        this._setup_listener();
        this._setup_cmd_listeners();
        this._is_mobile = is_mobile;
        this.run_program('calfax', []);
    }

    private _setup_listener() {
        window.addEventListener('keydown', (ev) => {
            if (this._ev_dispatcher) {
                // Allow opening devtools and pasting.
                if (!["F12", "v"].includes(ev.key)) ev.preventDefault();
                const ev_to_dispatch = new KeyboardEvent(ev.type, ev);
                this._ev_dispatcher.dispatchEvent(ev_to_dispatch);
            }
        })
    }

    private _setup_cmd_listeners() {
        this._cmd_ev_dispatcher.addEventListener('keydown', (ev) => {
            if (ev.key === "Enter") {
                this._handle_enter();
            } else if (ev.key === "Backspace") {
                this._handle_backspace();
            } else if (ev.key === "ArrowUp" || ev.key === "ArrowDown" || ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
                this._handle_arrow(ev.key);
            } else if (ev.key.length === 1 && ev.key.charCodeAt(0) >= 32 && ev.key.charCodeAt(0) <= 126) {
                this._handle_char(ev.key);
            }
        });
    }

    private async _handle_enter() {
        this._terminal.next_line();
        const input = this._input_buffer;
        if (input !== "") {
            this._input_buf_history.unshift(input);
            this._input_buf_history_idx = 0;
        }
        this._input_buffer = "";
        const split_input = input.split(" ");
        const cmd = split_input[0];
        const args = split_input.slice(1);
        if (cmd in this._programs) {
            await this.run_program(cmd, args);
        } else if (cmd === "") {
            this._terminal.write_string_at_cursor(">");
            this._terminal.move_by(1, 0);
        } 
        else {
            this._terminal.write_line("Unknown command: " + cmd);
            this._terminal.write_string_at_cursor(">");
            this._terminal.move_by(1, 0);
        }
    }

    private _write_input_buffer() {
        const old_col = this._terminal.col;
        this._terminal.clear_line(this._terminal.row);
        this._terminal.put_string_at(">" + this._input_buffer, 7, 0, this._terminal.row, 0);
        this._terminal.move_cursor(old_col, this._terminal.row);
    }

    private _handle_backspace() {
        const cursor_pos = this._terminal.col - 2;
        if (this._input_buffer.length > 0) {
            this._input_buffer = this._input_buffer.slice(0, cursor_pos) + this._input_buffer.slice(cursor_pos + 1);
            this._write_input_buffer();
            this._terminal.move_by(-1, 0);
        }
    }

    private _handle_arrow(key: string) {
        if (key === "ArrowLeft") {
            if (this._terminal.col > 1) {
                this._terminal.move_by(-1, 0);
            }
        } else if (key === "ArrowRight") {
            if (this._terminal.col < this._terminal.cols && this._terminal.col < this._input_buffer.length + 1) {
                this._terminal.move_by(1, 0);
            }
        } else if (key === "ArrowUp") {
            if (this._input_buf_history_idx < this._input_buf_history.length) {
                this._input_buf_history_idx += 1;
                this._input_buffer = this._input_buf_history[this._input_buf_history_idx - 1];
                this._write_input_buffer();
            }
        } else if (key === "ArrowDown") {
            if (this._input_buf_history_idx > 0) {
                this._input_buf_history_idx -= 1;
                this._input_buffer = this._input_buf_history[this._input_buf_history_idx];
                this._write_input_buffer();
            } else {
                this._input_buf_history_idx = 0;
                this._input_buffer = "";
                this._write_input_buffer();
            }
        }
    }

    private _handle_char(char: string) {
        if (this._input_buffer.length < this._terminal.cols - 2) {
            const cursor_pos = this._terminal.col-1;
            this._input_buffer = this._input_buffer.slice(0, cursor_pos) + char + this._input_buffer.slice(cursor_pos);
            this._write_input_buffer();
            this._terminal.move_by(1, 0);
        }
    }


    private async run_program(program_name: string, args: any[]) {
        // Creates a new event target for the program to use. In this way, it can set up its own event listeners without interfering with the main event dispatcher.
        // Also, when the program is terminated it can be cleaned up easily.
        this._ev_dispatcher = new OSEventTarget();
        const p = new this._programs[program_name]();
        // Special cases -- mobile users will never be able to type this but we're running the OS even in CALFAX mode.
        if (program_name === "calfax") args = [this._is_mobile];
        if (program_name === "help") args.push(Object.keys(this._programs));
        await p.run(this._ev_dispatcher, this._terminal, args);
        this._ev_dispatcher = this._cmd_ev_dispatcher;
        this._terminal.next_line();
        this._terminal.write_string_at_cursor(">");
        this._terminal.move_by(1, 0);
    }
}
