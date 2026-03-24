import { app, BrowserWindow } from "electron";
import * as path from "path";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
function createWindow() {
  const mainWindow2 = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Security best practices
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (app.isPackaged) {
    const indexPath = path.join(__dirname, "..", "dist", "index.html");
    console.log(indexPath);
    mainWindow2.loadFile(indexPath);
  } else {
    console.log("http://localhost:5173");
    mainWindow2.loadURL("http://localhost:5173");
  }
}
app.whenReady().then(() => {
  createWindow();
});
