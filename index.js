const { menubar } = require("menubar");
const path = require("path");
const { ipcMain, nativeTheme, app, shell } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");

async function startApp() {
  const Store = (await import("electron-store")).default;
  const store = new Store();

  const defaultSettings = {
    productNames: "",
    productUrls: "",
    telegramToken: "",
    telegramChatId: "",
  };

  const getSettings = () => {
    return store.get('settings', defaultSettings);
  };

  const validateSettings = (settings) => {
    return settings.productNames && settings.productUrls;
  };

  const setSettings = (newSettings) => {
    store.set('settings', newSettings);
  };

  let bot; // Declare bot here, initialize later

  // Initialize bot only if token is available
  const currentSettings = getSettings();
  if (currentSettings.telegramToken) {
    bot = new TelegramBot(currentSettings.telegramToken);
  }

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

    const initialConfig = getAutoReloadConfig();
    const currentSettings = getSettings();
    if (initialConfig.enabled && validateSettings(currentSettings)) {
      startAutoReload(initialConfig.intervalHours);
    }

    // Check if essential settings are configured on app start
    if (!validateSettings(currentSettings)) {
      // Defer sending the event until the window is guaranteed to be created
      mb.once('after-create-window', () => {
        if (mb.window && !mb.window.isDestroyed()) {
          mb.window.webContents.send('show-settings-page');
        }
      });
    }
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

  function getPythonExecutablePath() {
    let pythonExecutablePath;
    if (app.isPackaged) {
      // In a packaged app, the Python executable will be in a specific location
      // relative to the app's resources.
      if (process.platform === 'darwin') {
        // macOS: Contents/Resources/python/dist/main
        pythonExecutablePath = path.join(process.resourcesPath, 'python', 'dist', 'main');
      } else if (process.platform === 'win32') {
        // Windows: resources/python/dist/main.exe
        pythonExecutablePath = path.join(process.resourcesPath, 'python', 'dist', 'main.exe');
      } else {
        // Linux: resources/python/dist/main
        pythonExecutablePath = path.join(process.resourcesPath, 'python', 'dist', 'main');
      }
    } else {
      // In development, assume python3 is in the PATH and main.py is in the current directory
      pythonExecutablePath = 'python3';
    }
    return pythonExecutablePath;
  }

  function getPythonScriptArgs(settings) {
    const args = [];
    if (!app.isPackaged) {
      args.push('main.py'); // In development, run the script directly
    }
    args.push('--product_names', settings.productNames);
    args.push('--product_urls', settings.productUrls);
    args.push('--telegram_token', settings.telegramToken);
    args.push('--telegram_chat_id', settings.telegramChatId);
    return args;
  }

  function runPythonScraper(settings) {
    return new Promise((resolve, reject) => {
      const pythonExecutable = getPythonExecutablePath();
      const pythonArgs = getPythonScriptArgs(settings);

      console.log(`Attempting to run Python executable: ${pythonExecutable} with args: ${pythonArgs.join(' ')}`);

      const pythonProcess = spawn(pythonExecutable, pythonArgs);

      let pythonStdout = '';
      let pythonStderr = '';

      pythonProcess.stdout.on("data", (data) => {
        pythonStdout += data.toString();
        console.log(`Python stdout: ${data.toString()}`);
      });

      pythonProcess.stderr.on("data", (data) => {
        pythonStderr += data.toString();
        console.error(`Python stderr: ${data.toString()}`);
      });

      pythonProcess.on("close", (code) => {
        if (code === 0) {
          console.log("Python script finished successfully.");
          try {
            const parsedData = JSON.parse(pythonStdout);
            resolve(parsedData);
          } catch (parseError) {
            console.error(`Error parsing Python stdout as JSON: ${parseError.message}. Raw stdout: ${pythonStdout}`);
            reject(new Error(`Failed to parse Python output: ${parseError.message}`));
          }
        } else {
          console.error(`Python script exited with code ${code}. Stdout: ${pythonStdout}. Stderr: ${pythonStderr}`);
          reject(new Error(`Python script exited with code ${code}. Stderr: ${pythonStderr}`));
        }
      });

      pythonProcess.on('error', (err) => {
        console.error(`Failed to start Python process: ${err.message}`);
        reject(err);
      });
    });
  }

  async function checkPrices() {
    const settings = getSettings();
    if (!validateSettings(settings)) {
      console.log("Settings not configured. Skipping price check.");
      return { currentPrices: {}, URLS: {} };
    }

    const lastPrices = store.get("prices", {});
    console.log("Attempting to run Python scraper...");
    let currentPrices = {};
    try {
      currentPrices = await runPythonScraper(settings);
      console.log("Python scraper returned data:", currentPrices);
    } catch (error) {
      console.error("Error running Python scraper:", error);
      // If scraper fails, return empty prices and let the UI handle the error
      return { currentPrices: {}, URLS: {}, error: error.message };
    }

    const messages = [];

    const URLS = settings.productNames.split(",").reduce((acc, name, index) => {
      acc[name.trim()] = settings.productUrls.split(",")[index].trim();
      return acc;
    }, {});

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

    if (messages.length > 0 && settings.telegramToken && settings.telegramChatId) {
      // Re-initialize bot if token changed or was not set initially
      if (!bot || bot.token !== settings.telegramToken) {
        bot = new TelegramBot(settings.telegramToken);
      }
      bot.sendMessage(settings.telegramChatId, messages.join("\n"));
    }

    return { currentPrices, URLS };
  }

  ipcMain.handle("get-prices", async () => {
    return await checkPrices();
  });

  ipcMain.handle("get-initial-prices", async () => {
    const initialPrices = store.get("prices", {});
    const settings = getSettings();
    if (!validateSettings(settings)) {
      return { currentPrices: {}, URLS: {}, needsSetup: true };
    }
    const URLS = settings.productNames.split(",").reduce((acc, name, index) => {
      acc[name.trim()] = settings.productUrls.split(",")[index].trim();
      return acc;
    }, {});
    return { currentPrices: initialPrices, URLS, needsSetup: false };
  });

  ipcMain.handle('get-settings', () => {
    return getSettings();
  });

  ipcMain.on('set-settings', (event, newSettings) => {
    setSettings(newSettings);
    // Re-initialize bot if token changed
    if (newSettings.telegramToken && (!bot || bot.token !== newSettings.telegramToken)) {
      bot = new TelegramBot(newSettings.telegramToken);
    }
    // After settings are saved, re-evaluate auto-reload and potentially trigger a price check
    const currentConfig = getAutoReloadConfig();
    if (currentConfig.enabled && validateSettings(newSettings)) {
      startAutoReload(currentConfig.intervalHours);
    } else {
      stopAutoReload();
    }
    // Trigger a price check after settings are saved
    checkPrices();
  });

  ipcMain.on('show-settings-page', () => {
    if (mb.window && !mb.window.isDestroyed()) {
      mb.window.webContents.send('show-settings-page');
    } else {
      // If the window is not ready, wait for it to be ready
      mb.on('ready', () => {
        if (mb.window && !mb.window.isDestroyed()) {
          mb.window.webContents.send('show-settings-page');
        }
      });
    }
  });
}

startApp();
