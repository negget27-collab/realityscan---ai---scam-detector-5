/**
 * Inicia o backend (server.js) em background e depois o Vite (dev).
 * Abre o app no navegador do sistema (não no Cursor/VS Code).
 * Use: node dev-with-server.js
 * Ou: npm run dev:full
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { spawn, exec } from "child_process";
import { createConnection } from "net";
import { platform } from "os";
import kill from "kill-port";

function openBrowser(url) {
  const cmd = platform() === "win32" ? `start "" "${url}"` : platform() === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, (err) => err && console.warn("Não foi possível abrir o navegador:", err.message));
}

const PORT = process.env.PORT || 3001;
const VITE_PORT = 5173;

// Libera as portas se estiverem em uso (evita EADDRINUSE e Vite usar porta errada)
await kill(PORT).catch(() => {});
await kill(VITE_PORT).catch(() => {});

function waitForPort(port, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      const socket = createConnection(port, "127.0.0.1", () => {
        socket.destroy();
        resolve();
      });
      socket.on("error", () => {
        if (Date.now() - start > timeout) reject(new Error(`Porta ${port} não respondeu a tempo`));
        else setTimeout(tryConnect, 300);
      });
    };
    tryConnect();
  });
}

const server = spawn("node", ["server.js"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PORT: String(PORT) },
});

server.on("error", (err) => {
  console.error("Erro ao iniciar server.js:", err);
  process.exit(1);
});

console.log("Aguardando backend na porta", PORT, "...");
waitForPort(PORT)
  .then(async () => {
    console.log("Backend pronto. Iniciando Vite...\n");
    const vite = spawn("node", ["./node_modules/vite/bin/vite.js"], {
      stdio: "inherit",
      shell: true,
    });
    vite.on("exit", (code) => {
      server.kill();
      process.exit(code ?? 0);
    });
    process.on("SIGINT", () => {
      server.kill();
      vite.kill();
      process.exit(0);
    });
    // Aguarda Vite ficar pronto e abre no navegador do sistema
    await waitForPort(VITE_PORT).catch(() => {});
    const url = `http://localhost:${VITE_PORT}`;
    openBrowser(url);
  })
  .catch((err) => {
    console.error(err.message);
    server.kill();
    process.exit(1);
  });
