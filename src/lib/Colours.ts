const clrs: {
    [key: string]: [number, number, number, number]
} = {
    black: [0, 0, 0, 255],
    red: [255, 0, 0, 255],
    green: [0, 255, 0, 255],
    yellow: [255, 255, 0, 255],
    blue: [0, 0, 255, 255],
    magenta: [255, 0, 255, 255],
    cyan: [0, 255, 255, 255],
    white: [255, 255, 255, 255],
}

const colours_as_arr: [number, number, number, number][] = Object.values(clrs);

enum colours {
    black,
    red,
    green,
    yellow,
    blue,
    magenta,
    cyan,
    white,
}

export  { colours, colours_as_arr };