import Page from "../Page";
import CalfaxPage, { decode_page_from_b64 } from "./CalfaxPage";
import  p_102 from "./p_102.json";

const cities: {
    [key: string]: {
        lat: number,
        long: number,
        row: number,
        col: number,
        temp?: number
    }
} = {
    "Melbourne": {
        lat: -37.8136,
        long: 144.9631,
        row: 17,
        col: 30
    },
    "Adelaide": {
        lat: -34.9285,
        long: 138.6007,
        row: 14,
        col: 26
    },
    "Sydney": {
        lat: -33.8688,
        long: 151.2093,
        row: 14,
        col: 36
    },
    "Brisbane": {
        lat: -27.4698,
        long: 153.0251,
        row: 11,
        col: 36
    },
    "Perth": {
        lat: -31.9505,
        long: 115.8605,
        row: 14,
        col: 10
    },
    "Darwin": {
        lat: -12.4634,
        long: 130.8456,
        row: 3,
        col: 21
    },
    "Hobart": {
        lat: -42.8821,
        long: 147.3272,
        row: 20,
        col: 31
    },
    "Canberra": {
        lat: -35.2809,
        long: 149.1300,
        row: 16,
        col: 32
    }

}

async function make_weather_request(city: string) {
    const resp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${cities[city].lat}&longitude=${cities[city].long}&current_weather=true`);
    const resp_json = await resp.json();
    return Math.round(resp_json.current_weather.temperature);
}


export class P102 extends CalfaxPage {
    num = 102;
    dumped = false;
    ready_to_display_temp = false;
    public constructor() {
        super();
        this._get_weather();
    }

    private async _get_weather() {
        for (const city of Object.keys(cities)) {
            const temp = await make_weather_request(city);
            cities[city].temp = temp;
        }
        this.ready_to_display_temp = true;
    }

    public async get(page: Page): Promise<void> {
        if (this.dumped) return;
        if (!this.ready_to_display_temp) {
            page.write_string_at(20, 0, "LOADING", 7, 0);
        } else {
            const p = decode_page_from_b64(p_102.b64);
        for (let r of p) {
            if (!r) continue;
            for (let c of r) {
                if (!c) continue;
                page[c.row][c.col].copy_from(c);
            }
        }
        page.write_string_at(20, 0, "     From Open-Meteo     ", 5, 0);
        for (const city of Object.keys(cities)) {
            let fg = 7;
            if (cities[city].temp! < 10) {
                fg = 6;
            } else if (cities[city].temp! > 20) {
                fg = 3;
            } else if (cities[city].temp! > 35) {
                fg = 1;
            }
            page.write_string_at(cities[city].row, cities[city].col, `${cities[city].temp}`, fg, 0);
        }
        this.dumped = true;
        }
        
    }
}