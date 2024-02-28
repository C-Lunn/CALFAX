import { colours } from "../Colours";
import Page from "../Page";
import Terminal from "../Terminal";
import { P100 } from "../pages/100";
import { P100M } from "../pages/100MOB";
import { P101 } from "../pages/101";
import { P102 } from "../pages/102";
import { P201 } from "../pages/201";
import { P901 } from "../pages/901";
import CalfaxPage from "../pages/CalfaxPage";
import { Program, OSEventTarget } from "../util";
import PageEdit from "./PageEdit";

export default class CalfaxViewer extends Program {
    private _should_quit: Promise<void>;
    private _resolve_should_quit = () => { };
    private _term!: Terminal;
    private _page!: Page;
    private _content: Page;
    private _active_page_num: number = 100;
    private _active_page: CalfaxPage = new P100();
    private _user_input: string = "";
    private _intervals: any[] = [];
    private _ket!: OSEventTarget;
    private _is_mobile: boolean = false;
    private _bound_kd!: (ev: KeyboardEvent) => void;
    private _pages: {
        [key: number]: typeof CalfaxPage
    } = {
        100: P100,
        101: P101,
        102: P102,
        201: P201,
        901: P901
    };

    constructor() {
        super();
        this._should_quit = new Promise((resolve) => {
            this._resolve_should_quit = resolve;
        })
        this._page = new Page(24, 40);
        this._content = new Page(22, 40, 1, 0);
    }

    private _clear_page() {
        this._content.clear();
        this._term.clear();
    }

    async run(keyboard_event_target: OSEventTarget, terminal: Terminal, args: any[]) {
        this._term = terminal;
        this._ket = keyboard_event_target;
        this._term.clear();
        this._term.hide_cursor();
        this._is_mobile = args[0];
        if (this._is_mobile) {
            this._pages[100] = P100M;
            this._active_page = new P100M();
        }
        this._bound_kd = this._handle_keydown.bind(this);
        keyboard_event_target.addEventListener("keydown", this._bound_kd);
        this._intervals.push(setInterval(() => {
            this._dump_to_screen();
        }), 150);
        await this._should_quit;
        for (const i of this._intervals) {
            clearInterval(i);
        }
        this._term.show_cursor();
        this._term.clear();
        this._term.move_cursor(0, 0);
        this._term.write_line("CALFAX OS v1.0.0");
        this._term.write_line("Type 'help' for a list of commands.");
    }

    private async _handle_keydown(ev: KeyboardEvent) {
        if (ev.key === "c" && ev.ctrlKey) {
            this._resolve_should_quit();
        }
        if (!(isNaN(parseInt(ev.key)))) {
            this._user_input += ev.key;
            if (this._user_input.length === 3) {
                const pg_num = parseInt(this._user_input);
                if (pg_num === 999) {
                    if (this._is_mobile) {
                        this._user_input = "";
                        return;
                    }
                    this._resolve_should_quit();
                    return;
                }
                else if (pg_num === 202) {
                    window.location.href = "https://github.com/C-Lunn";
                } else if (pg_num === 203) {
                    window.location.href = "https://www.linkedin.com/in/callumlunn/";
                } else if (pg_num === 902) {
                    if (this._is_mobile) {
                        this._user_input = "";
                        return;
                    }
                    this._clear_page();
                    this._user_input = "";
                    clearInterval(this._intervals[0]);
                    this._intervals = [];
                    const pe_target = new OSEventTarget();
                    this._ket.removeEventListener("keydown", this._bound_kd as EventListener);
                    const hkd = (ev: any) => {
                        const ev_to_dispatch = new KeyboardEvent(ev.type, ev);
                        pe_target.dispatchEvent(ev_to_dispatch);
                    }
                    this._ket.addEventListener("keydown", hkd);
                    await new PageEdit().run(pe_target, this._term);
                    this._intervals.push(setInterval(() => {
                        this._dump_to_screen();
                    }), 150);
                    this._ket.removeEventListener("keydown", hkd);
                    this._ket.addEventListener("keydown", this._bound_kd);
                    this._active_page = new P100();
                    this._active_page_num = 100;
                }
                else if (pg_num in this._pages) {
                    this._active_page_num = pg_num;
                    this._active_page = new (this._pages[pg_num] as any)();
                    this._clear_page();
                    this._user_input = "";
                } else {
                    this._user_input = "";
                }
            }
        }
    }

    private async _generate_topbar() {
        const top_left = ` CALFAX P${this._active_page_num}`
        const d = new Date();
        const date_str = `${d.toString().split(" ").slice(0, 3).join(" ")} ${d.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
        }).split(":").slice(0, 2).join(":")}/${d.getSeconds().toString().padStart(2, "0")} `;
        this._page.clear_line(0, 0);
        this._page.write_string_at(0, 0, top_left, colours.white, 0);
        const right_offset = (this._user_input.length > 0) ? 4 : 0;
        this._page.write_string_at(0, 40 - date_str.length - right_offset, date_str, colours.yellow, 0);
        if (this._user_input.length > 0) {
            this._page.write_string_at(0, 40 - right_offset, this._user_input, colours.white, 0);
        }
    }

    private async _dump_to_screen() {
        this._generate_topbar();
        await this._active_page.get(this._content);
        for (const r of this._content) {
            for (const c of r) {
                this._page[c.row][c.col].copy_from(c);
            }
        }
        for (let i = 0; i < this._page.length; i++) {
            for (let j = 0; j < this._page[i].length; j++) {
                this._term.put_termchar(this._page[i][j].code);
            }
        }
    }
}