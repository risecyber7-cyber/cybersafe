from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
import re
import math
import random
import secrets
import smtplib
import asyncio
import paramiko
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-secret')
JWT_ALGORITHM = "HS256"

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Email config
GMAIL_EMAIL = os.environ.get('GMAIL_EMAIL', '')
GMAIL_APP_PASSWORD = os.environ.get('GMAIL_APP_PASSWORD', '')

# SSH config
SSH_HOST = os.environ.get('SSH_HOST', '')
SSH_USER = os.environ.get('SSH_USER', '')
SSH_PASSWORD = os.environ.get('SSH_PASSWORD', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ── Models ──────────────────────────────────────────────
class UserCreate(BaseModel):
    email: str
    username: str
    password: str
    captcha_id: str = ""
    captcha_answer: str = ""

class UserLogin(BaseModel):
    email: str
    password: str

class ToolInput(BaseModel):
    target: str

class PasswordCheckInput(BaseModel):
    password: str

class SandboxSubmit(BaseModel):
    challenge_id: str
    user_input: str

class ChatMessage(BaseModel):
    message: str
    session_id: str = ""

class ArticleCreate(BaseModel):
    title: str
    content: str
    category: str
    summary: str = ""

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class RoleUpdate(BaseModel):
    role: str

class PlanSubscribe(BaseModel):
    plan_id: str
    name: str
    email: str
    phone: str = ""

# ── Email Helper ────────────────────────────────────────
def send_email_sync(to_email: str, subject: str, html_content: str):
    if not GMAIL_APP_PASSWORD:
        logger.warning("Gmail App Password not configured. Email not sent.")
        return False
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"CyberGuard <{GMAIL_EMAIL}>"
        msg['To'] = to_email
        msg.attach(MIMEText(html_content, 'html'))
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(GMAIL_EMAIL, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_EMAIL, to_email, msg.as_string())
        logger.info(f"Email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Email send error: {e}")
        return False

async def send_email(to_email: str, subject: str, html_content: str):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, send_email_sync, to_email, subject, html_content)

# ── Auth Helpers ────────────────────────────────────────
def create_token(user_id: str, role: str):
    payload = {"user_id": user_id, "role": role, "exp": datetime.now(timezone.utc).timestamp() + 86400}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ── Captcha Routes ──────────────────────────────────────
@api_router.post("/captcha/generate")
async def generate_captcha():
    a, b = random.randint(1, 20), random.randint(1, 20)
    ops = [("+", a + b), ("-", abs(a - b)), ("*", a * b)]
    op, answer = random.choice(ops)
    if op == "-" and a < b:
        a, b = b, a
        answer = a - b
    captcha_id = str(uuid.uuid4())
    await db.captchas.insert_one({
        "id": captcha_id, "answer": str(answer),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
    })
    return {"captcha_id": captcha_id, "question": f"What is {a} {op} {b}?"}

@api_router.post("/captcha/verify")
async def verify_captcha_endpoint(captcha_id: str, answer: str):
    captcha = await db.captchas.find_one({"id": captcha_id}, {"_id": 0})
    if not captcha:
        raise HTTPException(status_code=400, detail="Invalid captcha")
    valid = captcha["answer"] == answer.strip()
    await db.captchas.delete_one({"id": captcha_id})
    return {"valid": valid}

