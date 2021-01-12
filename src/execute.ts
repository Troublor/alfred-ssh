import {
    closePortForwards,
    ForwardPattern,
    openPortForwards,
} from "./lib";

const args = process.argv;

if (args.length >= 5) {
    const [, , action, serverName, ...forwards] = args;
    let fws: ForwardPattern[] = [];
    for (const f of forwards) {
        const sec = f.split(":");
        if (sec.length !== 2) {
            continue;
        }
        fws.push({
            serverName: serverName,
            localAddress: "localhost",
            localPort: parseInt(sec[0]),
            remoteAddress: "localhost",
            remotePort: parseInt(sec[1]),
        });
    }
    const output: string[] = [];
    switch (action) {
    case "port:open":
        fws = openPortForwards(fws);
        break;
    case "port:close":
        fws = closePortForwards(fws);
        break;
    }
    for (const fw of fws) {
        if (fw.error) {
            output.push(`Failed: ${action}, localhost:${fw.localPort}->${fw.serverName}:${fw.remotePort}, ${fw.error}`);
        } else {
            output.push(`Success: ${action}, localhost:${fw.localPort}->${fw.serverName}:${fw.remotePort}`);
        }
    }
    console.log(output.join("\n"));
}
