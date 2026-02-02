import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    tanstackStart({
      tsr: {
        appDirectory: './src',
      },
    }),
    nitro(),
    react(),
  ],
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
