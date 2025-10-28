import WebSocket from "ws";

const ws = new WebSocket("https://jeshuad--05cc4594b3a911f0a6600224a6c84d84.web.val.run");
ws.on("open", () => ws.send("ping"));
ws.on("message", (m) => console.log("Got:", m.toString()));
ws.on("error", (err) => console.error("❌", err));

