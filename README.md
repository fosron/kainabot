# Kainabot

Kainabot is a desktop application built with Electron that tracks the prices of selected products from Lithuanian price comparison websites. It features a modern UI for managing tracked products and also supports Telegram notifications when prices change.

## Features
- Desktop UI for tracking and viewing product prices
- Scrapes product prices from multiple websites
- Notifies you via Telegram when prices change or new products are tracked
- Easy configuration and management
- Dark mode and responsive design

## Setup
1. **Clone the repository**
2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```
3. **Install Python dependencies (required for data fetching):**
   ```bash
   pip install -r requirements.txt
   ```
4. **Configure environment variables (for Telegram notifications in the Electron app):**
   - Copy `.env.example` to `.env` and fill in your Telegram token, chat ID, and product names/URLs. These are used by the Electron app for notifications and product tracking.
5. **Run the Electron app (main entry point):**
   ```bash
   npm start
   ```
   This will launch the Kainabot desktop UI, which uses the Python script in the background to fetch prices and sends Telegram notifications if enabled.
6. *(Optional)* **Run the Python script directly (scraping only, no notifications or UI):**
   If you only want to scrape and save prices to `prices.json` without notifications or UI:
   ```bash
   python main.py
   ```

## Environment Variables (used by Electron app for Telegram)
- `TELEGRAM_TOKEN`: Your Telegram bot token
- `TELEGRAM_CHAT_ID`: Your Telegram chat ID
- `PRODUCT_NAMES`: Comma-separated list of product names
- `PRODUCT_URLS`: Comma-separated list of product URLs (order must match names)

## Notes
- The app stores the last known prices in `prices.json` (ignored by git).
- Make sure your bot has permission to message your chat if using Telegram notifications.

## License
MIT
