
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Carrega variáveis do .env.local e outros (prefixo vazio permite ler chaves sem VITE_)
  const env = loadEnv(mode, process.cwd(), '');
  
  const apiKey = env.VITE_GEMINI_KEY || env.API_KEY || "";
  const openRouterKey = env.OPENROUTER_KEY || env.VITE_OPENROUTER_KEY || "";

  console.log("🛠️ Vite Compilando: Injetando chaves de API no bundle...");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    define: {
      // Injeta de forma explícita para evitar falhas de acesso a objeto process inexistente
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
      'process.env.OPENROUTER_KEY': JSON.stringify(openRouterKey),
      // Fallback para quem usa import.meta.env
      'import.meta.env.VITE_GEMINI_KEY': JSON.stringify(apiKey),
      'import.meta.env.VITE_OPENROUTER_KEY': JSON.stringify(openRouterKey),
    },
    server: {
      headers: { 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' },
      host: true, // permite acesso pelo celular na mesma rede (ex: http://192.168.x.x:5173)
      port: 5173,
      strictPort: false,
      open: false, // desabilitado aqui; dev-with-server.js abre no navegador do sistema
      allowedHosts: [
        'localhost',
        'unfractured-jayne-nonhyperbolically.ngrok-free.dev'
      ],
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
})