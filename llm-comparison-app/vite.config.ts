import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      // Expose env variables to your app
      __OPENAI_API_KEY__: JSON.stringify(env.VITE_OPENAI_API_KEY || ''),
      __TOGETHER_API_KEY__: JSON.stringify(env.VITE_TOGETHER_API_KEY || '')
    }
  }
})
