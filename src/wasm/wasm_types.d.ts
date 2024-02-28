declare global {
    export interface Window {
      Go: any;
      echo: (inp: string) => void
    }
  }
  
  export {};
  