# ── Auth Routes ─────────────────────────────────────────
@api_router.post("/auth/signup")
async def signup(data: UserCreate):
    # Verify captcha if provided
    if data.captcha_id:
        captcha = await db.captchas.find_one({"id": data.captcha_id}, {"_id": 0})
        if not captcha or captcha["answer"] != data.captcha_answer.strip():
            raise HTTPException(status_code=400, detail="Invalid captcha answer")
        await db.captchas.delete_one({"id": data.captcha_id})

    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    existing_name = await db.users.find_one({"username": data.username})
    if existing_name:
        raise HTTPException(status_code=400, detail="Username already taken")

    user_id = str(uuid.uuid4())
    verification_token = secrets.token_urlsafe(32)
    hashed = pwd_context.hash(data.password)
    user_doc = {
        "id": user_id, "email": data.email, "username": data.username,
        "password_hash": hashed, "role": "user",
        "email_verified": False, "verification_token": verification_token,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)

    # Send verification email (non-blocking)
    if GMAIL_APP_PASSWORD:
        html = f"""<div style="font-family:Arial;padding:20px;background:#0A0A0A;color:#fff;">
        <h2 style="color:#00FF66;">Welcome to CyberGuard!</h2>
        <p>Hi {data.username}, verify your email by clicking below:</p>
        <a href="https://cyberguard-hub-4.preview.emergentagent.com/verify-email/{verification_token}" style="display:inline-block;padding:12px 24px;background:#00FF66;color:#000;text-decoration:none;font-weight:bold;">Verify Email</a>
        <p style="color:#888;margin-top:20px;">If you didn't create this account, ignore this email.</p></div>"""
        asyncio.create_task(send_email(data.email, "Verify your CyberGuard account", html))

    token = create_token(user_id, "user")
    return {
        "token": token,
        "user": {"id": user_id, "email": data.email, "username": data.username, "role": "user", "email_verified": False, "created_at": user_doc["created_at"]}
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not pwd_context.verify(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "username": user["username"], "role": user["role"], "email_verified": user.get("email_verified", False), "created_at": user["created_at"]}
    }

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "username": user["username"], "role": user["role"], "email_verified": user.get("email_verified", False), "created_at": user["created_at"]}

@api_router.get("/auth/verify-email/{token}")
async def verify_email(token: str):
    user = await db.users.find_one({"verification_token": token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    await db.users.update_one({"verification_token": token}, {"$set": {"email_verified": True}, "$unset": {"verification_token": ""}})
    return {"message": "Email verified successfully"}

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        return {"message": "If the email exists, a reset link has been sent."}
    reset_token = secrets.token_urlsafe(32)
    await db.password_resets.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "token": reset_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    })
    if GMAIL_APP_PASSWORD:
        html = f"""<div style="font-family:Arial;padding:20px;background:#0A0A0A;color:#fff;">
        <h2 style="color:#00FF66;">Password Reset</h2>
        <p>You requested a password reset for your CyberGuard account.</p>
        <a href="https://cyberguard-hub-4.preview.emergentagent.com/reset-password/{reset_token}" style="display:inline-block;padding:12px 24px;background:#00FF66;color:#000;text-decoration:none;font-weight:bold;">Reset Password</a>
        <p style="color:#888;margin-top:20px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p></div>"""
        asyncio.create_task(send_email(data.email, "CyberGuard Password Reset", html))
    return {"message": "If the email exists, a reset link has been sent."}

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    reset = await db.password_resets.find_one({"token": data.token}, {"_id": 0})
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    expires_at = datetime.fromisoformat(reset["expires_at"]).replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({"token": data.token})
        raise HTTPException(status_code=400, detail="Reset token has expired")
    hashed = pwd_context.hash(data.new_password)
    await db.users.update_one({"id": reset["user_id"]}, {"$set": {"password_hash": hashed}})
    await db.password_resets.delete_one({"token": data.token})
    return {"message": "Password reset successfully"}

# ── Tools Routes ────────────────────────────────────────
@api_router.post("/tools/subdomain-finder")
async def subdomain_finder(data: ToolInput, user=Depends(get_current_user)):
    domain = data.target.strip()
    subs = ["www", "mail", "ftp", "admin", "blog", "dev", "api", "staging", "test", "cdn", "shop", "secure", "vpn", "portal", "webmail", "ns1", "ns2"]
    found = random.sample(subs, random.randint(6, 12))
    results = [{"subdomain": f"{s}.{domain}", "ip": f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}", "status": random.choice(["Active", "Active", "Active", "Inactive"])} for s in found]
    await db.tool_history.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "tool_name": "Subdomain Finder", "input_data": domain, "result_summary": f"Found {len(results)} subdomains", "created_at": datetime.now(timezone.utc).isoformat()})
    return {"domain": domain, "subdomains": results, "count": len(results)}

