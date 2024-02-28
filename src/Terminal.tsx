import { createElement, createRef, useEffect, useRef } from "react"
import Term from "./lib/Terminal";
import OS from "./lib/OS";


function Terminal(props: any) {
    const canvas = createRef<HTMLCanvasElement>();
    const cv = createElement("canvas", {
        ref: canvas,
        id: props.canvas_id ?? "term-canvas",
        imageRendering: "pixelated"
    });
    const term = useRef<Term>();
    const os = useRef<OS>();

    useEffect(() => {
        requestAnimationFrame(async () => {
            if (!term.current) term.current = new Term(canvas.current!, 24, 40);
            await term.current.is_ready;
            os.current = new OS(term.current, props.mobile);
        });
    }, []);

    return (
        <div className={props.holder_id ?? "terminal"}>
            {cv}
        </div>
    )

}

export default Terminal;