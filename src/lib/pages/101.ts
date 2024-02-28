import { colours } from "../Colours";
import Page from "../Page";
import CalfaxPage, { decode_page_from_b64 } from "./CalfaxPage";
import  p_101 from "./p_101.json";
import { XMLParser } from 'fast-xml-parser';

export class P101 extends CalfaxPage {
    num = 100;
    dumped = false;
    p = decode_page_from_b64(p_101.b64);
    pages: Page[] = []
    next_page_update: Date = new Date();
    shown_page = -1;
    ready = false;
    err = false;
    
    constructor() {
        super();
        this.getRSSArticles().then(() => {
            this.ready = true;
        }, () => {
            this.err = true;
        });
    }
    public async get(page: Page): Promise<void> {
        const now = new Date();

        for (let r of this.p) {
            if (!r) continue;
            for (let c of r) {
                if (!c) continue;
                page[c.row][c.col].copy_from(c);
            }
        }
        if (!this.ready && this.err) {
            page.write_string_at(10, 5, "Sorry, there was an error.", colours.red, colours.black);
            return;
        }
        if (!this.ready) {
            page.write_string_at(10, 18, "Loading...", colours.yellow, colours.black);
            return;
        }
        if (now > this.next_page_update) {
            this.shown_page++;
            if (this.shown_page >= this.pages.length) {
                this.shown_page = 0;
            }
            this.next_page_update = new Date(now.getTime() + 14000);
        }
        page.clear_line(6, 0);
        page.write_string_at(6, 2, "From BBC News", colours.magenta, colours.black)
        const index_indicator = `${this.shown_page + 1}/${this.pages.length}`
        page.write_string_at(6, 38-index_indicator.length, index_indicator, colours.green, colours.black)
        const next_page_indicator = "-".repeat(Math.floor((this.next_page_update.getTime() - now.getTime()) / 2000))
        page.write_string_at(6, 38 - index_indicator.length - next_page_indicator.length - 1, next_page_indicator, colours.cyan, colours.black);
        for (const r of this.pages[this.shown_page]) {
            for (const c of r) {
                page[c.row][c.col].copy_from(c);
            }
        }
    }

    // Justifies monospace text by adding spaced between words until a word falls off the end.
    public apply_justify_text(page: Page, text: string, line_counter: number, fg: number) {
        const split_line = text.split(" ");
        const lines = [];
        while (split_line.length > 0) {
            const w = [];
            while(w.join(" ").length < 36 && split_line.length > 0) {
                w.push(split_line.shift());
            }
            if (w.length === 1 && w[0] === "" && line_counter === 0) continue;
            if (w.join(" ").length > 36) {
                split_line.unshift(w.pop()!);
            }
            if (split_line.length === 0) {
                lines.push(w.join(" "));
            } else {
                const length_including_spaces = w.join(" ").length;
                for (let i = 0; i < 36 - length_including_spaces; i++) {
                    w[i % (w.length - 1)] += " ";
                }
                lines.push(w.join(" "));
            }
        }

        return lines;
    }

    public async getRSSArticles() {
        const res = await fetch('rss/news/rss.xml',
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/xml'
                    }
                    }
            );
        const rss = await new XMLParser().parse(await res.text());
        const items = rss.rss.channel.item;
        this.pages = [];
        let line_counter = 0;
        this.pages.push(new Page(22-8, 36, 7, 2));
        for (const item of items) {
            const title_lines = this.apply_justify_text(this.pages.at(-1)!, item.title, line_counter, 7);
            const description_lines = this.apply_justify_text(this.pages.at(-1)!, item.description, line_counter + title_lines.length, 7);
            if (line_counter + title_lines.length + description_lines.length >= 22-8) {
                line_counter = 0;
                this.pages.push(new Page(22-8, 36, 7, 2));
            }
            for (const line of title_lines) {
                this.pages.at(-1)!.write_string_at(line_counter++, 0, line, colours.yellow, 0);
            }
            for (const line of description_lines) {
                this.pages.at(-1)!.write_string_at(line_counter++, 0, line, colours.white, 0);
            }
            if (line_counter !== 22-10) line_counter += 2;
        }
    }
}