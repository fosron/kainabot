from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup
import json
from telegram import Bot
import os
import asyncio

# Load environment variables from .env file
load_dotenv()
TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')

# URLs to scrape from environment variables (dynamic loading)
PRODUCT_NAMES = os.getenv('PRODUCT_NAMES', '').split(',')
PRODUCT_URLS = os.getenv('PRODUCT_URLS', '').split(',')
URLS = dict(zip([name.strip() for name in PRODUCT_NAMES], [url.strip() for url in PRODUCT_URLS]))

# File to store last prices
PRICE_FILE = "prices.json"

def scrape_price(url):
    try:
        print(f"Scraping URL: {url}")
        
        # Custom headers to mimic a browser
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.google.com/",
        }
        
        # Send the GET request with headers
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            print(f"Failed to fetch {url}, Status Code: {response.status_code}")
            return None

        soup = BeautifulSoup(response.content, 'html.parser')

        # Debug: Print the HTML content (optional, for troubleshooting)
        # print(soup.prettify())

        # Locate the section title "Pardavėjai pagal mažiausią kainą"
        low_price_element = soup.select_one('span[itemprop="lowPrice"]')
        if low_price_element:
            low_price_text = low_price_element.text.strip().replace('\xa0', '').replace('€', '').replace(',', '.')
            try:
                price = float(low_price_text)
                print(f"Found low price: {price}€")
                return price
            except ValueError:
                print(f"Could not convert price string to float: '{low_price_text}'")
                return None
        else:
            print("No 'lowPrice' element found.")
            return None

    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return None

# Load last recorded prices
def load_prices():
    try:
        if os.path.exists(PRICE_FILE):
            with open(PRICE_FILE, 'r') as file:
                prices = json.load(file)
                print("Loaded previous prices:", prices)
                return prices
        else:
            print("No previous prices found.")
            return {}
    except Exception as e:
        print(f"Error loading prices file: {e}")
        return {}

# Save current prices
def save_prices(prices):
    try:
        with open(PRICE_FILE, 'w') as file:
            json.dump(prices, file)
            print("Saved current prices:", prices)
    except Exception as e:
        print(f"Error saving prices file: {e}")

# Send message via Telegram bot
async def send_telegram_message_async(message):
    try:
        print(f"Sending Telegram message: {message}")
        bot = Bot(token=TELEGRAM_TOKEN)
        await bot.send_message(chat_id=TELEGRAM_CHAT_ID, text=message)
    except Exception as e:
        print(f"Error sending Telegram message: {e}")

def send_telegram_message(message):
    asyncio.run(send_telegram_message_async(message))

# Main function to check prices and send updates
def check_prices():
    last_prices = load_prices()
    current_prices = {}
    messages = []

    for product, url in URLS.items():
        price = scrape_price(url)
        if price is not None:
            current_prices[product] = price
            # Compare with last price
            if product in last_prices and price != last_prices[product]:
                messages.append(f"Price change for {product}: {last_prices[product]}€ → {price}€")
            elif product not in last_prices:
                messages.append(f"New product tracked: {product} at {price}€")
    
    # Save current prices and send updates if needed
    save_prices(current_prices)
    if messages:
        send_telegram_message("\n".join(messages))
    else:
        print("No price changes detected.")

# Execute script
if __name__ == "__main__":
    check_prices()