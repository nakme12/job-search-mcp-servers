#!/usr/bin/env python3
"""
Script to make curl request and log the preview response
"""

import requests
import json
import sys
from datetime import datetime

def main():
    # URL and headers
    url = 'https://secure.penguinrandomhouse.com/davinci/connections/867ed4363b2bc21c860085ad2baa817d/capabilities/customHTMLTemplate'
    
    headers = {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.7',
        'content-type': 'application/json',
        'interactionid': '03dba2b6-37ad-4be5-97d9-34f168d37eaa',
        'interactiontoken': 'undefined',
        'origin': 'https://secure.penguinrandomhouse.com',
        'origin-cookies': '%7B%7D',
        'priority': 'u=1, i',
        'referer': 'https://secure.penguinrandomhouse.com/as/authorize?response_type=code&client_id=f4bf523c-6833-4ecd-8306-c0b8162cbb49&redirect_uri=https%3A%2F%2Fwww.penguinrandomhouse.com%2Fsignin-reply%2F&scope=openid+email+profile+prh&state=f71e808ebb13eec941b9de6375c8c577&nonce=6618f3751bf8c83486358fd0d9fddf94&acr_values=b5e71954b718f6db564a9bd5c5c6f1bb&ip=106.219.86.117&refurl=https%3A%2F%2Fwww.penguinrandomhouse.com%2F&loc=hdr-nav-banner',
        'sec-ch-ua': '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'sec-gpc': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
    }
    
    cookies = {
        'utag_main_v_id': '019c8e7e9c3d001ae1abfb2b719a0706f002306700bd8',
        'utag_main__sn': '1',
        'utag_main_ses_id': '1771917188160%3Bexp-session',
        'utag_main__pn': '1%3Bexp-session',
        'utag_main_dc_visit': '1',
        'utag_main__se': '2%3Bexp-session',
        'utag_main__ss': '0%3Bexp-session',
        'utag_main__st': '1771918992726%3Bexp-session',
        'utag_main_dc_event': '2%3Bexp-session',
        'rfl': 'https://www.penguinrandomhouse.com/',
        'rfc': 'https%3A%2F%2Fwww.penguinrandomhouse.com%2F',
        'interactionId': '03dba2b6-37ad-4be5-97d9-34f168d37eaa'
    }
    
    # Payload data
    payload = {
        "id": "m2vzhnrog4",
        "nextEvent": {
            "constructType": "skEvent",
            "eventName": "continue",
            "params": [],
            "eventType": "post",
            "postProcess": {}
        },
        "parameters": {
            "buttonType": "form-submit",
            "buttonValue": "SUBMIT",
            "countryCode": "+255",
            "phone": "775841644"
        },
        "eventName": "continue",
        "interactionId": "03dba2b6-37ad-4be5-97d9-34f168d37eaa"
    }
    
    print("Making HTTP request to Penguin Random House API...")
    print("=" * 50)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"URL: {url}")
    print(f"Method: POST")
    print("=" * 50)
    
    try:
        # Make the request
        response = requests.post(url, headers=headers, cookies=cookies, json=payload)
        
        print(f"HTTP Status Code: {response.status_code}")
        print(f"Response Time: {response.elapsed.total_seconds():.2f}s")
        print(f"Response Size: {len(response.content)} bytes")
        print("=" * 50)
        print("Response Preview:")
        print("=" * 50)
        
        # Try to parse and pretty-print JSON
        try:
            json_response = response.json()
            print(json.dumps(json_response, indent=2))
        except json.JSONDecodeError:
            print(response.text)
            
        print("=" * 50)
        print("Request completed successfully.")
        
        # Log to file
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "status_code": response.status_code,
            "response_time": response.elapsed.total_seconds(),
            "response_size": len(response.content),
            "response_data": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
        }
        
        with open('curl_response_log.json', 'w') as log_file:
            json.dump(log_entry, log_file, indent=2)
        
        print(f"Response logged to: curl_response_log.json")
        
    except requests.exceptions.RequestException as e:
        print(f"Error making request: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
