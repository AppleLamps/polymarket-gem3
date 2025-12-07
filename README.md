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
2. Configure your AI.dev/AI Studio gateway credentials in `.env.local`:

   ```
   VITE_GEMINI_GATEWAY_URL=<https://your-ai-dev-app-gateway-url>
   VITE_GEMINI_GATEWAY_KEY=<optional api key if the gateway requires one>
   ```

3. Run the app:
   `npm run dev`
