import Terminal from "../Terminal";
import { OSEventTarget, Program } from "../util";
import BASICRunnerWorker from "./BASICRunner.worker?worker";

export default class BASIC extends Program {
    _terminal!: Terminal
    _ket!: OSEventTarget
    _input_buffer: string = "";
    _input_buf_history: string[] = [];
    _input_buf_history_idx: number = 0;
    _worker: Worker = new BASICRunnerWorker();
    _res?: (val?: unknown) => void;
    _resolve_quit: (val?: unknown) => void;
    async run(keyboard_event_target: OSEventTarget, terminal: Terminal) {
        let _resolve_quit: any = () => { };
        const should_quit = new Promise((resolve) => {
            this._resolve_quit = resolve;
        });

        this._terminal = terminal;
        this._ket = keyboard_event_target;
        this._setup_cmd_listeners();
        this._terminal.write_line("CALBASIC 0.0.1");
        this._terminal.write_string_at_cursor(">");
        this._terminal.move_by(1, 0);

        this._worker.onmessage = (e) => {
            if (e.data.type === "res") {
                this._res !== undefined ? this._res() : (() => {})();
            }
            if (e.data.type === "print") {
                this._terminal.write_line(e.data.data);
            }
        }

        setTimeout(() => {
            this._worker.postMessage({type: "input", data: "10 PRINT \"HELLO\""});
            this._worker.postMessage({type: "input", data: "20 GOTO 10"});
            this._worker.postMessage({type: "list"});
        }, 1000);

        await should_quit;
        terminal.clear();
    }


    private _setup_cmd_listeners() {
        this._ket.addEventListener('keydown', async(ev) => {
            if (ev.key === "Escape") {
                this._worker.terminate();
                this._res !== undefined ? this._res() : (() => {})();
                this._worker = new BASICRunnerWorker();
                this._worker.onmessage = (e) => {
                    if (e.data.type === "res") {
                        this._res !== undefined ? this._res() : (() => {})();
                    }
                    if (e.data.type === "print") {
                        this._terminal.write_line(e.data.data);
                    }
                }
                this._terminal.clear();
                this._terminal.write_line("TERMINATED.")

            } else if (ev.key === "c" && ev.ctrlKey) {
                this._worker.terminate();
                this._resolve_quit();
            } else if (ev.key === "Enter") {
                await this._handle_enter();
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
        const should_res = new Promise((resolve) => {
            this._res = resolve;
        });
        if (input === "") {
            this._terminal.write_string_at_cursor(">");
            this._terminal.move_by(1, 0);
            return;
        } else if (input.toUpperCase() === "LIST") {
            this._worker.postMessage({ type: "list" });
            
        } else if (input.toUpperCase() === "RUN") {
            this._worker.postMessage({ type: "run" });
        } else {
            this._worker.postMessage({ type: "input", data: input });
        }
        await should_res;
        this._terminal.write_string_at_cursor(">");
        this._terminal.move_by(1, 0);
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
            const cursor_pos = this._terminal.col - 1;
            this._input_buffer = this._input_buffer.slice(0, cursor_pos) + char + this._input_buffer.slice(cursor_pos);
            this._write_input_buffer();
            this._terminal.move_by(1, 0);
        }
    }
}