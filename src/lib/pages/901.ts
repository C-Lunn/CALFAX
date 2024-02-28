import { colours } from "../Colours";
import Page from "../Page";
import { TerminalCell } from "../Terminal";
import CalfaxPage, { decode_page_from_b64 } from "./CalfaxPage";
import  p_901 from "./p_901.json";

const about_me_text = 
`When I was a child in the late 1990s, we didn't have the internet at home. When I first found the Teletext button on the TV remote, I was absolutely fascinated -- you could control what the TV was telling you, and everything was live!

Since then, I've been fascinated by how that worked -- how did they send all that text if you could still hear the TV station going on behind it? Eventually, that culminated into my degree in Electronic Engineering.

This website is an homage to teletext, specifically BBC CEEFAX, and in many ways operates in a similar way. The screen you are currently looking at is an HTML canvas element that has been divided into 24 rows of 40 columns, and all the text you see has been generated from the actual text/graphical bitmaps of a Mullard SAA5050 Teletext Generator chip. Co-incidentally (or perhaps not so), this is also a common way that computers of the 1980s (e.g. the BBC Micro) displayed to TVs.

To drive this, I have developed a coding system that allows for graphics created in this way to be stored in a compact format. Underpinning that is a barebones 'OS' which interacts with the terminal, allowing for 'programs' to be written and run. In this way, I hope to keep extending this website in the future.

The source for this website, written in TypeScript, can be viewed by visiting page 910. I hope you enjoy the novelty of this site and perhaps it evokes some feelings of nostalgia.`;


export class P901 extends CalfaxPage {
    num = 100;
    next_page_update: Date = new Date();
    pages: Page[] = [];
    p: any;
    shown_page = -1;
    constructor() {
        super();
        let line_counter = 0;
        this.pages.push(new Page(22-8, 36, 7, 2));
        for (const line of about_me_text.split("\n")) {
            const split_line = line.split(" ");
            for (const word of split_line) {
                if (word.includes("-")) {
                    const split_word = word.split("-");
                    split_word[0] += "-";
                    split_line.splice(split_line.indexOf(word), 1, ...split_word);
                }
            }
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
                    this.pages.at(-1)!.write_string_at(line_counter++, 0, w.join(" "), 7, 0);
                } else {
                    const length_including_spaces = w.join(" ").length;
                    for (let i = 0; i < 36 - length_including_spaces; i++) {
                        w[i % (w.length - 1)] += " ";
                    }
                    this.pages.at(-1)!.write_string_at(line_counter++, 0, w.join(" "), 7, 0);
                }
                if (line_counter >= 22-8) {
                    line_counter = 0;
                    this.pages.push(new Page(22-8, 36, 7, 2));
                }
            }
        }

        this.p = decode_page_from_b64(p_901.b64);
    }

    public async get(page: Page): Promise<void> {
        const now = new Date();
        if (now > this.next_page_update) {
            this.shown_page++;
            if (this.shown_page >= this.pages.length) {
                this.shown_page = 0;
            }
            this.next_page_update = new Date(now.getTime() + 14000);
        }
        for (let r of this.p) {
            if (!r) continue;
            for (let c of r) {
                if (!c) continue;
                page[c.row][c.col].copy_from(c);
            }
        }
        page.clear_line(6, 0);
        const index_indicator = `${this.shown_page + 1}/${this.pages.length}`
        page.write_string_at(6, 38-index_indicator.length, index_indicator, colours.yellow, colours.black)
        const next_page_indicator = "-".repeat(Math.floor((this.next_page_update.getTime() - now.getTime()) / 2000))
        page.write_string_at(6, 38 - index_indicator.length - next_page_indicator.length - 1, next_page_indicator, colours.cyan, colours.black);
        for (const r of this.pages[this.shown_page]) {
            for (const c of r) {
                page[c.row][c.col].copy_from(c);
            }
        }
    }
}