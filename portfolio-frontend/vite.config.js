import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ command, mode }) => {
  const apiUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_CHATBOT_API_URL?.trim();
  if (command === 'build' && mode === 'production' && apiUrl) {
    let parsed;
    try { parsed = new URL(apiUrl); } catch { throw new Error('VITE_CHATBOT_API_URL must be an HTTPS origin.'); }
    if (parsed.protocol !== 'https:' || parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) {
      throw new Error('VITE_CHATBOT_API_URL must be an HTTPS origin without a path.');
    }
  }
  return {
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  }
  };
});
