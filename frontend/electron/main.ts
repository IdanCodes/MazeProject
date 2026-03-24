import { app, BrowserWindow } from "electron";
import * as WebSocket from "ws";
import * as net from "net";
import * as path from "path";

let mainWindow: BrowserWindow | null = null;

// Configs
const WS_PORT = 8080;
const TCP_HOST = "127.0.0.1";
const TCP_PORT = 5000;

// function startProxy() {
//   const wss = new WebSocket.Server({ port: WS_PORT });

//   wss.on("connection", (ws: WebSocket) => {
//     const tcpClient = new net.Socket();

//     tcpClient.connect(TCP_PORT, TCP_HOST);

//     ws.on("message", (data: WebSocket.Data) => {
//       const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
//       tcpClient.write(buffer);
//     });

//     tcpClient.on("data", (data: Buffer) => {
//       ws.send(data);
//     });

//     ws.on("close", () => tcpClient.destroy());
//     tcpClient.on("close", () => ws.close());
//     tcpClient.on("error", () => ws.close());
//   });
// }

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Security best practices
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    // PRODUCTION: Load the static files created by Vite
    // Assuming main.ts is compiled to a 'dist-electron' folder
    const indexPath = path.join(__dirname, "..", "dist", "index.html");
    console.log(indexPath);
    mainWindow.loadFile(indexPath);
  } else {
    // DEVELOPMENT: Load from Vite dev server
    console.log("http://localhost:5173");
    mainWindow.loadURL("http://localhost:5173");
  }
}

app.whenReady().then(() => {
  //   startProxy();
  createWindow();
});
