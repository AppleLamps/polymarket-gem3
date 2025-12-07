<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/19ctDflTc0vvaYE3Ipl1rAZSFUb4C9Cs2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` (or `.env`) in the project root and set:
   ```
   GEMINI_API_KEY=your_key_here
   ```
   Optional environment overrides:
   - `SERVER_PORT` (defaults to `4000`)
   - `VITE_API_PROXY_TARGET` for the dev proxy target (default `http://localhost:4000`)
   - `VITE_API_BASE_URL` for production builds when the API lives on another origin (e.g. `https://api.example.com`)
3. Start both the Vite client and the secure API:
   `npm run dev`
   - Run `npm run dev:client` or `npm run dev:server` individually if needed.
4. Open http://localhost:3000 and the UI will proxy `/api/*` calls to
   the server so the Gemini key never hits the browser bundle.
