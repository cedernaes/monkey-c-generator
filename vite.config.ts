import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The GitHub Pages workflow sets BASE_PATH to "/<repo name>/" so the built app
// works from https://<user>.github.io/<repo name>/. Locally it is "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
