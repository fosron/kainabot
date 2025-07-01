document.addEventListener('DOMContentLoaded', () => {
  const settingsButton = document.getElementById('settings-button');
  const backButton = document.getElementById('back-button');
  const saveSettingsButton = document.getElementById('save-settings');
  const mainContent = document.getElementById('main-content');
  const settingsPage = document.getElementById('settings-page');

  const productNamesInput = document.getElementById('productNames');
  const productUrlsInput = document.getElementById('productUrls');
  const telegramTokenInput = document.getElementById('telegramToken');
  const telegramChatIdInput = document.getElementById('telegramChatId');

  const autoReloadEnabledCheckbox = document.getElementById('autoReloadEnabled');
  const reloadIntervalInput = document.getElementById('reloadInterval');

  // Function to load settings and populate the form
  async function loadSettings() {
    const settings = await window.electron.getSettings();
    productNamesInput.value = settings.productNames;
    productUrlsInput.value = settings.productUrls;
    telegramTokenInput.value = settings.telegramToken;
    telegramChatIdInput.value = settings.telegramChatId;

    const autoReloadConfig = await window.electron.getAutoReloadConfig();
    autoReloadEnabledCheckbox.checked = autoReloadConfig.enabled;
    reloadIntervalInput.value = autoReloadConfig.intervalHours;
    reloadIntervalInput.disabled = !autoReloadConfig.enabled;
  }

  // Event listener for settings button
  settingsButton.addEventListener('click', () => {
    mainContent.style.display = 'none';
    settingsPage.style.display = 'block';
    loadSettings(); // Load settings when navigating to the settings page
  });

  // Event listener for back button
  backButton.addEventListener('click', () => {
    settingsPage.style.display = 'none';
    mainContent.style.display = 'block';
  });

  // Listen for show-settings-page event from main process
  window.electron.onShowSettingsPage(() => {
    mainContent.style.display = 'none';
    settingsPage.style.display = 'block';
    loadSettings();
  });

  // Event listener for save settings button
  saveSettingsButton.addEventListener('click', () => {
    const newSettings = {
      productNames: productNamesInput.value,
      productUrls: productUrlsInput.value,
      telegramToken: telegramTokenInput.value,
      telegramChatId: telegramChatIdInput.value,
    };
    window.electron.setSettings(newSettings);
    alert('Settings saved!');
  });

  // Auto-reload settings listeners
  autoReloadEnabledCheckbox.addEventListener('change', () => {
    const enabled = autoReloadEnabledCheckbox.checked;
    reloadIntervalInput.disabled = !enabled;
    window.electron.setAutoReloadConfig({
      enabled,
      intervalHours: parseInt(reloadIntervalInput.value, 10),
    });
  });

  reloadIntervalInput.addEventListener('change', () => {
    window.electron.setAutoReloadConfig({
      enabled: autoReloadEnabledCheckbox.checked,
      intervalHours: parseInt(reloadIntervalInput.value, 10),
    });
  });
});