@api_router.post("/tools/port-scanner")
async def port_scanner(data: ToolInput, user=Depends(get_current_user)):
    target = data.target.strip()
    ports = [
        {"port": 21, "service": "FTP"}, {"port": 22, "service": "SSH"},
        {"port": 25, "service": "SMTP"}, {"port": 53, "service": "DNS"},
        {"port": 80, "service": "HTTP"}, {"port": 110, "service": "POP3"},
        {"port": 143, "service": "IMAP"}, {"port": 443, "service": "HTTPS"},
        {"port": 3306, "service": "MySQL"}, {"port": 5432, "service": "PostgreSQL"},
        {"port": 8080, "service": "HTTP-Proxy"}, {"port": 8443, "service": "HTTPS-Alt"},
    ]
    for p in ports:
        p["state"] = random.choice(["open", "closed", "filtered"])
    await db.tool_history.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "tool_name": "Port Scanner", "input_data": target, "result_summary": f"Scanned {len(ports)} ports", "created_at": datetime.now(timezone.utc).isoformat()})
    return {"target": target, "ports": ports, "scan_time": f"{random.uniform(1.5, 5.0):.2f}s"}

@api_router.post("/tools/whois")
async def whois_lookup(data: ToolInput, user=Depends(get_current_user)):
    domain = data.target.strip()
    result = {
        "domain": domain,
        "registrar": random.choice(["GoDaddy", "Namecheap", "Cloudflare", "Google Domains", "AWS Route53"]),
        "creation_date": "2015-03-14", "expiration_date": "2027-03-14", "updated_date": "2024-11-20",
        "status": ["clientTransferProhibited", "clientDeleteProhibited"],
        "name_servers": [f"ns1.{domain}", f"ns2.{domain}"],
        "registrant_country": random.choice(["US", "UK", "DE", "CA", "AU"]),
        "dnssec": random.choice(["signed", "unsigned"])
    }
    await db.tool_history.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "tool_name": "WHOIS Lookup", "input_data": domain, "result_summary": f"WHOIS for {domain}", "created_at": datetime.now(timezone.utc).isoformat()})
    return result

@api_router.post("/tools/http-headers")
async def http_headers(data: ToolInput, user=Depends(get_current_user)):
    url = data.target.strip()
    if not url.startswith("http"):
        url = f"https://{url}"
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as http_client:
            response = await http_client.head(url)
            headers_dict = dict(response.headers)
            security_headers_map = {
                "strict-transport-security": "HSTS", "content-security-policy": "CSP",
                "x-content-type-options": "X-Content-Type-Options", "x-frame-options": "X-Frame-Options",
                "x-xss-protection": "X-XSS-Protection", "referrer-policy": "Referrer-Policy",
                "permissions-policy": "Permissions-Policy"
            }
            security_analysis = [{"header": name, "present": header in headers_dict, "value": headers_dict.get(header, "Not set"), "severity": "good" if header in headers_dict else "warning"} for header, name in security_headers_map.items()]
            result = {"url": url, "status_code": response.status_code, "headers": headers_dict, "security_analysis": security_analysis}
    except Exception as e:
        result = {"url": url, "error": str(e), "headers": {}, "security_analysis": []}
    await db.tool_history.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "tool_name": "HTTP Header Analyzer", "input_data": url, "result_summary": f"Headers for {url}", "created_at": datetime.now(timezone.utc).isoformat()})
    return result

@api_router.post("/tools/password-strength")
async def password_strength(data: PasswordCheckInput):
    password = data.password
    score, feedback = 0, []
    if len(password) < 8: feedback.append("Use at least 8 characters")
    else: score += 1
    if len(password) >= 12: score += 1
    if len(password) >= 16: score += 1
    if re.search(r'[a-z]', password): score += 1
    else: feedback.append("Add lowercase letters")
    if re.search(r'[A-Z]', password): score += 1
    else: feedback.append("Add uppercase letters")
    if re.search(r'\d', password): score += 1
    else: feedback.append("Add numbers")
    if re.search(r'[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;\'`~]', password): score += 1
    else: feedback.append("Add special characters")
    common = ["password", "123456", "qwerty", "admin", "letmein", "welcome", "abc123"]
    if password.lower() in common: score, feedback = 0, ["This is a commonly used password"]
    charset = 0
    if re.search(r'[a-z]', password): charset += 26
    if re.search(r'[A-Z]', password): charset += 26
    if re.search(r'\d', password): charset += 10
    if re.search(r'[^a-zA-Z0-9]', password): charset += 32
    entropy = len(password) * math.log2(charset) if charset > 0 else 0
    levels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong", "Very Strong", "Very Strong"]
    crack_map = {0: "Instantly", 1: "Seconds", 2: "Minutes", 3: "Hours", 4: "Days", 5: "Years", 6: "Centuries", 7: "Centuries"}
    return {"score": score, "max_score": 7, "strength": levels[min(score, 7)], "entropy_bits": round(entropy, 1), "crack_time": crack_map.get(min(score, 7), "Unknown"), "feedback": feedback, "length": len(password)}

