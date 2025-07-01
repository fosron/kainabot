document.addEventListener('DOMContentLoaded', () => {
  const productsList = document.getElementById('products');
  const refreshButton = document.getElementById('refresh');
  const exitButton = document.getElementById('exit-app');
  const loader = document.getElementById('loader');
  const messageDisplay = document.getElementById('message-display');

  async function renderPrices(getPricesFunction) {
    loader.style.display = 'block';
    productsList.innerHTML = '';
    messageDisplay.innerHTML = ''; // Clear previous messages

    try {
      const { currentPrices, URLS, needsSetup, error } = await getPricesFunction();

      if (needsSetup) {
        messageDisplay.innerHTML = '<p class="info-message">Please configure your product settings in the settings menu.</p>';
        return;
      }

      if (error) {
        messageDisplay.innerHTML = `<p class="error-message">Error fetching prices: ${error}</p>`;
        return;
      }

      if (Object.keys(currentPrices).length === 0) {
        messageDisplay.innerHTML = '<p class="info-message">No prices to display. Ensure your product URLs are correct and try refreshing.</p>';
      }

      for (const [product, price] of Object.entries(currentPrices)) {
        const li = document.createElement('li');
        li.innerHTML = `<span class="product-name">${product} <i class="fas fa-external-link-alt open-link-icon" data-url="${URLS[product]}"></i></span><span class="product-price">${price}€</span>`;
        productsList.appendChild(li);
      }
    } catch (err) {
      console.error("Error in renderPrices:", err);
      messageDisplay.innerHTML = `<p class="error-message">An unexpected error occurred: ${err.message}</p>`;
    } finally {
      loader.style.display = 'none';
    }

    // Add event listeners to the new icons
    document.querySelectorAll('.open-link-icon').forEach(icon => {
      icon.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent li click if any
        window.electron.openExternalLink(event.target.dataset.url);
      });
    });
  }

  refreshButton.addEventListener('click', () => renderPrices(window.electron.getPrices));
  exitButton.addEventListener('click', () => window.electron.closeApp());

  // Handle system theme changes
  window.electron.onSystemThemeChanged((theme) => {
    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(`${theme}-mode`);
  });

  // Set initial theme
  window.electron.getSystemTheme().then((theme) => {
    document.body.classList.add(`${theme}-mode`);
  });

  // Listen for auto-reload triggers from main process
  window.electron.onAutoReloadTriggered(() => {
    renderPrices(window.electron.getPrices);
  });

  // Listen for show-settings-page event from main process
  window.electron.onShowSettingsPage(() => {
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('settings-page').style.display = 'block';
  });

  renderPrices(window.electron.getInitialPrices);
});