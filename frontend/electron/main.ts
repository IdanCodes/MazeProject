import { app, BrowserWindow } from "electron";
import { WebSocket, WebSocketServer } from "ws";
import * as net from "net";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { IncomingMessage } from "http";

let mainWindow: BrowserWindow | null = null;

// Configs
const DEV_BASE_URL = "http://localhost:5173";
const TCP_HOST = "127.0.0.1";
const TCP_PORT = 3003;
const MESSAGE_DELIMITER = "\n";
const secretToken = uuidv4();

/**
 * Finds an available port provided by the OS.
 * @returns {Promise<number>} The available port number.
 */
async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.on("error", (err) => {
      reject(new Error(`Could not find a free port: ${err.message}`));
    });

    // Listen on port 0: The OS will assign the first available dynamic port
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      // Safety check for TypeScript
      if (address && typeof address !== "string") {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close(() =>
          reject(new Error("Invalid address returned from server.")),
        );
      }
    });
  });
}

function startProxy(port: number) {
  const wss = new WebSocketServer({ port });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "", `http://localhost:${port}`);
    if (url.searchParams.get("token") !== secretToken) {
      console.error("Unauthorized connection attempt!");
      ws.terminate();
      return;
    }

    const tcpClient = new net.Socket();

    tcpClient.connect(TCP_PORT, TCP_HOST, () => {
      console.log("TCP connection established");
    });

    ws.on("message", (data: WebSocket.Data) => {
      data += MESSAGE_DELIMITER;
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
      tcpClient.write(buffer, (err) => {
        if (err) console.error("TCP Write Error:", err);
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
      console.log("WS Closed Connection");
    });
    tcpClient.on("close", () => {
      ws.close();
      console.log("TCP Closed Connection");
    });
    tcpClient.on("error", (err) => {
      ws.close();
      console.log(`TCP Error:`, err);
    });
  });
}

function createWindow(port: number) {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
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
    const devUrl = `${DEV_BASE_URL}?wsPort=${port}&wsToken=${secretToken}`;
    mainWindow.loadURL(devUrl);
  }
}

app.whenReady().then(async () => {
  const port = await getFreePort();
  startProxy(port);
  createWindow(port);
});