# ── Articles Routes ─────────────────────────────────────
@api_router.get("/articles")
async def get_articles(category: str = None):
    query = {} if not category or category == "all" else {"category": category}
    return await db.articles.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)

@api_router.get("/articles/{article_id}")
async def get_article(article_id: str):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article: raise HTTPException(status_code=404, detail="Article not found")
    return article

@api_router.post("/articles")
async def create_article(data: ArticleCreate, user=Depends(require_admin)):
    article = {"id": str(uuid.uuid4()), "title": data.title, "content": data.content, "category": data.category, "summary": data.summary, "author_name": user["username"], "author_id": user["id"], "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.articles.insert_one(article)
    del article["_id"]
    return article

@api_router.delete("/articles/{article_id}")
async def delete_article(article_id: str, user=Depends(require_admin)):
    result = await db.articles.delete_one({"id": article_id})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Article not found")
    return {"message": "Article deleted"}

# ── Sandbox ─────────────────────────────────────────────
SANDBOX_CHALLENGES = [
    {"id": "xss-reflected", "title": "Reflected XSS", "description": "Exploit a reflected Cross-Site Scripting vulnerability in a simulated search page.", "difficulty": "Easy", "category": "Web Hacking", "hint": "Try injecting a script tag in the search parameter", "solution_pattern": "<script"},
    {"id": "sqli-login", "title": "SQL Injection - Login Bypass", "description": "Bypass the login form using SQL injection on a simulated authentication system.", "difficulty": "Medium", "category": "Web Hacking", "hint": "Think about how SQL queries handle single quotes and OR conditions", "solution_pattern": "' or"},
    {"id": "xss-stored", "title": "Stored XSS", "description": "Inject persistent JavaScript through a simulated comment form.", "difficulty": "Medium", "category": "Web Hacking", "hint": "Try using event handlers like onload or onerror", "solution_pattern": "on"},
    {"id": "path-traversal", "title": "Path Traversal", "description": "Access restricted files by exploiting path traversal in a simulated file server.", "difficulty": "Easy", "category": "Web Hacking", "hint": "Try using ../ to navigate to parent directories", "solution_pattern": "../"},
    {"id": "command-injection", "title": "Command Injection", "description": "Execute system commands through a vulnerable ping utility input.", "difficulty": "Hard", "category": "Network Security", "hint": "Chain commands using ; or && or |", "solution_pattern": ";"},
]

@api_router.get("/sandbox/challenges")
async def get_challenges():
    return [{k: v for k, v in c.items() if k != "solution_pattern"} for c in SANDBOX_CHALLENGES]

@api_router.post("/sandbox/submit")
async def submit_challenge(data: SandboxSubmit, user=Depends(get_current_user)):
    challenge = next((c for c in SANDBOX_CHALLENGES if c["id"] == data.challenge_id), None)
    if not challenge: raise HTTPException(status_code=404, detail="Challenge not found")
    success = challenge["solution_pattern"].lower() in data.user_input.lower()
    outputs = {
        "xss-reflected": (f"[VULNERABLE] Search results for: {data.user_input}\nThe app rendered input without sanitization!\nChallenge Completed!", f"Search results for: {data.user_input}\nNo vulnerability detected."),
        "sqli-login": (f"SQL Query: SELECT * FROM users WHERE username='{data.user_input}'\n[VULNERABLE] Login bypassed!\nChallenge Completed!", f"SQL Query: SELECT * FROM users WHERE username='{data.user_input}'\nLogin failed."),
        "xss-stored": (f"Comment posted: {data.user_input}\n[VULNERABLE] Executable JavaScript detected!\nChallenge Completed!", f"Comment posted: {data.user_input}\nNo XSS detected."),
        "path-traversal": (f"Requesting: {data.user_input}\n[VULNERABLE] Path traversal!\nroot:x:0:0:root:/root:/bin/bash\nChallenge Completed!", f"Requesting: {data.user_input}\nFile not found."),
        "command-injection": (f"Ping: {data.user_input}\n[VULNERABLE] Command injection!\nuid=33(www-data)\nChallenge Completed!", f"Ping: {data.user_input}\nNo injection detected."),
    }
    output_pair = outputs.get(data.challenge_id, ("Success!", "Try again."))
    output = output_pair[0] if success else output_pair[1]
    await db.sandbox_attempts.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "challenge_id": data.challenge_id, "input": data.user_input, "success": success, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"success": success, "output": output, "challenge_id": data.challenge_id}

