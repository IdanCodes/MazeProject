import { app, BrowserWindow } from "electron";
import { WebSocket, WebSocketServer } from "ws";
import * as net from "net";
import * as path from "path";
import * as crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { IncomingMessage } from "http";

let mainWindow: BrowserWindow | null = null;

// Configs
const DEV_BASE_URL = "http://localhost:5173";
const TCP_HOST = "127.0.0.1";
const TCP_PORT = 3003;
const NONCE_BYTE_SIZE = 12;
const secretToken = uuidv4();
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

function encryptWithAES(aesKey: Buffer, msgStr: string): Buffer<ArrayBuffer> {
  // 1. Encrypt the plaintext UI message with AES-GCM
  const nonce = crypto.randomBytes(NONCE_BYTE_SIZE);
  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, nonce);

  let ciphertext = cipher.update(msgStr, "utf-8");
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // 2. Assemble payload: [Nonce (12B)] + [Ciphertext (Var)] + [Tag (16B)]
  const encryptedPayload = Buffer.concat([nonce, ciphertext, authTag]);

  // 3. Prepend 4-byte big-endian length prefix and send via TCP
  const lengthHeader = Buffer.alloc(4);
  lengthHeader.writeUInt32BE(encryptedPayload.length, 0);

  return Buffer.concat([lengthHeader, encryptedPayload]);
}

function startProxy(port: number, onFinishHandshake: () => void) {
  const wss = new WebSocketServer({ port });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "", `http://localhost:${port}`);
    if (url.searchParams.get("token") !== secretToken) {
      console.error("Unauthorized connection attempt!");
      ws.terminate();
      return;
    }

    const tcpClient = new net.Socket();

    // --- Cryptography State ---
    let aesKey: Buffer | null = null;
    let tcpBuffer: Buffer = Buffer.alloc(0);

    console.log("Connecting");
    tcpClient.connect(TCP_PORT, TCP_HOST, () => {
      console.log("TCP connection established with Game Server");
      // OPTIMIZATION: Disable Nagle's Algorithm for real-time game traffic speed
      // tcpClient.setNoDelay(true);
    });

    // --- Outbound: UI -> Electron -> Game Server ---
    ws.on("message", (data: WebSocket.Data) => {
      if (!aesKey) {
        console.warn(
          "Dropped outbound message: Handshake with server not completed yet.",
        );
        return;
      }

      // Ensure data is converted to string from frontend
      const msgStr = data.toString();

      try {
        const payload: Buffer<ArrayBuffer> = encryptWithAES(aesKey, msgStr);
        tcpClient.write(payload, (err) => {
          if (err) console.error("TCP Encrypted Write Error:", err);
        });
      } catch (err) {
        console.error("Encryption failed:", err);
      }
    });

    // --- Inbound: Game Server -> Electron -> UI ---
    tcpClient.on("data", (chunk: Buffer) => {
      // Append raw incoming TCP chunks to our local stream buffer
      tcpBuffer = Buffer.concat([tcpBuffer, chunk]);

      // Process all completely arrived frames out of the stream
      while (tcpBuffer.length >= 4) {
        const msgLen = tcpBuffer.readUInt32BE(0);

        if (tcpBuffer.length < 4 + msgLen) {
          // Full payload packet hasn't arrived yet; exit loop and wait for more chunks
          break;
        }

        // Slice the exact frame payload out of the buffer
        const payload = tcpBuffer.subarray(4, 4 + msgLen);
        tcpBuffer = tcpBuffer.subarray(4 + msgLen); // Shift buffer forward

        if (!aesKey) {
          // HANDSHAKE PHASE: Treat this first payload frame as the Server's RSA Public Key
          try {
            console.log("Received RSA Public Key from Python Server.");
            const publicKeyPem = payload.toString("utf-8");

            // 1. Generate a secure, symmetric 256-bit AES key for the session
            aesKey = crypto.randomBytes(32);

            // 2. Encrypt the session key using the server's public key (OAEP Padding with SHA256)
            const encryptedAesKey = crypto.publicEncrypt(
              {
                key: publicKeyPem,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256",
              },
              aesKey,
            );

            // 3. Send encrypted AES Key back to the server using the 4-byte framing system
            const handshakeHeader = Buffer.alloc(4);
            handshakeHeader.writeUInt32BE(encryptedAesKey.length, 0);

            tcpClient.write(Buffer.concat([handshakeHeader, encryptedAesKey]));
            console.log(
              "Sent Encrypted AES Key to server. Handshake complete.",
            );
            ws.send(WS_CONNECTED_MSG);
            onFinishHandshake();
          } catch (err) {
            console.error("Handshake negotiation failed:", err);
            ws.send(`ERROR! Handshake negotiation failed - ${err}}`);
            ws.close();
            tcpClient.destroy();
          }
        } else {
          // GAMEPLAY PHASE: Decrypt the payload using our established AES Key
          try {
            const nonce = payload.subarray(0, 12);
            const encryptedData = payload.subarray(12);

            // Python sticks the 16-byte authentication tag onto the tail end of the ciphertext
            const ciphertext = encryptedData.subarray(
              0,
              encryptedData.length - 16,
            );
            const authTag = encryptedData.subarray(encryptedData.length - 16);

            const decipher = crypto.createDecipheriv(
              "aes-256-gcm",
              aesKey,
              nonce,
            );
            decipher.setAuthTag(authTag);

            let decryptedStr = decipher.update(ciphertext, undefined, "utf-8");
            decryptedStr += decipher.final("utf-8");

            // 4. Relay the clean, decrypted plain text straight up to your UI via WebSocket
            if (decryptedStr.trim()) {
              ws.send(decryptedStr);
            }
          } catch (err) {
            console.error(
              "Decryption failed! Packet dropped (possible data tampering):",
              err,
            );
          }
        }
      }
    });

    // --- Connection Cleanup Layout ---
    ws.on("close", () => {
      tcpClient.destroy();
      console.log("WS Local Connection Closed");
    });
    tcpClient.on("close", () => {
      console.log("TCP Remote Connection Closed");
      ws.send("Could not connect to server. Check if it's running!");
      ws.close();
    });
    tcpClient.on("error", (err) => {
      ws.close();
      console.error("TCP Client Error:", err.message);
    });
  });
}

function createWindow(port: number) {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    const indexPath = path.join(__dirname, "..", "dist", "index.html");
    mainWindow.loadFile(indexPath);
  } else {
    const devUrl = `${DEV_BASE_URL}?wsPort=${port}&wsToken=${secretToken}`;
    mainWindow.loadURL(devUrl);
  }
}

app.whenReady().then(async () => {
  const port = await getFreePort();
  startProxy(port, () => {});
  createWindow(port);
});
