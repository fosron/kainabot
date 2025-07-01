import requests
from bs4 import BeautifulSoup
import json
import argparse
import sys

# File to store last prices
PRICE_FILE = "prices.json"

def scrape_price(url):
    try:
        print(f"Scraping URL: {url}", file=sys.stderr)
        
        # Custom headers to mimic a browser
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.google.com/",
        }
        
        # Send the GET request with headers
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            print(f"Failed to fetch {url}, Status Code: {response.status_code}", file=sys.stderr)
            return None

        soup = BeautifulSoup(response.content, 'html.parser')

        # Locate the section title "Pardavėjai pagal mažiausią kainą"
        low_price_element = soup.select_one('span[itemprop="lowPrice"]')
        if low_price_element:
            low_price_text = low_price_element.text.strip().replace('\xa0', '').replace('€', '').replace(',', '')
            try:
                price = float(low_price_text)
                print(f"Found low price: {price}€", file=sys.stderr)
                return price
            except ValueError:
                print(f"Could not convert price string to float: '{low_price_text}'", file=sys.stderr)
                return None
        else:
            print("No 'lowPrice' element found.", file=sys.stderr)
            return None

    except Exception as e:
        print(f"Error scraping {url}: {e}", file=sys.stderr)
        return None

# Main function to check prices and send updates
def scrape_prices(product_names, product_urls):
    current_prices = {}
    urls = dict(zip([name.strip() for name in product_names], [url.strip() for url in product_urls]))
    for product, url in urls.items():
        price = scrape_price(url)
        if price is not None:
            current_prices[product] = price
    
    return current_prices
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape product prices.")
    parser.add_argument("--product_names", type=str, help="Comma-separated product names.")
    parser.add_argument("--product_urls", type=str, help="Comma-separated product URLs.")
    parser.add_argument("--telegram_token", type=str, help="Telegram Bot API Token.")
    parser.add_argument("--telegram_chat_id", type=str, help="Telegram Chat ID.")
    
    args = parser.parse_args()

    # Scrape prices and print as JSON
    prices = scrape_prices(args.product_names.split(','), args.product_urls.split(','))
    print(json.dumps(prices))