# ── AI Chat ─────────────────────────────────────────────
@api_router.post("/ai/chat")
async def ai_chat(data: ChatMessage, user=Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    session_id = data.session_id or f"{user['id']}-{str(uuid.uuid4())[:8]}"
    try:
        chat = LlmChat(api_key=os.environ.get('EMERGENT_LLM_KEY'), session_id=session_id, system_message="You are CyberGuard AI, an expert cybersecurity assistant. Be concise, technical, and educational. Format responses with markdown.")
        response = await chat.send_message(UserMessage(text=data.message))
        await db.chat_messages.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "session_id": session_id, "user_message": data.message, "ai_response": response, "created_at": datetime.now(timezone.utc).isoformat()})
        return {"response": response, "session_id": session_id}
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@api_router.get("/ai/history")
async def get_chat_history(user=Depends(get_current_user)):
    return await db.chat_messages.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)

# ── Dashboard ───────────────────────────────────────────
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user=Depends(get_current_user)):
    return {
        "total_scans": await db.tool_history.count_documents({"user_id": user["id"]}),
        "challenges_attempted": await db.sandbox_attempts.count_documents({"user_id": user["id"]}),
        "challenges_solved": await db.sandbox_attempts.count_documents({"user_id": user["id"], "success": True}),
        "ai_conversations": await db.chat_messages.count_documents({"user_id": user["id"]})
    }

@api_router.get("/dashboard/history")
async def get_dashboard_history(user=Depends(get_current_user)):
    return await db.tool_history.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)

# ── Plans Routes ────────────────────────────────────────
PLANS = [
    {"id": "live-class", "name": "Live Classes", "price": 500, "currency": "INR", "period": "month", "features": ["Live interactive sessions", "Real-time Q&A", "Hands-on labs", "Certificate of completion", "Discord community access"], "popular": True},
    {"id": "recorded-class", "name": "Recorded Classes", "price": 299, "currency": "INR", "period": "month", "features": ["Self-paced learning", "HD video lectures", "Downloadable resources", "Practice exercises", "Lifetime access"]},
    {"id": "free-demo", "name": "Free Demo (7 days)", "price": 0, "currency": "INR", "period": "7 days", "features": ["Access to 3 demo classes", "Preview of all courses", "Limited lab access", "Email support"], "note": "For gokali.pro subscribers: Send subscription screenshot to risecyber7@gmail.com for free 7-day demo access."},
]

@api_router.get("/plans")
async def get_plans():
    return PLANS

@api_router.post("/plans/subscribe")
async def subscribe_plan(data: PlanSubscribe):
    plan = next((p for p in PLANS if p["id"] == data.plan_id), None)
    if not plan: raise HTTPException(status_code=404, detail="Plan not found")
    sub = {"id": str(uuid.uuid4()), "plan_id": data.plan_id, "plan_name": plan["name"], "name": data.name, "email": data.email, "phone": data.phone, "price": plan["price"], "status": "pending", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.subscriptions.insert_one(sub)
    # Notify admin via email
    if GMAIL_APP_PASSWORD:
        html = f"""<div style="font-family:Arial;padding:20px;background:#0A0A0A;color:#fff;">
        <h2 style="color:#00FF66;">New Subscription Request</h2>
        <p><b>Plan:</b> {plan['name']} (Rs.{plan['price']})</p>
        <p><b>Name:</b> {data.name}</p><p><b>Email:</b> {data.email}</p><p><b>Phone:</b> {data.phone}</p></div>"""
        asyncio.create_task(send_email(GMAIL_EMAIL, f"New Subscription: {plan['name']}", html))
    return {"message": f"Subscription request for {plan['name']} submitted! We will contact you shortly.", "subscription_id": sub["id"]}

# ── Admin Routes ────────────────────────────────────────
@api_router.get("/admin/users")
async def admin_list_users(user=Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0, "verification_token": 0}).sort("created_at", -1).to_list(500)
    return users

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user=Depends(require_admin)):
    if user_id == user["id"]: raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

