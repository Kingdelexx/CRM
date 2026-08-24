import urllib.request
import json

url = "http://127.0.0.1:8000/api/v1/webhooks/lead-capture/"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "mintana-test-api-key-12345"
}

print("--- TESTING WEBHOOK 1: NEW UNIQUE LEAD ---")
data1 = {
    "first_name": "Tony",
    "last_name": "Stark",
    "email": "tony@starkindustries.com",
    "company_name": "Stark Industries",
    "deal_title": "Arc Reactor Supply Contract",
    "deal_value": 150000.00,
    "notes": "Interested in premium cobalt raw supplies."
}

req1 = urllib.request.Request(url, data=json.dumps(data1).encode('utf-8'), headers=headers, method='POST')
try:
    with urllib.request.urlopen(req1) as response:
        html1 = response.read().decode('utf-8')
        print("Response 1:", html1)
except Exception as e:
    print("Error 1:", str(e))

print("\n--- TESTING WEBHOOK 2: DUPLICATE EMAIL DEDUPLICATION ---")
data2 = {
    "first_name": "Tony",
    "last_name": "Stark",
    "email": "tony@starkindustries.com",
    "company_name": "Stark Industries",
    "deal_title": "Mark 85 Fabrication Upgrade",
    "deal_value": 45000.00,
    "notes": "Urgent request for titanium-gold alloys."
}

req2 = urllib.request.Request(url, data=json.dumps(data2).encode('utf-8'), headers=headers, method='POST')
try:
    with urllib.request.urlopen(req2) as response:
        html2 = response.read().decode('utf-8')
        print("Response 2:", html2)
except Exception as e:
    print("Error 2:", str(e))
