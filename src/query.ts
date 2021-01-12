/// <reference types="../types" />

import {ScriptFilterJsonFormat} from "alfy";
import * as alfy from "alfy";
import {getCurrentlyOpeningForwards, getServerConfigs} from "./lib";

function buildShellCandidates(serverName?: string): ScriptFilterJsonFormat[] {
    const candidates: ScriptFilterJsonFormat[] = [];
    const servers = getServerConfigs();
    for (const serverConfig of servers) {
        if (!serverName || serverConfig.value.startsWith(serverName)) {
            candidates.push({
                title: `open shell on remote server '${serverConfig.value}'`,
                subtitle: `ssh shell ${serverConfig.value}`,
                arg: `shell ${serverConfig.value}`,
                autocomplete: `shell ${serverConfig.value}`,
            });
        }
    }
    return candidates;
}

function buildPortCandidates(action?: "open" | "close" | "list", serverName?: string, args: string[] = []): ScriptFilterJsonFormat[] {
    const candidates: ScriptFilterJsonFormat[] = [];
    const servers = getServerConfigs();
    if (!action) {
        candidates.push(
            {
                title: "open local port forwarding from remote server",
                subtitle: "Usage: port:open serverName remotePort:localPort",
                autocomplete: "port:open",
            },
            {
                title: "close local port forwarding from remote server",
                subtitle: "Usage: port:close serverName remotePort:localPort",
                autocomplete: "port:close",
            },
            {
                title: "list opening local port forwards from remote server",
                subtitle: "Usage: port:list",
                arg: "port:list",
                autocomplete: "port:list",
            },
        );
    } else if (action === "list") {
        getCurrentlyOpeningForwards().forEach(fw => {
            candidates.push({
                title: `localhost:${fw.localPort} -> ${fw.serverName}:${fw.remotePort}`,
                subtitle: "close it",
                arg: `port:close ${servers.find(s => s.value === fw.serverName)?.value} ${fw.localPort}:${fw.remotePort}`,
                autocomplete: `port:close ${servers.find(s => s.value === fw.serverName)?.value} ${fw.localPort}:${fw.remotePort}`,
            });
        });
        if (candidates.length === 0) {
            candidates.push({
                title: "No open port forwarding",
            });
        }
    } else
        for (const serverConfig of servers) {
            if (!serverName || serverConfig.value.startsWith(serverName)) {
                candidates.push({
                    title: `${action} local port forwarding from remote server '${serverConfig.value}'`,
                    subtitle: `ssh port:${action} ${serverConfig.value} ${args.join(" ")}`,
                    arg: `port:${action} ${serverConfig.value} ${args.join(" ")}`,
                    autocomplete: `port:${action} ${serverConfig.value} ${args.join(" ")}`,
                });
            }
        }
    return candidates;
}

function getAlfredCandidates(args: string[]): ScriptFilterJsonFormat[] {
    if (args.length < 1) {
        return [];
    }
    const candidates: ScriptFilterJsonFormat[] = [];
    const cmd = args[0];
    if (!cmd) {
        candidates.push(
            {
                title: "open shell on remote server",
                subtitle: "Usage: shell serverName",
                autocomplete: "shell",
            },
            {
                title: "open local port forwarding from remote server",
                subtitle: "Usage: port:open serverName remotePort:localPort",
                autocomplete: "port:open",
            },
            {
                title: "close local port forwarding from remote server",
                subtitle: "Usage: port:close serverName remotePort:localPort",
                autocomplete: "port:close",
            },
            {
                title: "list opening local port forwards from remote server",
                subtitle: "Usage: port:list",
                arg: "port:list",
                autocomplete: "port:list",
            },
        );
    } else if ("shell".startsWith(cmd)) {
        candidates.push(...buildShellCandidates(args[1]));
    } else if ("port".startsWith(cmd)) {
        candidates.push(...buildPortCandidates());
    } else if ("port:open".startsWith(cmd)) {
        candidates.push(...buildPortCandidates("open", args[1], args.slice(2)));
    } else if ("port:close".startsWith(cmd)) {
        candidates.push(...buildPortCandidates("close", args[1], args.slice(2)));
    } else if ("port:list".startsWith(cmd)) {
        candidates.push(...buildPortCandidates("list", args[1]));
    } else {
        throw new Error(`ssh-server command '${cmd}' is not supported`);
    }

    return candidates;
}

(async () => {
    const args = alfy.input.split(" ").filter(value => value.length > 0);

    if (args.length >= 1) {
        try {
            const candidates = getAlfredCandidates(args);
            candidates.length > 0 && alfy.output(candidates);
        } catch (e) {
            alfy.error(e);
        }
    }
})();
