declare module 'fncli' {
    export = fncli;

    // Shell-completion handler shapes (mirrors shell-complete's Reply):
    type CompletionItem = string | { value: string; description?: string; noSpace?: boolean };
    type CompletionReply =
        | CompletionItem[]                              // candidates only
        | { items?: CompletionItem[]; default?: boolean } // candidates; default: files as fallback
        | { ext: string[] }                             // shell file completion, filtered
        | { dirs: true; in?: string }                   // directories only
        | null | undefined | void;                      // no opinion — shell does files
    type CompletionHandler =
        | CompletionReply                               // static
        | ((toComplete: string, state: any) => CompletionReply | Promise<CompletionReply>);

    function fncli(commands: any, config?: {
        argv?: string[];
        help?: boolean;
        // Built-in `completions` command; on by default. false disables it.
        completions?: false | {
            name?: string;                              // stub name (default: arg0 basename)
            handlers?: Record<string, CompletionHandler>; // by parameter name
        };
    }): void | Promise<void>;
}
