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
   pip install -r python/requirements.txt
   ```
4. **Run the Electron app (main entry point):**
   ```bash
   npm start
   ```
   This will launch the Kainabot desktop UI. Upon first launch, you will be prompted to configure your product tracking and Telegram notification settings directly within the app's settings menu.

## Configuration
All application settings, including product names, URLs, Telegram bot token, and chat ID, are now configured directly within the application's settings menu.

## Building for Release
The application can be packaged for macOS, Windows, and Ubuntu using `electron-builder` and PyInstaller. A GitHub Actions workflow automates this process on new GitHub Releases.

To create a new release:
1. Tag your commit (e.g., `git tag -a v1.0.0 -m "Release v1.0.0"`).
2. Push the tag to GitHub (`git push origin v1.0.0`).
3. Create a new release on GitHub from the pushed tag.

The GitHub Actions workflow will then build and attach the platform-specific executables to your release.

## Notes
- The app stores the last known prices and user settings locally.
- Ensure your Telegram bot has permission to message your chat if using Telegram notifications.

## License
MIT
