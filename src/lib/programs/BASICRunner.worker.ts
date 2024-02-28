import  '../../wasm/wasm_exec.js';
import '../../wasm/wasm_types.d.ts';
import basicurl from '../../wasm/index.wasm?url'

declare const self: DedicatedWorkerGlobalScope;
export default {} as typeof Worker & { new (): Worker };

const go = new (self as any).Go();
console.log("basicurl", basicurl);
WebAssembly.instantiateStreaming(fetch(basicurl), go.importObject).then((result) => {
    console.log("result", result);
    go.run(result.instance);
    (self as any).basic_set_term_printline((s: string) => {
        self.postMessage({ type: "print", data: s });
    });
    
});

self.onmessage = (e) => {
    console.log("TS: Got message", e.data.type)
    switch (e.data.type) {
        case "run":
            console.log("TS: before run");
            (self as any).basic_run()
            console.log("TS: After run");
            break;
        case "list":
            (self as any).basic_list();
            break;
        case "input":
            (self as any).basic_accept_line(e.data.data);
            break;
        case "interrupt":
            console.log("\n\n\n\nGOT INTERRUPT\n\n\n\n");
            (self as any).basic_interrupt();
            break;
        default:
            break;
    }
    self.postMessage({ type: "res" });
}