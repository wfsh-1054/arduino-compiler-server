import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const isHttps = fs.existsSync(path.resolve(__dirname, '../server.key'))

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: isHttps ? 'https://127.0.0.1:3000' : 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false // 允許 self-signed 憑證
      }
    }
  }
})
