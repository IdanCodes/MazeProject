import { app, BrowserWindow } from "electron";
import { WebSocket, WebSocketServer } from "ws";
import * as net from "net";
import * as path from "path";

let mainWindow: BrowserWindow | null = null;

// Configs
const WS_PORT = 8080;
const TCP_HOST = "127.0.0.1";
const TCP_PORT = 3003;
const MESSAGE_DELIMITER = "\n";

function startProxy() {
  const wss = new WebSocketServer({ port: WS_PORT });

  wss.on("connection", (ws: WebSocket) => {
    const tcpClient = new net.Socket();

    tcpClient.connect(TCP_PORT, TCP_HOST, () => {
      console.log("TCP connection established");
    });

    ws.on("message", (data: WebSocket.Data) => {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
      tcpClient.write(buffer, (err) => {
        console.error("tcpClient write error:", err);
      });
    });

    let buffer = "";
    tcpClient.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();

      const parts = buffer.split(MESSAGE_DELIMITER);

      buffer = parts.pop() || "";

      parts.forEach((message) => {
        if (message.trim()) ws.send(message);
      });
    });

    ws.on("close", () => {
      tcpClient.destroy();
      console.log("Destroy: wsClient close");
    });
    tcpClient.on("close", () => {
      ws.close();
      console.log("Close - tcpClient close");
    });
    tcpClient.on("error", (err) => {
      ws.close();
      console.log("Close - tcpClient error", err);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
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
    mainWindow.loadFile(indexPath);
  } else {
    // DEVELOPMENT: Load from Vite dev server
    mainWindow.loadURL("http://localhost:5173");
  }
}

app.whenReady().then(() => {
  startProxy();
  createWindow();
});
