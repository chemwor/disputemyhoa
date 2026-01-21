# Simple test script to check if the Heroku endpoints are working
# Run this to test your backend endpoints

import requests
import json

# Base URL for your Heroku backend
BASE_URL = "https://dmhoa-246713e0bd92.herokuapp.com"
CASE_TOKEN = "case_1768934984059_PVCfK3"

def test_endpoints():
    """Test the required endpoints for the case workspace."""

    print("Testing Heroku backend endpoints...")
    print(f"Base URL: {BASE_URL}")
    print(f"Case Token: {CASE_TOKEN}")
    print("-" * 50)

    # Test 1: Check if case-data endpoint exists
    print("1. Testing /api/case-data endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/case-data", params={"token": CASE_TOKEN})
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Case found: {data.get('id', 'N/A')}")
            print(f"   Unlocked: {data.get('unlocked', False)}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")

    print()

    # Test 2: Check if read-outputs endpoint exists
    print("2. Testing /api/read-outputs endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/read-outputs", params={"token": CASE_TOKEN})
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Status: {data.get('status', 'N/A')}")
            print(f"   Has outputs: {'outputs' in data or 'result' in data}")
        elif response.status_code == 404:
            print("   No outputs found (expected for new cases)")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")

    print()

    # Test 3: Check if case-analysis endpoint exists
    print("3. Testing /api/case-analysis endpoint...")
    try:
        response = requests.post(
            f"{BASE_URL}/api/case-analysis",
            headers={"Content-Type": "application/json"},
            json={"token": CASE_TOKEN}
        )
        print(f"   Status: {response.status_code}")
        if response.status_code in [200, 201]:
            data = response.json()
            print(f"   Status: {data.get('status', 'N/A')}")
            print(f"   Message: {data.get('message', 'N/A')}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")

if __name__ == "__main__":
    test_endpoints()
