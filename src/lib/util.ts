import Terminal from "./Terminal";

type TypedEventTarget<EventMap extends object> =
  { new (): IntermediateEventTarget<EventMap>; };

// internal helper type
interface IntermediateEventTarget<EventMap> extends EventTarget {
  addEventListener<K extends keyof EventMap>(
    type: K,
    callback: (
      event: EventMap[K] extends Event ? EventMap[K] : never
    ) => EventMap[K] extends Event ? void : never,
    options?: boolean | AddEventListenerOptions
  ): void;

  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void;
}

class OSEventTarget extends (EventTarget as TypedEventTarget<{
  'keydown': KeyboardEvent
}>) {
}

abstract class Program {
  abstract run(keyboard_event_target: OSEventTarget, terminal: Terminal, args: string[]): Promise<void>;
}

export {
    Program,
    OSEventTarget
};


export type { TypedEventTarget };