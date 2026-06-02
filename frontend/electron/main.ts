import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from "electron";
import { WebSocket, WebSocketServer } from "ws";
import * as net from "net";
import * as path from "path";
import * as crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { IncomingMessage } from "http";
import { pathToFileURL, fileURLToPath } from "url";
import * as fs from 'fs';

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadConfig(): {
  SERVER_ADDR: string;
  SERVER_PORT: number;
} {
  const CONFIG_FILE = app.isPackaged
    ? path.join(process.resourcesPath, "app_config.json") // Resources folder in production
    : path.join(process.cwd(), "app_config.json"); // Root of project in dev

  try {
    console.log(`Reading config file from: ${CONFIG_FILE}`);

    const rawData = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(rawData);
    
    const isValidAddr = config && typeof config.SERVER_ADDR === "string" && config.SERVER_ADDR.trim() !== "";
    const isValidPort = config && typeof config.SERVER_PORT === "number" && Number.isInteger(config.SERVER_PORT) && config.SERVER_PORT > 0;

    if (!isValidAddr || !isValidPort) {
      console.error("Invalid config file! Expecting SERVER_ADDR: string, SERVER_PORT: positive integer.\nReceived:", config);
      throw new Error("Invalid config file structure.");
    }

    return {
      SERVER_ADDR: config.SERVER_ADDR,
      SERVER_PORT: config.SERVER_PORT
    };
  } catch (error) {
    console.error('Failed to read or parse app_config.json, falling back to defaults:', error);
    
    return {
      SERVER_ADDR: "127.0.0.1",
      SERVER_PORT: 3000
    };
  }
}
// Load 
const loadedConfig = loadConfig();
const TCP_HOST = loadedConfig.SERVER_ADDR;
const TCP_PORT = loadedConfig.SERVER_PORT;

// Config
const DEV_BASE_URL = "http://localhost:5173";
const NONCE_BYTE_SIZE = 12;
const WS_CONNECTED_MSG = "CONNECTED";

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", (err) =>
      reject(new Error(`Could not find a free port: ${err.message}`)),
    );
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
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

function encryptWithAES(aesKey: Buffer, msgStr: string): Buffer {
  const nonce = crypto.randomBytes(NONCE_BYTE_SIZE);
  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, nonce);

  let ciphertext = cipher.update(msgStr, "utf-8");
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  const authTag = cipher.getAuthTag();

  const encryptedPayload = Buffer.concat([nonce, ciphertext, authTag]);

  const lengthHeader = Buffer.alloc(4);
  lengthHeader.writeUInt32BE(encryptedPayload.length, 0);

  return Buffer.concat([lengthHeader, encryptedPayload]);
}

