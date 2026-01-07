import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    tanstackStart({
      tsr: {
        appDirectory: './src',
      },
    }),
    react(),
  ],
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
    },
  },
})
