import * as path from "path";
import * as fs from "fs";
import {HostConfig} from "ssh-config";
import * as sshConfig from "ssh-config";
import * as os from "os";
import {Command} from "@troubkit/cmd";
import * as child_process from "child_process";

export function getSocketsDir(): string {
    const sockets = path.join(__dirname, "..", "..", "sockets");
    if (!fs.existsSync(sockets)) {
        fs.mkdirSync(sockets, {recursive: true});
    }
    return sockets;
}

export interface ForwardPattern {
    serverName: string,
    localAddress: string,
    localPort: number,
    remoteAddress: string,
    remotePort: number,
    socket?: string,
    error?: string,
}

export function getCurrentlyOpeningForwards(): ForwardPattern[] {
    const socket = getSocketsDir();
    const patterns: ForwardPattern[] = [];
    if (fs.existsSync(socket) && fs.statSync(socket).isDirectory()) {
        for (const s of fs.readdirSync(socket)) {
            const ss = s.split(".");
            const secs = ss[0].split("-");
            if (secs.length === 4) {
                patterns.push({
                    serverName: ss[1],
                    localAddress: secs[0],
                    localPort: parseInt(secs[1]),
                    remoteAddress: secs[2],
                    remotePort: parseInt(secs[3]),
                    socket: s,
                });
            }
        }
    }
    return patterns;
}

export const sshConfigFile = path.join(os.homedir(), ".ssh", "config");

export function getServerConfigs(serverName?: string): HostConfig[] {
    const candidates: HostConfig[] = [];
    const config = sshConfig.parse(fs.readFileSync(sshConfigFile, {encoding: "utf-8"}));
    for (const option of config) {
        if (option.param === "Host"
            && (!serverName || option.value.startsWith(serverName))) {
            candidates.push(option as HostConfig);
        }
    }
    return candidates;
}


export function genForwardSocket(fw: ForwardPattern): string {
    return path.join(`${fw.localAddress}-${fw.localPort}-${fw.remoteAddress}-${fw.remotePort}.${fw.serverName}`);
}

export function openPortForwards(forwards: ForwardPattern[]): ForwardPattern[] {
    const logFile = path.join(getSocketsDir(), "ssh.log");
    for (const fw of forwards) {
        const socket = genForwardSocket(fw);
        if (fs.existsSync(path.join(getSocketsDir(), socket))) {
            // the port is previously opened
            fw.error = "already forwarded";
            continue;
        }
        const fCmd = new Command("ssh")
            .append("-E", logFile)
            .append("-fN -M")
            .append("-S", socket)
            .append(`-L ${fw.localAddress}:${fw.localPort}:${fw.remoteAddress}:${fw.remotePort}`)
            .append(fw.serverName);

        // clear log file
        if (fs.existsSync(logFile)) {
            fs.unlinkSync(logFile);
        }

        const r = child_process.spawnSync(fCmd.command, fCmd.args, {
            stdio: "inherit",
            env: process.env,
            cwd: getSocketsDir(),
        });
        if (r.error) {
            fw.error = r.error.message;
        } else if (r.status != 0) {
            fw.error = `ssh exit with code ${r.status}`;
        } else {
            // check log file
            const log = fs.readFileSync(logFile, {encoding: "utf-8"});
            for (const line of log.split("\n").filter(v => v.length > 0)) {
                if (line.includes("Address already in use")) {
                    fw.error = line;
                }
            }
        }
        if (fw.error) {
            if (fs.existsSync(path.join(getSocketsDir(), socket))) {
                fs.unlinkSync(path.join(getSocketsDir(), socket));
            }
        }
    }
    return forwards;
}

export function closePortForwards(forwards: ForwardPattern[]): ForwardPattern[] {
    const logFile = path.join(getSocketsDir(), "ssh.log");
    for (const fw of forwards) {
        const socket = genForwardSocket(fw);
        if (!fs.existsSync(path.join(getSocketsDir(), socket))) {
            // the port is previously opened
            fw.error = "not forwarded";
            continue;
        }
        const fCmd = new Command("ssh")
            .append("-E", logFile)
            .append("-S", socket)
            .append("-O exit")
            .append(fw.serverName);

        // clear log file
        if (fs.existsSync(logFile)) {
            fs.unlinkSync(logFile);
        }

        const r = child_process.spawnSync(fCmd.command, fCmd.args, {
            stdio: "inherit",
            env: process.env,
            cwd: getSocketsDir(),
        });
        if (r.error) {
            fw.error = r.error.message;
        } else if (r.status != 0) {
            // check log file
            if (!fw.error) {
                fw.error = `ssh exit with code ${r.status}`;
            }
        }
    }
    return forwards;
}
