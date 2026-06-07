declare module 'fncli' {
    export = fncli;
    function fncli(commands: any, config?: { argv?: string[]; help?: boolean }): void;
}