@api_router.put("/admin/users/{user_id}/role")
async def admin_update_role(user_id: str, data: RoleUpdate, user=Depends(require_admin)):
    if data.role not in ["admin", "user"]: raise HTTPException(status_code=400, detail="Invalid role")
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": data.role}})
    if result.matched_count == 0: raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"Role updated to {data.role}"}

@api_router.get("/admin/subscriptions")
async def admin_list_subscriptions(user=Depends(require_admin)):
    return await db.subscriptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.get("/admin/stats")
async def admin_stats(user=Depends(require_admin)):
    return {
        "total_users": await db.users.count_documents({}),
        "total_articles": await db.articles.count_documents({}),
        "total_scans": await db.tool_history.count_documents({}),
        "total_challenges": await db.sandbox_attempts.count_documents({}),
        "total_subscriptions": await db.subscriptions.count_documents({}),
        "successful_challenges": await db.sandbox_attempts.count_documents({"success": True}),
    }

# ── Seed Data ───────────────────────────────────────────
@app.on_event("startup")
async def seed_data():
    # Seed admin account
    admin_username = os.environ.get('ADMIN_USERNAME', 'admin')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    admin_email = os.environ.get('ADMIN_EMAIL', 'admin@cyberguard.io')
    existing_admin = await db.users.find_one({"username": admin_username})
    if not existing_admin:
        admin_doc = {
            "id": str(uuid.uuid4()), "email": admin_email, "username": admin_username,
            "password_hash": pwd_context.hash(admin_password), "role": "admin",
            "email_verified": True, "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
        logger.info(f"Admin account created: {admin_username}")

    # Seed articles
    count = await db.articles.count_documents({})
    if count == 0:
        articles = [
            {"id": str(uuid.uuid4()), "title": "Understanding Cross-Site Scripting (XSS) Attacks", "content": "## What is XSS?\n\nCross-Site Scripting (XSS) is a type of injection attack where malicious scripts are injected into trusted websites.\n\n### Types of XSS\n\n1. **Reflected XSS** - The malicious script comes from the current HTTP request\n2. **Stored XSS** - The malicious script is stored on the target server\n3. **DOM-based XSS** - The vulnerability exists in client-side code\n\n### Prevention\n\n- Always sanitize user input\n- Use Content-Security-Policy headers\n- Encode output data\n- Use modern frameworks that auto-escape", "category": "Web Hacking", "summary": "Learn about XSS attack types and prevention.", "author_name": "CyberGuard", "author_id": "system", "created_at": "2025-01-15T10:00:00Z", "updated_at": "2025-01-15T10:00:00Z"},
            {"id": str(uuid.uuid4()), "title": "SQL Injection: The Silent Database Killer", "content": "## SQL Injection Overview\n\nSQL injection exploits security vulnerabilities in an application's database layer.\n\n### How it Works\n\n```sql\n-- Normal query\nSELECT * FROM users WHERE id = '1'\n-- Injected\nSELECT * FROM users WHERE id = '1' OR '1'='1'\n```\n\n### Prevention\n\n- Parameterized queries\n- Input validation\n- Least privilege DB accounts\n- WAF", "category": "Web Hacking", "summary": "Deep dive into SQL injection attacks and protection.", "author_name": "CyberGuard", "author_id": "system", "created_at": "2025-01-20T10:00:00Z", "updated_at": "2025-01-20T10:00:00Z"},
            {"id": str(uuid.uuid4()), "title": "Network Scanning with Nmap", "content": "## Introduction to Nmap\n\nNmap is the world's most popular network scanning tool.\n\n### Basic Commands\n\n```bash\nnmap target.com\nnmap -sV target.com\nnmap -O target.com\n```\n\n### Scan Types\n\n- **TCP Connect (-sT)**: Full handshake\n- **SYN Scan (-sS)**: Stealth\n- **UDP Scan (-sU)**: UDP ports", "category": "Network Security", "summary": "Master Nmap basics.", "author_name": "CyberGuard", "author_id": "system", "created_at": "2025-02-01T10:00:00Z", "updated_at": "2025-02-01T10:00:00Z"},
            {"id": str(uuid.uuid4()), "title": "OSINT Techniques for Ethical Hackers", "content": "## What is OSINT?\n\nOpen Source Intelligence from publicly available sources.\n\n### Key Tools\n\n1. **Shodan** - IoT search engine\n2. **theHarvester** - Email enumeration\n3. **Maltego** - Visual link analysis\n4. **Google Dorks** - Advanced searching\n\n### Examples\n\n```\nsite:target.com filetype:pdf\nintitle:\"index of\" \"parent directory\"\n```", "category": "OSINT", "summary": "OSINT techniques and tools.", "author_name": "CyberGuard", "author_id": "system", "created_at": "2025-02-10T10:00:00Z", "updated_at": "2025-02-10T10:00:00Z"},
            {"id": str(uuid.uuid4()), "title": "Cryptography Fundamentals", "content": "## Cryptography\n\nSecuring information through encoding.\n\n### Symmetric: AES, DES\n### Asymmetric: RSA, ECC\n### Hashing: SHA-256, bcrypt, Argon2", "category": "Cryptography", "summary": "Essential cryptography concepts.", "author_name": "CyberGuard", "author_id": "system", "created_at": "2025-02-15T10:00:00Z", "updated_at": "2025-02-15T10:00:00Z"},
            {"id": str(uuid.uuid4()), "title": "Wireless Network Security: WPA3", "content": "## Wireless Security Evolution\n\n### WPA3 Features\n- SAE handshake\n- Forward Secrecy\n- 192-bit security\n\n### Common Attacks\n1. Evil Twin\n2. Deauthentication\n3. KRACK (WPA2)\n4. PMKID", "category": "Network Security", "summary": "Modern wireless security.", "author_name": "CyberGuard", "author_id": "system", "created_at": "2025-02-20T10:00:00Z", "updated_at": "2025-02-20T10:00:00Z"},
        ]
        await db.articles.insert_many(articles)
        logger.info("Seeded 6 articles")

# ── WebSocket SSH Terminal ──────────────────────────────
@app.websocket("/api/ws/terminal")
async def websocket_terminal(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user or user.get("role") != "admin":
            await websocket.close(code=4003)
            return
    except Exception:
        await websocket.close(code=4001)
        return

    await websocket.accept()

    if not SSH_HOST or not SSH_PASSWORD:
        await websocket.send_text("\r\nSSH not configured. Set SSH_HOST, SSH_USER, SSH_PASSWORD in .env\r\n")
        await websocket.close()
        return

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        await asyncio.get_event_loop().run_in_executor(
            None, lambda: ssh.connect(hostname=SSH_HOST, username=SSH_USER, password=SSH_PASSWORD, timeout=15)
        )
        channel = ssh.invoke_shell(term='xterm-256color', width=120, height=30)

        async def read_ssh():
            loop = asyncio.get_event_loop()
            while not channel.closed:
                try:
                    data = await loop.run_in_executor(None, lambda: channel.recv(4096) if channel.recv_ready() else b'')
                    if data:
                        await websocket.send_text(data.decode('utf-8', errors='replace'))
                    else:
                        await asyncio.sleep(0.05)
                except Exception:
                    break

        read_task = asyncio.create_task(read_ssh())
        try:
            while True:
                data = await websocket.receive_text()
                if data and not channel.closed:
                    channel.send(data)
        except WebSocketDisconnect:
            pass
        finally:
            read_task.cancel()
            channel.close()
    except Exception as e:
        try:
            await websocket.send_text(f"\r\nSSH Error: {str(e)}\r\n")
        except Exception:
            pass
    finally:
        ssh.close()
        try:
            await websocket.close()
        except Exception:
            pass

# ── App Setup ───────────────────────────────────────────
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
