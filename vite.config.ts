
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Setting base to './' allows the app to be deployed to GitHub Pages
  base: './',
  define: {
    // This allows the build process to grab the API KEY from GitHub Secrets
    // and "bake" it into the web app securely for the static site.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});
