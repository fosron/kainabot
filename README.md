# Kainabot

Kainabot is a Python script that tracks the prices of selected products from Lithuanian price comparison websites and sends Telegram notifications when prices change.

## Features
- Scrapes product prices from multiple websites
- Notifies you via Telegram when prices change or new products are tracked
- Easy configuration using a `.env` file

## Setup
1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Copy and edit the environment file:**
   ```bash
   cp .env.example .env
   # Then fill in your Telegram token, chat ID, and product names/URLs
   ```
4. **Run the script:**
   ```bash
   python main.py
   ```

## Environment Variables
- `TELEGRAM_TOKEN`: Your Telegram bot token
- `TELEGRAM_CHAT_ID`: Your Telegram chat ID
- `PRODUCT_NAMES`: Comma-separated list of product names
- `PRODUCT_URLS`: Comma-separated list of product URLs (order must match names)

## Notes
- The script stores the last known prices in `prices.json` (ignored by git).
- Make sure your bot has permission to message your chat.

## License
MIT
