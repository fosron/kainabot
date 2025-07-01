const { menubar } = require("menubar");
const path = require("path");
const { ipcMain, nativeTheme, app, shell } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

async function startApp() {
  const Store = (await import("electron-store")).default;
  const store = new Store();

  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  const bot = new TelegramBot(TELEGRAM_TOKEN);

  const PRODUCT_NAMES = process.env.PRODUCT_NAMES.split(",");
  const PRODUCT_URLS = process.env.PRODUCT_URLS.split(",");
  const URLS = PRODUCT_NAMES.reduce((acc, name, index) => {
    acc[name.trim()] = PRODUCT_URLS[index].trim();
    return acc;
  }, {});

  const getIconPath = () => {
    return nativeTheme.shouldUseDarkColors ? path.join(__dirname, "icon-dark.png") : path.join(__dirname, "icon-light.png");
  };

  const mb = menubar({
    index: `file://${__dirname}/index.html`,
    icon: getIconPath(),
    browserWindow: {
      width: 400,
      height: 600,
      webPreferences: { preload: path.join(__dirname, "preload.js") },
    },
  });

  let autoReloadIntervalId = null;

  const defaultAutoReloadConfig = {
    enabled: false,
    intervalHours: 6,
  };

  const getAutoReloadConfig = () => {
    return store.get('autoReloadConfig', defaultAutoReloadConfig);
  };

  const startAutoReload = (intervalHours) => {
    stopAutoReload(); // Clear any existing interval
    const intervalMs = intervalHours * 60 * 60 * 1000;
    autoReloadIntervalId = setInterval(async () => {
      console.log("Auto-reloading prices...");
      // Trigger a refresh in the UI if the window is open
      if (mb.window && !mb.window.isDestroyed()) {
        mb.window.webContents.send('auto-reload-triggered');
      }
      await checkPrices();
    }, intervalMs);
    console.log(`Auto-reload started with interval: ${intervalHours} hours`);
  };

  const stopAutoReload = () => {
    if (autoReloadIntervalId) {
      clearInterval(autoReloadIntervalId);
      autoReloadIntervalId = null;
      console.log("Auto-reload stopped.");
    }
  };

  mb.on("ready", () => {
    console.log("Menubar app is ready.");
    ipcMain.handle('get-system-theme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    nativeTheme.on('updated', () => {
      mb.tray.setImage(getIconPath());
      mb.window.webContents.send('system-theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    });

    ipcMain.on('close-app', () => {
      app.quit();
    });

    ipcMain.on('open-external-link', (event, url) => {
      shell.openExternal(url);
    });

    ipcMain.handle('get-auto-reload-config', () => {
      return getAutoReloadConfig();
    });

    ipcMain.on('set-auto-reload-config', (event, config) => {
      store.set('autoReloadConfig', config);
      if (config.enabled) {
        startAutoReload(config.intervalHours);
      } else {
        stopAutoReload();
      }
    });

    // Start auto-reload if enabled in config on app start
    const initialConfig = getAutoReloadConfig();
    if (initialConfig.enabled) {
      startAutoReload(initialConfig.intervalHours);
    }
  });

  function runPythonScraper() {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn("python3", ["main.py"]);

      pythonProcess.stdout.on("data", (data) => {
        console.log(`Python stdout: ${data}`);
      });

      pythonProcess.stderr.on("data", (data) => {
        console.error(`Python stderr: ${data}`);
      });

      pythonProcess.on("close", (code) => {
        if (code === 0) {
          console.log("Python script finished successfully.");
          resolve();
        } else {
          console.error(`Python script exited with code ${code}`);
          reject(new Error(`Python script exited with code ${code}`));
        }
      });
    });
  }

  async function checkPrices() {
    const lastPrices = store.get("prices", {});
    await runPythonScraper();
    const currentPrices = JSON.parse(fs.readFileSync("prices.json"));
    const messages = [];

    for (const [product, price] of Object.entries(currentPrices)) {
      if (lastPrices[product] && price !== lastPrices[product]) {
        messages.push(
          `Price change for ${product}: ${lastPrices[product]}€ → ${price}€`
        );
      } else if (!lastPrices[product]) {
        messages.push(`New product tracked: ${product} at ${price}€`);
      }
    }

    store.set("prices", currentPrices);

    if (messages.length > 0) {
      bot.sendMessage(TELEGRAM_CHAT_ID, messages.join("\n"));
    }

    return { currentPrices, URLS };
  }

  ipcMain.handle("get-prices", async () => {
    return await checkPrices();
  });

  ipcMain.handle("get-initial-prices", async () => {
    const initialPrices = store.get("prices", {});
    return { currentPrices: initialPrices, URLS };
  });
}

startApp();
