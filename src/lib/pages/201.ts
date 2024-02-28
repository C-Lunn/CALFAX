import { colours } from "../Colours";
import Page from "../Page";
import { TerminalCell } from "../Terminal";
import CalfaxPage, { decode_page_from_b64 } from "./CalfaxPage";
import  p_201 from "./p_201.json";

const about_me_text = 
`I am a Research & Development Engineer at the BBC, based in MediaCityUK. During my time there, I have worked on a broad range of projects, including:

¬Multicast Dynamic Adaptive Streaming over Satellite

¬Interactivity Metadata for Object-Based Audio 

¬Sustainability

¬AI Analysis of Subtitle Data

I have since taken up a permanent position as part of the Time-addressable Media Store (TAMS) team, where I am working on a WebCodecs-based content viewing tool to allow end-users to view content stored within the tools my team has developed. The overall aim of the project is to assist the BBC's transition into an all-IP future, eschewing the need for traditional media supply chains.

I graduated from the University of Manchester in 2019 with a first-class Master's of Engineering (MEng) in Electronic Engineering with Industrial Experience. My final project involved working with the British Antarctic Survey to develop an automated, sled-pulled ice depth measuring instrument. During my time at university, I undertook a year-long placement at (GM, later Peugeot-owned) Vauxhall Motors' car factory in Ellemere Port, where I worked as a Quality Engineer.

Outside of work, I am a keen musician, regularly attending and playing at open mic nights in the local area, even using some of my experience in student radio to run a couple of nights. I am also a member of a local band, the Indefinite Articles, where I play bass.

Other interests of mine include photography, and often take photos at friends' gigs.`.replaceAll("¬", String.fromCharCode(0x83));


export class P201 extends CalfaxPage {
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

        this.p = decode_page_from_b64(p_201.b64);
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