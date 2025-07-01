from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup
import json
import os

# Load environment variables from .env file
load_dotenv()

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

        # Locate the section title "Pardavėjai pagal mažiausią kainą"
        low_price_element = soup.select_one('span[itemprop="lowPrice"]')
        if low_price_element:
            low_price_text = low_price_element.text.strip().replace('\xa0', '').replace('€', '').replace(',', '')
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

# Save current prices
def save_prices(prices):
    try:
        with open(PRICE_FILE, 'w') as file:
            json.dump(prices, file)
            print("Saved current prices:", prices)
    except Exception as e:
        print(f"Error saving prices file: {e}")

# Main function to check prices and send updates
def scrape_and_save_prices():
    current_prices = {}
    for product, url in URLS.items():
        price = scrape_price(url)
        if price is not None:
            current_prices[product] = price
    
    save_prices(current_prices)

# Execute script
if __name__ == "__main__":
    scrape_and_save_prices()