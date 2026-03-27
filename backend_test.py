#!/usr/bin/env python3

import requests
import sys
import json
import os
from datetime import datetime

class CyberGuardAPITester:
    def __init__(self, base_url=None):
        if base_url is None:
            base_url = os.environ.get("API_BASE_URL", "http://localhost:8000/api")
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            details = f"Expected {expected_status}, got {response.status_code}"
            
            if not success:
                try:
                    error_detail = response.json().get('detail', 'No error detail')
                    details += f" - {error_detail}"
                except:
                    details += f" - Response: {response.text[:200]}"
            
            self.log_test(name, success, details if not success else "")
            
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_auth_signup(self):
        """Test user signup"""
        test_user_data = {
            "email": "test@cyber.io",
            "username": "testuser", 
            "password": "Test@1234"
        }
        
        success, response = self.run_test(
            "Auth Signup",
            "POST",
            "auth/signup",
            200,
            data=test_user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_auth_login(self):
        """Test user login"""
        login_data = {
            "email": "test@cyber.io",
            "password": "Test@1234"
        }
        
        success, response = self.run_test(
            "Auth Login",
            "POST", 
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_auth_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Auth Me",
            "GET",
            "auth/me", 
            200
        )
        return success

    def test_password_strength(self):
        """Test password strength checker (no auth required)"""
        test_passwords = [
            {"password": "weak", "expected_strength": "Very Weak"},
            {"password": "Test@1234", "expected_strength": "Good"}
        ]
        
        for test_case in test_passwords:
            success, response = self.run_test(
                f"Password Strength - {test_case['password']}",
                "POST",
                "tools/password-strength",
                200,
                data={"password": test_case["password"]}
            )
            
            if success and 'strength' in response:
                strength_match = response['strength'] == test_case['expected_strength']
                if not strength_match:
                    self.log_test(f"Password Strength Validation - {test_case['password']}", False, 
                                f"Expected {test_case['expected_strength']}, got {response['strength']}")
                else:
                    self.log_test(f"Password Strength Validation - {test_case['password']}", True)

    def test_tools_with_auth(self):
        """Test tools that require authentication"""
        tools = [
            {"name": "Subdomain Finder", "endpoint": "tools/subdomain-finder", "data": {"target": "example.com"}},
            {"name": "Port Scanner", "endpoint": "tools/port-scanner", "data": {"target": "example.com"}},
            {"name": "WHOIS Lookup", "endpoint": "tools/whois", "data": {"target": "example.com"}},
            {"name": "HTTP Headers", "endpoint": "tools/http-headers", "data": {"target": "https://example.com"}}
        ]
        
        for tool in tools:
            success, response = self.run_test(
                tool["name"],
                "POST",
                tool["endpoint"],
                200,
                data=tool["data"]
            )

    def test_articles(self):
        """Test articles endpoints"""
        # Get all articles
        success, response = self.run_test(
            "Get All Articles",
            "GET",
            "articles",
            200
        )
        
        if success and len(response) > 0:
            # Test getting specific article
            article_id = response[0]['id']
            self.run_test(
                "Get Specific Article",
                "GET",
                f"articles/{article_id}",
                200
            )
        
        # Test category filtering
        self.run_test(
            "Get Articles by Category",
            "GET",
            "articles?category=Web Hacking",
            200
        )

    def test_sandbox(self):
        """Test sandbox endpoints"""
        # Get challenges
        success, response = self.run_test(
            "Get Sandbox Challenges",
            "GET",
            "sandbox/challenges",
            200
        )
        
        if success and len(response) > 0:
            # Test XSS challenge submission
            challenge_id = "xss-reflected"
            self.run_test(
                "Submit XSS Challenge - Success",
                "POST",
                "sandbox/submit",
                200,
                data={"challenge_id": challenge_id, "user_input": "<script>alert(1)</script>"}
            )
            
            self.run_test(
                "Submit XSS Challenge - Fail",
                "POST", 
                "sandbox/submit",
                200,
                data={"challenge_id": challenge_id, "user_input": "safe input"}
            )

    def test_ai_chat(self):
        """Test AI chat functionality"""
        success, response = self.run_test(
            "AI Chat",
            "POST",
            "ai/chat",
            200,
            data={"message": "What is XSS?", "session_id": ""}
        )
        
        if success:
            # Test chat history
            self.run_test(
                "AI Chat History",
                "GET",
                "ai/history",
                200
            )

    def test_dashboard(self):
        """Test dashboard endpoints"""
        self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        self.run_test(
            "Dashboard History",
            "GET",
            "dashboard/history", 
            200
        )

    def test_captcha(self):
        """Test captcha generation and verification"""
        # Generate captcha
        success, response = self.run_test(
            "Generate Captcha",
            "POST",
            "captcha/generate",
            200
        )
        
        if success and 'captcha_id' in response and 'question' in response:
            captcha_id = response['captcha_id']
            question = response['question']
            
            # Try to extract answer from question (simple math)
            import re
            match = re.search(r'(\d+)\s*([+\-*])\s*(\d+)', question)
            if match:
                a, op, b = int(match.group(1)), match.group(2), int(match.group(3))
                if op == '+':
                    answer = a + b
                elif op == '-':
                    answer = a - b
                elif op == '*':
                    answer = a * b
                
                # Verify correct answer - using query parameters
                success, response = self.run_test(
                    "Verify Captcha - Correct",
                    "POST",
                    f"captcha/verify?captcha_id={captcha_id}&answer={answer}",
                    200
                )

    def test_plans(self):
        """Test plans endpoints"""
        # Get plans
        success, response = self.run_test(
            "Get Plans",
            "GET",
            "plans",
            200
        )
        
        if success and len(response) > 0:
            plan = response[0]  # Use first plan
            
            # Test subscription
            self.run_test(
                "Subscribe to Plan",
                "POST",
                "plans/subscribe",
                200,
                data={
                    "plan_id": plan["id"],
                    "name": "Test User",
                    "email": "test@example.com",
                    "phone": "1234567890"
                }
            )

    def test_forgot_password(self):
        """Test forgot password flow"""
        # Request password reset
        success, response = self.run_test(
            "Forgot Password Request",
            "POST",
            "auth/forgot-password",
            200,
            data={"email": "test@cyber.io"}
        )
        
        # Test with non-existent email (should still return 200 for security)
        self.run_test(
            "Forgot Password - Non-existent Email",
            "POST",
            "auth/forgot-password",
            200,
            data={"email": "nonexistent@example.com"}
        )

    def test_admin_login(self):
        """Test admin login with specific credentials"""
        admin_login_data = {
            "email": "risecyber7@gmail.com",
            "password": "Devaisback@!"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=admin_login_data
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            # Verify admin role
            if 'user' in response and response['user'].get('role') == 'admin':
                self.log_test("Admin Role Verification", True)
                return True
            else:
                self.log_test("Admin Role Verification", False, "User role is not admin")
        return False

    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        if not hasattr(self, 'admin_token'):
            self.log_test("Admin Endpoints", False, "No admin token available")
            return
        
        # Temporarily use admin token
        original_token = self.token
        self.token = self.admin_token
        
        # Test admin stats
        self.run_test(
            "Admin Stats",
            "GET",
            "admin/stats",
            200
        )
        
        # Test admin users list
        success, response = self.run_test(
            "Admin Users List",
            "GET",
            "admin/users",
            200
        )
        
        # Test admin subscriptions
        self.run_test(
            "Admin Subscriptions",
            "GET",
            "admin/subscriptions",
            200
        )
        
        # Test admin endpoints with regular user token (should fail)
        self.token = original_token
        if self.token:  # Only test if we have a regular user token
            self.run_test(
                "Admin Stats - Regular User (Should Fail)",
                "GET",
                "admin/stats",
                403
            )
        
        # Restore admin token for cleanup
        self.token = self.admin_token

    def test_auth_required_endpoints(self):
        """Test that endpoints properly require authentication"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        # These should fail with 401
        auth_required_tests = [
            ("tools/subdomain-finder", {"target": "example.com"}),
            ("tools/port-scanner", {"target": "example.com"}),
            ("dashboard/stats", None),
            ("ai/chat", {"message": "test"}),
            ("admin/stats", None),
            ("admin/users", None)
        ]
        
        for endpoint, data in auth_required_tests:
            method = "POST" if data else "GET"
            success, _ = self.run_test(
                f"Auth Required - {endpoint}",
                method,
                endpoint,
                401,
                data=data
            )
        
        # Restore token
        self.token = original_token

def main():
    print("🚀 Starting CyberGuard Platform API Tests")
    print("=" * 50)
    
    tester = CyberGuardAPITester()
    
    # Test sequence
    print("\n📝 Testing Authentication...")
    if not tester.test_auth_signup():
        print("❌ Signup failed, trying login...")
        if not tester.test_auth_login():
            print("❌ Both signup and login failed, stopping tests")
            return 1
    
    # Test auth/me endpoint
    tester.test_auth_me()
    
    print("\n🔐 Testing Admin Authentication...")
    tester.test_admin_login()
    
    print("\n🧩 Testing Captcha...")
    tester.test_captcha()
    
    print("\n💳 Testing Plans...")
    tester.test_plans()
    
    print("\n🔑 Testing Forgot Password...")
    tester.test_forgot_password()
    
    print("\n🔧 Testing Tools...")
    tester.test_password_strength()
    tester.test_tools_with_auth()
    
    print("\n📚 Testing Learning Hub...")
    tester.test_articles()
    
    print("\n🧪 Testing Sandbox...")
    tester.test_sandbox()
    
    print("\n🤖 Testing AI Assistant...")
    tester.test_ai_chat()
    
    print("\n📊 Testing Dashboard...")
    tester.test_dashboard()
    
    print("\n👑 Testing Admin Endpoints...")
    tester.test_admin_endpoints()
    
    print("\n🔒 Testing Auth Requirements...")
    tester.test_auth_required_endpoints()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
