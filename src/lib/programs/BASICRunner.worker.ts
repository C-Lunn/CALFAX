import  '../../wasm/wasm_exec.js';
import '../../wasm/wasm_types.d.ts';
import basicurl from '../../wasm/index.wasm?url'

declare const self: DedicatedWorkerGlobalScope;
export default {} as typeof Worker & { new (): Worker };

const go = new (self as any).Go();
WebAssembly.instantiateStreaming(fetch(basicurl), go.importObject).then((result) => {
    go.run(result.instance);
    const res = (self as any).basic_set_term_printline((s: string) => {
        self.postMessage({ type: "print", data: s });
    });
    if (res) {
        self.postMessage({ type: "ready" });
    }
    
});

self.onmessage = (e) => {
    switch (e.data.type) {
        case "run":
            (self as any).basic_run()
            break;
        case "list":
            (self as any).basic_list();
            break;
        case "input":
            if ((self as any).basic_accept_line(e.data.data)) {
                self.postMessage({ id: e.data.id, type: "line_accept"})
                return;
            } else {
                self.postMessage({ id: e.data.id, type: "line_reject"})
                return;
            }
            break;
        default:
            break;
    }
    self.postMessage({ id: e.data.id, type: "res" });
}