declare module "alfy" {
    interface ScriptFilterJsonFormat {
        uid?: string,
        type?: "default" | "file" | "file:skipcheck",
        title: string,
        subtitle?: string,
        arg?: string,
        autocomplete?: string,
        icon?: {
            type?: "fileicon" | "filetype",
            path: string
        },
        valid?: boolean
        // eslint-disable-next-line @typescript-eslint/ban-types
        mods?: object
        // eslint-disable-next-line @typescript-eslint/ban-types
        text?: object
        quicklookurl?: string
    }

    const input: string;

    function output(list: ScriptFilterJsonFormat[]): void;

    function error(err: Error | string): void;
}

declare module "ssh-config" {
    interface Option {
        param: "HostName" | "IdentityFile" | "User" | "Host" | string,
        value: string,
        config: Option[],
    }

    interface HostConfig extends Option {
        param: "Host",
    }

    type Config = Option[];

    function parse(configString: string): Config;
}