// Pass instance-specific secretToken and server reference down to the proxy
function startProxy(port: number, instanceToken: string, wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "", `http://localhost:${port}`);
    
    // Validate using the specific token generated for THIS window instance
    if (url.searchParams.get("token") !== instanceToken) {
      console.error("Unauthorized connection attempt!");
      ws.terminate();
      return;
    }

    const tcpClient = new net.Socket();
    let aesKey: Buffer | null = null;
    let tcpBuffer: Buffer = Buffer.alloc(0);

    console.log(`Connecting Proxy on Port ${port} to Game Server...`);
    tcpClient.connect(TCP_PORT, TCP_HOST, () => {
      console.log(`TCP connection established with Game Server for port ${port}`);
    });

    ws.on("message", (data: WebSocket.Data) => {
      if (!aesKey) {
        console.warn("Dropped outbound message: Handshake with server not completed yet.");
        return;
      }
      const msgStr = data.toString();
      try {
        const payload = encryptWithAES(aesKey, msgStr);
        tcpClient.write(payload, (err) => {
          if (err) console.error("TCP Encrypted Write Error:", err);
        });
      } catch (err) {
        console.error("Encryption failed:", err);
      }
    });

    tcpClient.on("data", (chunk: Buffer) => {
      tcpBuffer = Buffer.concat([tcpBuffer, chunk]);

      while (tcpBuffer.length >= 4) {
        const msgLen = tcpBuffer.readUInt32BE(0);
        if (tcpBuffer.length < 4 + msgLen) break;

        const payload = tcpBuffer.subarray(4, 4 + msgLen);
        tcpBuffer = tcpBuffer.subarray(4 + msgLen);

        if (!aesKey) {
          try {
            console.log("Received RSA Public Key from Python Server.");
            const publicKeyPem = payload.toString("utf-8");
            aesKey = crypto.randomBytes(32);

            const encryptedAesKey = crypto.publicEncrypt(
              {
                key: publicKeyPem,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256",
              },
              aesKey,
            );

            const handshakeHeader = Buffer.alloc(4);
            handshakeHeader.writeUInt32BE(encryptedAesKey.length, 0);

            tcpClient.write(Buffer.concat([handshakeHeader, encryptedAesKey]));
            console.log("Sent Encrypted AES Key to server. Handshake complete.");
            ws.send(WS_CONNECTED_MSG);
          } catch (err) {
            console.error("Handshake negotiation failed:", err);
            ws.send(`ERROR! Handshake negotiation failed - ${err}`);
            ws.close();
            tcpClient.destroy();
          }
        } else {
          try {
            const nonce = payload.subarray(0, 12);
            const encryptedData = payload.subarray(12);

            const ciphertext = encryptedData.subarray(0, encryptedData.length - 16);
            const authTag = encryptedData.subarray(encryptedData.length - 16);

            const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, nonce);
            decipher.setAuthTag(authTag);

            let decryptedStr = decipher.update(ciphertext, undefined, "utf-8");
            decryptedStr += decipher.final("utf-8");

            if (decryptedStr.trim()) {
              ws.send(decryptedStr);
            }
          } catch (err) {
            console.error("Decryption failed! Packet dropped:", err);
          }
        }
      }
    });

    ws.on("close", () => {
      tcpClient.destroy();
      console.log(`WS Local Connection Closed on port ${port}`);
    });
    tcpClient.on("close", () => {
      console.log(`TCP Remote Connection Closed on port ${port}`);
      ws.send("Could not connect to server. Check if it's running!");
      ws.close();
    });
    tcpClient.on("error", (err) => {
      ws.close();
      console.error("TCP Client Error:", err.message);
    });
  });
}

// Orchestrator function to provision everything a single window instance needs
async function createApplicationInstance() {
  try {
    // 1. Setup instance-specific ports, keys, and sockets
    const port = await getFreePort();
    const instanceToken = uuidv4();
    const wss = new WebSocketServer({ port });

    // 2. Spawn the isolated local proxy connection
    startProxy(port, instanceToken, wss);

    // 3. Spawn the BrowserWindow
    const windowInstance = new BrowserWindow({
      width: 1000,
      height: 700,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Clean up the WebSocket server when this specific window closes
    windowInstance.on("closed", () => {
      wss.close(() => {
        console.log(`WebSocket server on port ${port} gracefully shut down.`);
      });
    });

    // 4. Route UI
    if (app.isPackaged) {
      const indexPath = path.join(__dirname, "..", "dist", "index.html");
      const fileUrl = pathToFileURL(indexPath);

      fileUrl.searchParams.append("wsPort", port.toString());
      fileUrl.searchParams.append("wsToken", instanceToken);

      windowInstance.loadURL(fileUrl.toString());
    } else {
      const devUrl = `${DEV_BASE_URL}?wsPort=${port}&wsToken=${instanceToken}`;
      windowInstance.loadURL(devUrl);
    }
  } catch (error) {
    console.error("Failed to spin up application instance:", error);
  }
}

// --- Native App Layout Menu Controls ---
function setupApplicationMenu() {
  const customTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            createApplicationInstance();
          },
        },
        { type: "separator" },
        { role: "close" }, 
      ],
    },
    {
      role: "editMenu" 
    },
    {
      // Group your individual window actions under a dedicated View menu category
      label: "View",
      submenu: [
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" }
      ]
    },
    {
      role: "windowMenu" 
    }
  ];

  const menu = Menu.buildFromTemplate(customTemplate);
  Menu.setApplicationMenu(menu);
}

// --- App Lifecycles ---
app.whenReady().then(() => {
  setupApplicationMenu();
  createApplicationInstance(); // Start the first window

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createApplicationInstance();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});