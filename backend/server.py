from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header, WebSocket, WebSocketDisconnect, UploadFile, File, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import PyMongoError
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
import hashlib
import socket
import ssl
import shutil
import xml.etree.ElementTree as ET
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from collections import Counter
from urllib.parse import urlparse, quote
from passlib.context import CryptContext
from jose import jwt, JWTError

ROOT_DIR = Path(__file__).parent
PROJECT_ROOT = ROOT_DIR.parent
FRONTEND_BUILD_DIR = PROJECT_ROOT / "frontend" / "build"
load_dotenv(ROOT_DIR / '.env')


class LocalInsertOneResult:
    def __init__(self, inserted_id=None):
        self.inserted_id = inserted_id


class LocalInsertManyResult:
    def __init__(self, inserted_ids=None):
        self.inserted_ids = inserted_ids or []


class LocalUpdateResult:
    def __init__(self, matched_count=0, modified_count=0):
        self.matched_count = matched_count
        self.modified_count = modified_count


class LocalDeleteResult:
    def __init__(self, deleted_count=0):
        self.deleted_count = deleted_count


def _matches_query(document: dict, query: dict) -> bool:
    for key, value in (query or {}).items():
        if document.get(key) != value:
            return False
    return True


def _apply_projection(document: dict, projection: Optional[dict]) -> dict:
    item = dict(document)
    if projection is None:
        item.pop("_id", None)
        return item

    include_keys = {key for key, enabled in projection.items() if enabled and key != "_id"}
    exclude_keys = {key for key, enabled in projection.items() if not enabled}

    if include_keys:
        projected = {key: item.get(key) for key in include_keys if key in item}
        if projection.get("_id", 1) and "_id" in item:
            projected["_id"] = item["_id"]
        return projected

    for key in exclude_keys:
        item.pop(key, None)
    item.pop("_id", None)
    return item


class LocalCursor:
    def __init__(self, documents: List[dict], projection: Optional[dict] = None):
        self.documents = documents
        self.projection = projection
        self.sort_key = None
        self.sort_direction = 1

    def sort(self, key: str, direction: int):
        self.sort_key = key
        self.sort_direction = direction
        return self

    async def to_list(self, length: int):
        items = list(self.documents)
        if self.sort_key is not None:
            items.sort(key=lambda item: item.get(self.sort_key) or "", reverse=self.sort_direction == -1)
        return [_apply_projection(item, self.projection) for item in items[:length]]


class LocalCollection:
    def __init__(self, database: "LocalDatabase", name: str):
        self.database = database
        self.name = name

    def _items(self) -> List[dict]:
        return self.database.data.setdefault(self.name, [])

    async def insert_one(self, document: dict):
        item = dict(document)
        self._items().append(item)
        self.database.flush()
        return LocalInsertOneResult(item.get("id"))

    async def insert_many(self, documents: List[dict]):
        ids = []
        for document in documents:
            item = dict(document)
            self._items().append(item)
            ids.append(item.get("id"))
        self.database.flush()
        return LocalInsertManyResult(ids)

    async def find_one(self, query: dict, projection: Optional[dict] = None):
        for item in self._items():
            if _matches_query(item, query):
                return _apply_projection(item, projection)
        return None

    def find(self, query: Optional[dict] = None, projection: Optional[dict] = None):
        matches = [dict(item) for item in self._items() if _matches_query(item, query or {})]
        return LocalCursor(matches, projection)

    async def update_one(self, query: dict, update: dict):
        for item in self._items():
            if not _matches_query(item, query):
                continue
            if "$set" in update:
                item.update(update["$set"])
            if "$unset" in update:
                for key in update["$unset"].keys():
                    item.pop(key, None)
            self.database.flush()
            return LocalUpdateResult(1, 1)
        return LocalUpdateResult(0, 0)

    async def delete_one(self, query: dict):
        items = self._items()
        for index, item in enumerate(items):
            if _matches_query(item, query):
                del items[index]
                self.database.flush()
                return LocalDeleteResult(1)
        return LocalDeleteResult(0)

    async def count_documents(self, query: dict):
        return sum(1 for item in self._items() if _matches_query(item, query or {}))


class LocalDatabase:
    def __init__(self, path: Path):
        self.path = path
        self.data = self._load()

    def _load(self) -> dict:
        if not self.path.exists():
            return {}
        try:
            return json.loads(self.path.read_text())
        except Exception:
            return {}

    def flush(self):
        self.path.write_text(json.dumps(self.data, indent=2, sort_keys=True))

    def __getattr__(self, name: str):
        return LocalCollection(self, name)


# MongoDB
mongo_url = os.environ.get("MONGO_URL", "").strip()
db_name = os.environ.get("DB_NAME", "").strip() or "cyberguard"
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000) if mongo_url else None
db = client[db_name] if client is not None else LocalDatabase(ROOT_DIR / ".localdb.json")
DATABASE_MODE = "mongo" if client is not None else "local"

# JWT Config
JWT_SECRET = os.environ.get("JWT_SECRET", "").strip()
JWT_ALGORITHM = "HS256"

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Email config
GMAIL_EMAIL = os.environ.get('GMAIL_EMAIL', '')
GMAIL_APP_PASSWORD = os.environ.get('GMAIL_APP_PASSWORD', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', '').rstrip('/')
SUPPORT_EMAIL = os.environ.get('SUPPORT_EMAIL', GMAIL_EMAIL).strip()
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '').strip()

# SSH config
SSH_HOST = os.environ.get('SSH_HOST', '')
SSH_USER = os.environ.get('SSH_USER', '')
SSH_PASSWORD = os.environ.get('SSH_PASSWORD', '')
HIBP_API_KEY = os.environ.get('HIBP_API_KEY', '').strip()
VIRUSTOTAL_API_KEY = os.environ.get('VIRUSTOTAL_API_KEY', '').strip()
DOCKER_SSH_NODES = {
    "docker-01": {
        "label": "Kali Node",
        "host": "20.244.12.203",
        "port": 2222,
        "username": "root",
        "password": "K@liR00t#8vLp!",
        "root_user": "root",
        "root_password": "K@liR00t#8vLp!",
    },
    "docker-02": {
        "label": "Ubuntu Node",
        "host": "20.244.12.203",
        "port": 2223,
        "username": "root",
        "password": "UbunR00t#9kZa!",
        "root_user": "root",
        "root_password": "UbunR00t#9kZa!",
    },
    "docker-03": {
        "label": "Alpine Node",
        "host": "20.244.12.203",
        "port": 2224,
        "username": "root",
        "password": "AlpiR00t#1wMn!",
        "root_user": "root",
        "root_password": "AlpiR00t#1wMn!",
    },
    "docker-04": {
        "label": "Debian Node",
        "host": "20.244.12.203",
        "port": 2225,
        "username": "root",
        "password": "DebiR00t#3qFd!",
        "root_user": "root",
        "root_password": "DebiR00t#3qFd!",
    },
    "docker-05": {
        "label": "CentOS Node",
        "host": "20.244.12.203",
        "port": 2226,
        "username": "root",
        "password": "CentR00t#6zKe!",
        "root_user": "root",
        "root_password": "CentR00t#6zKe!",
    },
}


def require_jwt_secret():
    if JWT_SECRET:
        return
    raise HTTPException(status_code=503, detail="JWT authentication is not configured. Set JWT_SECRET before deploying.")


def ssh_terminal_available() -> bool:
    return not bool(os.environ.get("VERCEL"))


def frontend_url() -> str:
    if FRONTEND_URL:
        return FRONTEND_URL
    vercel_url = os.environ.get('VERCEL_PROJECT_PRODUCTION_URL') or os.environ.get('VERCEL_URL')
    if vercel_url:
        prefix = '' if vercel_url.startswith('http') else 'https://'
        return f"{prefix}{vercel_url}".rstrip('/')
    return 'http://localhost:3000'


def support_email() -> str:
    return SUPPORT_EMAIL or 'support@example.com'


def get_request_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def is_local_request(request: Request) -> bool:
    host = (request.url.hostname or "").lower()
    return host in {"127.0.0.1", "localhost"}


async def create_session(user: dict, request: Request, verified_2fa: bool) -> dict:
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    session_doc = {
        "id": session_id,
        "user_id": user["id"],
        "ip_address": get_request_ip(request),
        "user_agent": request.headers.get("user-agent", "unknown"),
        "created_at": now.isoformat(),
        "last_seen_at": now.isoformat(),
        "revoked_at": None,
        "verified_2fa": verified_2fa,
    }
    await db.auth_sessions.insert_one(session_doc)
    return session_doc


def create_token(user_id: str, role: str, session_id: str):
    payload = {
        "user_id": user_id,
        "role": role,
        "sid": session_id,
        "exp": datetime.now(timezone.utc).timestamp() + 86400,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def send_login_alert(user: dict, session_doc: dict):
    alert_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "email": user["email"],
        "ip_address": session_doc["ip_address"],
        "user_agent": session_doc["user_agent"],
        "created_at": session_doc["created_at"],
        "verified_2fa": session_doc["verified_2fa"],
    }
    await db.login_alerts.insert_one(alert_doc)
    if GMAIL_APP_PASSWORD:
        html = f"""<div style="font-family:Arial;padding:20px;background:#0A0A0A;color:#fff;">
        <h2 style="color:#00FF66;">New Login Alert</h2>
        <p>A new login was detected for your CyberGuard account.</p>
        <p><b>IP:</b> {session_doc['ip_address']}</p>
        <p><b>Device:</b> {session_doc['user_agent']}</p>
        <p><b>Time:</b> {session_doc['created_at']}</p>
        <p><b>2FA:</b> {'Verified' if session_doc['verified_2fa'] else 'Not enabled'}</p>
        </div>"""
        asyncio.create_task(send_email(user["email"], "CyberGuard Login Alert", html))


async def issue_2fa_challenge(user: dict):
    if not GMAIL_APP_PASSWORD:
        raise HTTPException(status_code=400, detail="2FA email delivery is not configured")
    challenge_id = str(uuid.uuid4())
    code = f"{random.randint(0, 999999):06d}"
    now = datetime.now(timezone.utc)
    await db.auth_challenges.insert_one({
        "id": challenge_id,
        "user_id": user["id"],
        "code": code,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(minutes=10)).isoformat(),
        "used_at": None,
    })
    html = f"""<div style="font-family:Arial;padding:20px;background:#0A0A0A;color:#fff;">
    <h2 style="color:#00FF66;">Your CyberGuard verification code</h2>
    <p>Use this code to complete sign in:</p>
    <div style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:18px 0;">{code}</div>
    <p>This code expires in 10 minutes.</p></div>"""
    asyncio.create_task(send_email(user["email"], "CyberGuard 2FA Code", html))
    return challenge_id


def normalize_target(target: str) -> str:
    value = target.strip()
    if value.startswith(("http://", "https://")):
        parsed = urlparse(value)
        return (parsed.hostname or value).strip()
    return value.split("/")[0].strip()


async def probe_port(host: str, port: int, timeout: float = 1.5) -> str:
    try:
        reader, writer = await asyncio.wait_for(asyncio.open_connection(host, port), timeout=timeout)
        writer.close()
        await writer.wait_closed()
        return "open"
    except asyncio.TimeoutError:
        return "filtered"
    except Exception:
        return "closed"


async def fetch_web_metadata(host: str, ports: List[int]) -> dict:
    web_ports = [port for port in ports if port in {80, 443, 8080, 8443}]
    if not web_ports:
        return {}

    candidates = []
    if 443 in web_ports or 8443 in web_ports:
        candidates.append(f"https://{host}")
    if 80 in web_ports or 8080 in web_ports:
        candidates.append(f"http://{host}")

    async with httpx.AsyncClient(timeout=8, follow_redirects=True, verify=False) as http_client:
        for url in candidates:
            try:
                response = await http_client.get(url)
                return {"url": str(response.url), "status_code": response.status_code, "headers": dict(response.headers)}
            except Exception:
                continue
    return {}


def _get_tls_metadata(host: str) -> Optional[dict]:
    context = ssl.create_default_context()
    with socket.create_connection((host, 443), timeout=4) as sock:
        with context.wrap_socket(sock, server_hostname=host) as secure_sock:
            cert = secure_sock.getpeercert()
            if not cert:
                return None
            expires_raw = cert.get("notAfter")
            expires_at = datetime.strptime(expires_raw, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc) if expires_raw else None
            subject = dict(item[0] for item in cert.get("subject", []))
            issuer = dict(item[0] for item in cert.get("issuer", []))
            return {
                "issuer": issuer.get("organizationName") or issuer.get("commonName"),
                "subject": subject.get("commonName"),
                "expires_at": expires_at.isoformat() if expires_at else None,
                "days_remaining": (expires_at - datetime.now(timezone.utc)).days if expires_at else None,
            }


async def get_tls_metadata(host: str) -> Optional[dict]:
    try:
        return await asyncio.to_thread(_get_tls_metadata, host)
    except Exception:
        return None


def first_rdap_event(events: list, names: set) -> str:
    for event in events:
        if event.get("eventAction") in names and event.get("eventDate"):
            return event["eventDate"]
    return "Unknown"


def vt_analysis_summary(payload: dict) -> dict:
    attributes = payload.get("data", {}).get("attributes", {})
    stats = attributes.get("last_analysis_stats", {})
    results = attributes.get("last_analysis_results", {})
    malicious_hits = [
        {"engine": engine, "category": result.get("category"), "result": result.get("result")}
        for engine, result in results.items()
        if result.get("category") in {"malicious", "suspicious"}
    ][:8]
    return {
        "engine_count": sum(stats.values()) if stats else 0,
        "detections": stats.get("malicious", 0) + stats.get("suspicious", 0),
        "status": "Suspicious" if (stats.get("malicious", 0) + stats.get("suspicious", 0)) > 0 else "Clean",
        "signature_hits": malicious_hits or [{"engine": "VirusTotal", "category": "undetected", "result": "No malicious verdicts"}],
        "last_analysis_stats": stats,
        "meaningful_name": attributes.get("meaningful_name"),
        "reputation": attributes.get("reputation"),
    }

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


async def ensure_database_backend():
    global db, client, DATABASE_MODE
    if client is None:
        DATABASE_MODE = "local"
        db = LocalDatabase(ROOT_DIR / ".localdb.json")
        return
    try:
        await client.admin.command("ping")
        db = client[db_name]
        DATABASE_MODE = "mongo"
    except Exception as exc:
        logger.warning("MongoDB unavailable, falling back to local JSON storage: %s", exc)
        db = LocalDatabase(ROOT_DIR / ".localdb.json")
        DATABASE_MODE = "local"


@app.exception_handler(PyMongoError)
async def mongodb_exception_handler(request: Request, exc: PyMongoError):
    logger.warning("MongoDB request failed: %s", exc)
    return JSONResponse(status_code=503, content={"detail": "Database unavailable. Check MONGO_URL, DB_NAME, and MongoDB network access."})


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        host = (request.url.hostname or "").lower()
        forwarded_proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        is_local = host in {"127.0.0.1", "localhost"}
        if not is_local and forwarded_proto == "http":
            secure_url = request.url.replace(scheme="https")
            return RedirectResponse(url=str(secure_url), status_code=307)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if not is_local and forwarded_proto == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        return response

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

class GoogleLoginRequest(BaseModel):
    credential: str

class TwoFactorVerify(BaseModel):
    challenge_id: str
    code: str

class TwoFactorToggle(BaseModel):
    enabled: bool

class SessionRevokeRequest(BaseModel):
    session_id: str

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

class RoadmapTaskCreate(BaseModel):
    title: str
    category: str
    summary: str = ""
    priority: str = "medium"

class RoadmapTaskUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    summary: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None

class ReconStartRequest(BaseModel):
    domain: str


DOMAIN_PATTERN = re.compile(
    r"^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$"
)
RECON_STAGE_TIMEOUT = 120
RECON_TOTAL_TIMEOUT = 480
RECON_STAGES = [
    {"key": "subdomains", "label": "Enumerating subdomains", "progress": 20},
    {"key": "hosts", "label": "Checking live hosts", "progress": 45},
    {"key": "ports", "label": "Scanning open ports", "progress": 72},
    {"key": "urls", "label": "Collecting URLs", "progress": 92},
    {"key": "complete", "label": "Recon report finalized", "progress": 100},
]
recon_scans: Dict[str, Dict[str, Any]] = {}

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
def serialize_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "username": user["username"],
        "role": user["role"],
        "email_verified": user.get("email_verified", False),
        "created_at": user["created_at"],
        "two_factor_enabled": user.get("two_factor_enabled", False),
        "auth_provider": user.get("auth_provider", "password"),
    }


async def verify_google_credential(credential: str) -> dict:
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google login is not configured")
    if not credential.strip():
        raise HTTPException(status_code=400, detail="Missing Google credential")

    async with httpx.AsyncClient(timeout=10) as http_client:
        try:
            response = await http_client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": credential.strip()},
            )
        except httpx.HTTPError as exc:
            logger.warning("Google token verification failed: %s", exc)
            raise HTTPException(status_code=502, detail="Unable to verify Google login") from exc

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    payload = response.json()
    audience = payload.get("aud")
    issuer = payload.get("iss")
    email = (payload.get("email") or "").strip().lower()
    email_verified = str(payload.get("email_verified", "")).lower() == "true"
    subject = (payload.get("sub") or "").strip()

    if audience != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Google credential audience mismatch")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(status_code=401, detail="Invalid Google credential issuer")
    if not email or not subject:
        raise HTTPException(status_code=401, detail="Google account data is incomplete")
    if not email_verified:
        raise HTTPException(status_code=401, detail="Google email is not verified")

    return {
        "sub": subject,
        "email": email,
        "given_name": (payload.get("given_name") or "").strip(),
        "name": (payload.get("name") or "").strip(),
    }


async def get_current_user(authorization: str = Header(None)):
    require_jwt_secret()
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        session = await db.auth_sessions.find_one({"id": payload.get("sid")}, {"_id": 0})
        if not session or session.get("revoked_at"):
            raise HTTPException(status_code=401, detail="Session expired")
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        await db.auth_sessions.update_one({"id": session["id"]}, {"$set": {"last_seen_at": datetime.now(timezone.utc).isoformat()}})
        user["session_id"] = session["id"]
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def authenticate_websocket_user(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.send_text("\r\nAuthentication token missing.\r\n")
        await websocket.close(code=4001)
        return None
    try:
        require_jwt_secret()
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        session = await db.auth_sessions.find_one({"id": payload.get("sid")}, {"_id": 0})
        if not session or session.get("revoked_at"):
            await websocket.send_text("\r\nSession expired.\r\n")
            await websocket.close(code=4001)
            return None
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            await websocket.send_text("\r\nInvalid or expired session token.\r\n")
            await websocket.close(code=4001)
            return None
        return user
    except Exception:
        await websocket.send_text("\r\nInvalid or expired session token.\r\n")
        await websocket.close(code=4001)
        return None


def validate_domain_input(value: str) -> str:
    domain = value.strip().lower().rstrip(".")
    if domain.startswith(("http://", "https://")) or "/" in domain or ":" in domain:
        raise HTTPException(status_code=400, detail="Enter a domain only, for example example.com")
    if not DOMAIN_PATTERN.fullmatch(domain):
        raise HTTPException(status_code=400, detail="Invalid domain format")
    return domain


def get_recon_stage(key: str) -> dict:
    for stage in RECON_STAGES:
        if stage["key"] == key:
            return stage
    return {"key": key, "label": key, "progress": 0}


def parse_unique_lines(lines: List[str], limit: int = 500) -> List[str]:
    seen = set()
    result = []
    for line in lines:
        value = line.strip()
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
        if len(result) >= limit:
            break
    return result


def extract_live_hosts(httpx_lines: List[str]) -> List[str]:
    hosts = []
    for line in httpx_lines:
        candidate = line.strip()
        if not candidate:
            continue
        parsed = urlparse(candidate if "://" in candidate else f"https://{candidate}")
        host = (parsed.netloc or parsed.path).split(":")[0].strip().lower()
        if host:
            hosts.append(host)
    return parse_unique_lines(hosts, limit=250)


def parse_nmap_output(xml_payload: str) -> List[dict]:
    if not xml_payload.strip():
        return []
    try:
        root = ET.fromstring(xml_payload)
    except ET.ParseError:
        return []

    ports = []
    for host in root.findall("host"):
        for port in host.findall("./ports/port"):
            state_node = port.find("state")
            if state_node is None or state_node.attrib.get("state") != "open":
                continue
            service_node = port.find("service")
            if service_node is not None:
                service_name = service_node.attrib.get("name", "unknown")
                detail_bits = [
                    service_node.attrib.get("product"),
                    service_node.attrib.get("version"),
                    service_node.attrib.get("extrainfo"),
                ]
                service = " ".join(bit for bit in detail_bits if bit)
                service = service_name if not service else f"{service_name} {service}"
            else:
                service = "unknown"
            ports.append({
                "port": int(port.attrib.get("portid", "0") or 0),
                "protocol": port.attrib.get("protocol", "tcp"),
                "service": service,
                "state": "open",
            })
    ports.sort(key=lambda item: (item["protocol"], item["port"]))
    return ports


RECON_TOOL_SPECS = [
    {
        "key": "subfinder",
        "label": "Subfinder",
        "stage": "subdomains",
        "purpose": "Passive subdomain enumeration",
        "version_args": ["-version"],
        "install": "go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest",
    },
    {
        "key": "assetfinder",
        "label": "Assetfinder",
        "stage": "subdomains",
        "purpose": "Additional passive asset discovery",
        "version_args": ["-h"],
        "install": "go install github.com/tomnomnom/assetfinder@latest",
    },
    {
        "key": "httpx",
        "label": "Httpx",
        "stage": "hosts",
        "purpose": "HTTP probing and live host detection",
        "version_args": ["-version"],
        "install": "go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest",
    },
    {
        "key": "nmap",
        "label": "Nmap",
        "stage": "ports",
        "purpose": "Open port and service fingerprinting",
        "version_args": ["--version"],
        "install": "sudo apt-get update && sudo apt-get install -y nmap",
    },
    {
        "key": "gau",
        "label": "GAU",
        "stage": "urls",
        "purpose": "Historical URL harvesting",
        "version_args": ["--version"],
        "install": "go install github.com/lc/gau/v2/cmd/gau@latest",
    },
    {
        "key": "katana",
        "label": "Katana",
        "stage": "urls",
        "purpose": "Web crawling and endpoint discovery",
        "version_args": ["-version"],
        "install": "go install github.com/projectdiscovery/katana/cmd/katana@latest",
    },
]


def read_tool_version(binary_path: str, args: List[str]) -> Optional[str]:
    try:
        import subprocess
        result = subprocess.run([binary_path, *args], capture_output=True, text=True, timeout=4)
        output = (result.stdout or result.stderr or "").strip().splitlines()
        return output[0][:160] if output else None
    except Exception:
        return None


def get_recon_capability_snapshot() -> dict:
    tools = []
    available_count = 0
    for spec in RECON_TOOL_SPECS:
        binary_path = shutil.which(spec["key"])
        available = bool(binary_path)
        if available:
            available_count += 1
        tools.append({
            "key": spec["key"],
            "label": spec["label"],
            "stage": spec["stage"],
            "purpose": spec["purpose"],
            "available": available,
            "path": binary_path,
            "version": read_tool_version(binary_path, spec["version_args"]) if binary_path else None,
            "install_command": spec["install"],
        })
    return {
        "tools": tools,
        "coverage_percent": round((available_count / len(RECON_TOOL_SPECS)) * 100),
        "available_count": available_count,
        "total_count": len(RECON_TOOL_SPECS),
        "stage_timeout_seconds": RECON_STAGE_TIMEOUT,
        "total_timeout_seconds": RECON_TOTAL_TIMEOUT,
    }


def build_recon_snapshot(scan: Dict[str, Any]) -> dict:
    return {
        "type": "snapshot",
        "scan_id": scan["id"],
        "status": scan["status"],
        "domain": scan["domain"],
        "progress": scan["progress"],
        "stage": scan["stage"],
        "started_at": scan["started_at"],
        "finished_at": scan.get("finished_at"),
        "logs": scan["result"]["logs"][-250:],
        "result": scan["result"],
        "report_id": scan.get("report_id"),
        "error": scan.get("error"),
    }


async def broadcast_recon_event(scan: Dict[str, Any], payload: dict):
    stale = []
    for websocket in list(scan["subscribers"]):
        try:
            await websocket.send_json(payload)
        except Exception:
            stale.append(websocket)
    for websocket in stale:
        scan["subscribers"].discard(websocket)


async def append_recon_log(scan: Dict[str, Any], line: str):
    entry = line.strip()
    if not entry:
        return
    scan["result"]["logs"].append(entry)
    if len(scan["result"]["logs"]) > 600:
        scan["result"]["logs"] = scan["result"]["logs"][-600:]
    await broadcast_recon_event(scan, {"type": "log", "scan_id": scan["id"], "line": entry})


async def update_recon_stage(scan: Dict[str, Any], stage_key: str, line: Optional[str] = None):
    stage = get_recon_stage(stage_key)
    scan["stage"] = stage
    scan["progress"] = stage["progress"]
    await broadcast_recon_event(
        scan,
        {
            "type": "stage",
            "scan_id": scan["id"],
            "stage": stage,
            "progress": scan["progress"],
            "status": scan["status"],
        },
    )
    if line:
        await append_recon_log(scan, line)


async def run_recon_command(
    binary: str,
    args: List[str],
    scan: Dict[str, Any],
    stage_key: str,
    stdin_text: Optional[str] = None,
    timeout: int = RECON_STAGE_TIMEOUT,
) -> Dict[str, Any]:
    binary_path = shutil.which(binary)
    if not binary_path:
        await append_recon_log(scan, f"[warn] {binary} not found, skipping {stage_key}")
        return {"stdout": [], "stderr": [], "returncode": None, "available": False, "timed_out": False}

    await append_recon_log(scan, f"$ {binary} {' '.join(args)}")
    process = await asyncio.create_subprocess_exec(
        binary_path,
        *args,
        stdin=asyncio.subprocess.PIPE if stdin_text is not None else None,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    stdout_lines: List[str] = []
    stderr_lines: List[str] = []

    async def pump(stream, collector: List[str], prefix: str = ""):
        while True:
            chunk = await stream.readline()
            if not chunk:
                break
            text = chunk.decode("utf-8", errors="replace").rstrip()
            if not text:
                continue
            collector.append(text)
            await append_recon_log(scan, f"{prefix}{text}")

    async def write_stdin():
        if process.stdin is None or stdin_text is None:
            return
        process.stdin.write(stdin_text.encode("utf-8"))
        await process.stdin.drain()
        process.stdin.close()
        await process.stdin.wait_closed()

    stdout_task = asyncio.create_task(pump(process.stdout, stdout_lines))
    stderr_task = asyncio.create_task(pump(process.stderr, stderr_lines, prefix="[stderr] "))
    stdin_task = asyncio.create_task(write_stdin()) if stdin_text is not None else None

    timed_out = False
    try:
        await asyncio.wait_for(process.wait(), timeout=timeout)
    except asyncio.TimeoutError:
        timed_out = True
        process.kill()
        await process.wait()
        await append_recon_log(scan, f"[timeout] {binary} exceeded {timeout}s and was terminated")

    await stdout_task
    await stderr_task
    if stdin_task is not None:
        await stdin_task

    return {
        "stdout": stdout_lines,
        "stderr": stderr_lines,
        "returncode": process.returncode,
        "available": True,
        "timed_out": timed_out,
    }


async def persist_recon_report(scan: Dict[str, Any]):
    report_doc = {
        "id": str(uuid.uuid4()),
        "user_id": scan["user_id"],
        "domain": scan["domain"],
        "status": scan["status"],
        "progress": scan["progress"],
        "stage": scan["stage"]["key"],
        "result": scan["result"],
        "error": scan.get("error"),
        "created_at": scan["started_at"],
        "finished_at": scan.get("finished_at"),
    }
    await db.recon_reports.insert_one(report_doc)
    scan["report_id"] = report_doc["id"]
    return report_doc


async def run_recon_scan(scan_id: str):
    scan = recon_scans[scan_id]
    started = asyncio.get_running_loop().time()
    domain = scan["domain"]
    scan["status"] = "running"
    await update_recon_stage(scan, "subdomains", f"[stage] Starting reconnaissance for {domain}")

    try:
        async def execute_pipeline():
            subfinder_run = await run_recon_command("subfinder", ["-d", domain, "-silent"], scan, "subdomains")
            assetfinder_run = await run_recon_command("assetfinder", ["--subs-only", domain], scan, "subdomains")
            subdomains = parse_unique_lines([*subfinder_run["stdout"], *assetfinder_run["stdout"]], limit=600)
            scan["result"]["subdomains"] = subdomains
            await append_recon_log(scan, f"[info] {len(subdomains)} unique subdomains collected")

            await update_recon_stage(scan, "hosts", "[stage] Probing live hosts with httpx")
            host_input = "\n".join(subdomains or [domain]) + "\n"
            httpx_run = await run_recon_command("httpx", ["-silent"], scan, "hosts", stdin_text=host_input)
            live_hosts = extract_live_hosts(httpx_run["stdout"])
            scan["result"]["live_hosts"] = live_hosts
            await append_recon_log(scan, f"[info] {len(live_hosts)} live hosts detected")

            await update_recon_stage(scan, "ports", "[stage] Running nmap service detection")
            nmap_run = await run_recon_command("nmap", ["-sV", "-oX", "-", domain], scan, "ports")
            ports = parse_nmap_output("\n".join(nmap_run["stdout"]))
            scan["result"]["ports"] = ports
            await append_recon_log(scan, f"[info] {len(ports)} open ports identified")

            await update_recon_stage(scan, "urls", "[stage] Aggregating URLs from gau and katana")
            gau_run = await run_recon_command("gau", [domain], scan, "urls")
            katana_run = await run_recon_command("katana", ["-u", f"https://{domain}"], scan, "urls")
            urls = parse_unique_lines(
                [
                    line for line in [*gau_run["stdout"], *katana_run["stdout"]]
                    if line.startswith("http://") or line.startswith("https://")
                ],
                limit=1000,
            )
            scan["result"]["urls"] = urls
            await append_recon_log(scan, f"[info] {len(urls)} URLs collected")

        await asyncio.wait_for(execute_pipeline(), timeout=RECON_TOTAL_TIMEOUT)

        scan["status"] = "completed"
        scan["finished_at"] = datetime.now(timezone.utc).isoformat()
        scan["result"]["duration_seconds"] = round(asyncio.get_running_loop().time() - started, 2)
        await update_recon_stage(scan, "complete", "[done] Reconnaissance completed")
        await persist_recon_report(scan)
        await db.tool_history.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": scan["user_id"],
            "tool_name": "Reconnaissance System",
            "input_data": domain,
            "result_summary": f"{len(scan['result']['subdomains'])} subdomains, {len(scan['result']['live_hosts'])} live hosts, {len(scan['result']['ports'])} ports, {len(scan['result']['urls'])} urls",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except asyncio.TimeoutError:
        scan["status"] = "failed"
        scan["error"] = f"Recon exceeded the {RECON_TOTAL_TIMEOUT}s execution limit"
        scan["finished_at"] = datetime.now(timezone.utc).isoformat()
        await append_recon_log(scan, f"[error] {scan['error']}")
        await persist_recon_report(scan)
    except Exception as exc:
        scan["status"] = "failed"
        scan["error"] = str(exc)
        scan["finished_at"] = datetime.now(timezone.utc).isoformat()
        await append_recon_log(scan, f"[error] Recon failed: {exc}")
        await persist_recon_report(scan)
    finally:
        await broadcast_recon_event(scan, build_recon_snapshot(scan))

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
async def signup(data: UserCreate, request: Request):
    require_jwt_secret()
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
        <a href="{frontend_url()}/verify-email/{verification_token}" style="display:inline-block;padding:12px 24px;background:#00FF66;color:#000;text-decoration:none;font-weight:bold;">Verify Email</a>
        <p style="color:#888;margin-top:20px;">If you didn't create this account, ignore this email.</p></div>"""
        asyncio.create_task(send_email(data.email, "Verify your CyberGuard account", html))

    user_response = {"id": user_id, "email": data.email, "username": data.username, "role": "user", "email_verified": False, "created_at": user_doc["created_at"], "two_factor_enabled": False}
    session_doc = await create_session(user_doc, request, verified_2fa=False)
    token = create_token(user_id, "user", session_doc["id"])
    await send_login_alert(user_doc, session_doc)
    return {
        "token": token,
        "user": user_response,
        "session_id": session_doc["id"],
    }

@api_router.post("/auth/login")
async def login(data: UserLogin, request: Request):
    require_jwt_secret()
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not pwd_context.verify(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("two_factor_enabled"):
        challenge_id = await issue_2fa_challenge(user)
        return {"requires_2fa": True, "challenge_id": challenge_id, "email": user["email"]}
    session_doc = await create_session(user, request, verified_2fa=False)
    token = create_token(user["id"], user["role"], session_doc["id"])
    await send_login_alert(user, session_doc)
    return {
        "token": token,
        "user": serialize_user(user),
        "session_id": session_doc["id"],
    }

@api_router.get("/auth/providers")
async def auth_providers():
    return {
        "google": {
            "enabled": bool(GOOGLE_CLIENT_ID),
            "client_id": GOOGLE_CLIENT_ID or None,
        }
    }


@api_router.post("/auth/google")
async def google_login(data: GoogleLoginRequest, request: Request):
    require_jwt_secret()
    google_user = await verify_google_credential(data.credential)
    user = await db.users.find_one({"email": google_user["email"]}, {"_id": 0})

    if not user:
        base_username = re.sub(r"[^a-zA-Z0-9_]", "", (google_user["given_name"] or google_user["name"] or google_user["email"].split("@")[0]))[:18] or "googleuser"
        username = base_username
        suffix = 1
        while await db.users.find_one({"username": username}, {"_id": 0}):
            username = f"{base_username[:14]}{suffix}"
            suffix += 1

        user = {
            "id": str(uuid.uuid4()),
            "email": google_user["email"],
            "username": username,
            "password_hash": "",
            "role": "user",
            "email_verified": True,
            "verification_token": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "two_factor_enabled": False,
            "auth_provider": "google",
            "google_sub": google_user["sub"],
        }
        await db.users.insert_one(user)
    else:
        updates = {
            "email_verified": True,
            "auth_provider": user.get("auth_provider") or "google",
            "google_sub": google_user["sub"],
        }
        if not user.get("username"):
            updates["username"] = google_user["email"].split("@")[0]
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
        user.update(updates)

    session_doc = await create_session(user, request, verified_2fa=not user.get("two_factor_enabled", False))
    token = create_token(user["id"], user["role"], session_doc["id"])
    await send_login_alert(user, session_doc)
    return {
        "token": token,
        "user": serialize_user(user),
        "session_id": session_doc["id"],
    }

@api_router.post("/auth/2fa/verify")
async def verify_two_factor(data: TwoFactorVerify, request: Request):
    require_jwt_secret()
    challenge = await db.auth_challenges.find_one({"id": data.challenge_id}, {"_id": 0})
    if not challenge or challenge.get("used_at"):
        raise HTTPException(status_code=400, detail="Invalid verification challenge")
    expires_at = datetime.fromisoformat(challenge["expires_at"]).replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Verification code expired")
    if challenge["code"] != data.code.strip():
        raise HTTPException(status_code=401, detail="Invalid verification code")
    user = await db.users.find_one({"id": challenge["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.auth_challenges.update_one({"id": challenge["id"]}, {"$set": {"used_at": datetime.now(timezone.utc).isoformat()}})
    session_doc = await create_session(user, request, verified_2fa=True)
    token = create_token(user["id"], user["role"], session_doc["id"])
    await send_login_alert(user, session_doc)
    return {
        "token": token,
        "user": serialize_user(user),
        "session_id": session_doc["id"],
    }

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    response = serialize_user(user)
    response["session_id"] = user.get("session_id")
    return response

@api_router.post("/auth/logout")
async def logout(user=Depends(get_current_user)):
    await db.auth_sessions.update_one({"id": user.get("session_id")}, {"$set": {"revoked_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Logged out"}

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
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
    })
    if GMAIL_APP_PASSWORD:
        html = f"""<div style="font-family:Arial;padding:20px;background:#0A0A0A;color:#fff;">
        <h2 style="color:#00FF66;">Password Reset</h2>
        <p>You requested a password reset for your CyberGuard account.</p>
        <a href="{frontend_url()}/reset-password/{reset_token}" style="display:inline-block;padding:12px 24px;background:#00FF66;color:#000;text-decoration:none;font-weight:bold;">Reset Password</a>
        <p style="color:#888;margin-top:20px;">This link expires in 5 minutes. If you didn't request this, ignore this email.</p></div>"""
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
    domain = normalize_target(data.target)
    candidate_labels = ["www", "mail", "ftp", "admin", "blog", "dev", "api", "staging", "test", "cdn", "shop", "secure", "vpn", "portal", "webmail", "ns1", "ns2"]
    discovered = {}

    try:
        async with httpx.AsyncClient(timeout=20, headers={"User-Agent": "CyberGuard/1.0"}) as http_client:
            response = await http_client.get(f"https://crt.sh/?q=%25.{domain}&output=json")
            if response.status_code == 200:
                for row in response.json():
                    for value in str(row.get("name_value", "")).splitlines():
                        name = value.strip().lower()
                        if name.startswith("*."):
                            name = name[2:]
                        if name.endswith(f".{domain}") or name == domain:
                            discovered.setdefault(name, None)
    except Exception:
        pass

    for label in candidate_labels:
        discovered.setdefault(f"{label}.{domain}", None)

    results = []
    for hostname in sorted(discovered.keys()):
        try:
            ip = socket.gethostbyname(hostname)
            results.append({"subdomain": hostname, "ip": ip, "status": "Active"})
        except Exception:
            continue

    await db.tool_history.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "tool_name": "Subdomain Finder", "input_data": domain, "result_summary": f"Found {len(results)} subdomains", "created_at": datetime.now(timezone.utc).isoformat()})
    return {"domain": domain, "subdomains": results[:50], "count": len(results)}

@api_router.post("/tools/port-scanner")
async def port_scanner(data: ToolInput, user=Depends(get_current_user)):
    started_at = asyncio.get_running_loop().time()
    target = data.target.strip()
    host = normalize_target(target)
    service_map = [
        (21, "FTP"), (22, "SSH"), (25, "SMTP"), (53, "DNS"),
        (80, "HTTP"), (110, "POP3"), (143, "IMAP"), (443, "HTTPS"),
        (3306, "MySQL"), (5432, "PostgreSQL"), (8080, "HTTP-Proxy"), (8443, "HTTPS-Alt"),
    ]
    states = await asyncio.gather(*(probe_port(host, port) for port, _ in service_map))
    ports = [{"port": port, "service": service, "state": state} for (port, service), state in zip(service_map, states)]
    await db.tool_history.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "tool_name": "Port Scanner", "input_data": target, "result_summary": f"Scanned {len(ports)} ports", "created_at": datetime.now(timezone.utc).isoformat()})
    return {"target": target, "resolved_host": host, "ports": ports, "scan_time": f"{asyncio.get_running_loop().time() - started_at:.2f}s"}

@api_router.post("/tools/vulnerability-scanner")
async def vulnerability_scanner(data: ToolInput, user=Depends(get_current_user)):
    started_at = asyncio.get_running_loop().time()
    target = data.target.strip()
    host = normalize_target(target)
    service_map = [
        (21, "FTP"), (22, "SSH"), (25, "SMTP"), (53, "DNS"),
        (80, "HTTP"), (110, "POP3"), (143, "IMAP"), (443, "HTTPS"),
        (3306, "MySQL"), (5432, "PostgreSQL"), (8080, "HTTP-Proxy"), (8443, "HTTPS-Alt"),
    ]
    states = await asyncio.gather(*(probe_port(host, port) for port, _ in service_map))
    services = [{"port": port, "service": service, "state": state} for (port, service), state in zip(service_map, states)]

    web_metadata = await fetch_web_metadata(host, [item["port"] for item in services if item["state"] == "open"])
    tls_metadata = await get_tls_metadata(host) if any(item["port"] == 443 and item["state"] == "open" for item in services) else None
    findings = []
    if any(s["port"] == 21 and s["state"] == "open" for s in services):
        findings.append({"severity": "high", "title": "FTP service exposed", "detail": "Port 21 is open and may allow legacy or weak authentication."})
    if any(s["port"] == 22 and s["state"] == "open" for s in services):
        findings.append({"severity": "medium", "title": "SSH management port exposed", "detail": "SSH is publicly reachable. Restrict access to trusted IPs and rotate credentials."})
    if any(s["port"] == 3306 and s["state"] == "open" for s in services):
        findings.append({"severity": "high", "title": "Database service exposed", "detail": "MySQL is reachable from the network. Public database ports increase attack surface."})
    if any(s["port"] == 8080 and s["state"] == "open" for s in services):
        findings.append({"severity": "medium", "title": "Alternate web admin port detected", "detail": "Port 8080 is open and may expose admin panels or test services."})
    headers = {header.lower(): value for header, value in web_metadata.get("headers", {}).items()}
    if web_metadata:
        missing_headers = [name for name in ["strict-transport-security", "content-security-policy", "x-frame-options", "x-content-type-options"] if name not in headers]
        if missing_headers:
            findings.append({"severity": "medium", "title": "Missing security headers", "detail": f"Missing: {', '.join(missing_headers)}"})
    if tls_metadata and tls_metadata.get("days_remaining") is not None and tls_metadata["days_remaining"] < 21:
        findings.append({"severity": "medium", "title": "TLS certificate nearing expiry", "detail": f"Certificate expires in {tls_metadata['days_remaining']} days."})
    if not findings:
        findings.append({"severity": "low", "title": "No critical exposure detected", "detail": "No obviously risky open services were identified during this scan."})

    severity_rank = {"low": 1, "medium": 2, "high": 3}
    risk_score = min(100, 18 + sum(severity_rank[item["severity"]] * 16 for item in findings))
    await db.tool_history.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "tool_name": "Vulnerability Scanner",
        "input_data": target,
        "result_summary": f"{len(findings)} findings across {len(services)} services",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {
        "target": target,
        "resolved_host": host,
        "scan_time": f"{asyncio.get_running_loop().time() - started_at:.2f}s",
        "risk_score": risk_score,
        "services": services,
        "findings": findings,
        "web": {
            "url": web_metadata.get("url"),
            "status_code": web_metadata.get("status_code"),
            "headers_checked": ["strict-transport-security", "content-security-policy", "x-frame-options", "x-content-type-options"],
        } if web_metadata else None,
        "tls": tls_metadata,
    }

@api_router.post("/tools/whois")
async def whois_lookup(data: ToolInput, user=Depends(get_current_user)):
    domain = normalize_target(data.target)
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers={"User-Agent": "CyberGuard/1.0"}) as http_client:
            response = await http_client.get(f"https://rdap.org/domain/{domain}")
            response.raise_for_status()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"WHOIS lookup failed: {exc}")

    payload = response.json()
    events = payload.get("events", [])
    entities = payload.get("entities", [])
    registrar = "Unknown"
    registrant_country = "Unknown"
    for entity in entities:
        roles = set(entity.get("roles", []))
        vcard = entity.get("vcardArray", [None, []])[1]
        for entry in vcard:
            if len(entry) < 4:
                continue
            key = entry[0]
            value = entry[3]
            if "registrar" in roles and key == "fn" and registrar == "Unknown":
                registrar = value
            if "registrant" in roles and key == "adr" and isinstance(value, list) and value:
                registrant_country = value[-1] or registrant_country

    name_servers = [
        item.get("ldhName")
        for item in payload.get("nameservers", [])
        if item.get("ldhName")
    ][:10]
    statuses = payload.get("status", [])[:8]
    result = {
        "domain": domain,
        "registrar": registrar,
        "creation_date": first_rdap_event(events, {"registration", "created"}),
        "expiration_date": first_rdap_event(events, {"expiration", "expiry"}),
        "updated_date": first_rdap_event(events, {"last changed", "last update of RDAP database", "updated"}),
        "status": statuses,
        "name_servers": name_servers,
        "registrant_country": registrant_country,
        "dnssec": "signed" if payload.get("secureDNS", {}).get("delegationSigned") else "unsigned",
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

@api_router.post("/tools/threat-intelligence")
async def threat_intelligence_dashboard(user=Depends(get_current_user)):
    async with httpx.AsyncClient(timeout=20, headers={"User-Agent": "CyberGuard/1.0"}) as http_client:
        try:
            feodo_response, kev_response = await asyncio.gather(
                http_client.get("https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json"),
                http_client.get("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"),
            )
            feodo_response.raise_for_status()
            kev_response.raise_for_status()
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Threat intelligence feeds unavailable: {exc}")

    botnet_rows = feodo_response.json()[:120]
    kev_catalog = kev_response.json()
    kev_rows = kev_catalog.get("vulnerabilities", [])[:60]
    country_counts = Counter(row.get("country", "Unknown") for row in botnet_rows)
    malware_counts = Counter(row.get("malware", "Unknown") for row in botnet_rows)
    day_counts = Counter(row.get("first_seen", "")[:10] for row in botnet_rows if row.get("first_seen"))
    top_days = sorted(day_counts.items(), key=lambda item: item[0], reverse=True)[:6]
    top_vendors = Counter(row.get("vendorProject", "Unknown") for row in kev_rows).most_common(5)

    alerts = [{
        "id": row.get("cveID"),
        "severity": "critical" if row.get("knownRansomwareCampaignUse") == "Known" else "high",
        "title": row.get("vulnerabilityName"),
        "source": row.get("vendorProject"),
        "time": row.get("dateAdded"),
    } for row in kev_rows[:5]]
    attack_map = [{"country": country, "count": count} for country, count in country_counts.most_common(8)]
    malware_trends = [{"family": family, "detections": count} for family, count in malware_counts.most_common(6)]
    timeline = [{"label": day, "attacks": count} for day, count in reversed(top_days)]
    await db.tool_history.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "tool_name": "Threat Intelligence Dashboard",
        "input_data": "live-feed",
        "result_summary": f"{len(alerts)} active alerts generated",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {
        "alerts": alerts,
        "attack_map": attack_map,
        "malware_trends": malware_trends,
        "timeline": timeline,
        "sources": [
            {"name": "Abuse.ch Feodo Tracker", "updated": datetime.now(timezone.utc).isoformat()},
            {"name": "CISA Known Exploited Vulnerabilities", "updated": kev_catalog.get("dateReleased")},
        ],
        "vendor_trends": [{"vendor": vendor, "count": count} for vendor, count in top_vendors],
        "catalog_version": kev_catalog.get("catalogVersion"),
    }

@api_router.post("/tools/dark-web-scanner")
async def dark_web_scanner(data: ToolInput, user=Depends(get_current_user)):
    target = data.target.strip().lower()
    if not HIBP_API_KEY:
        result = {
            "target": target,
            "configured": False,
            "found": None,
            "risk_score": None,
            "entries": [],
            "recommendations": ["Set HIBP_API_KEY to enable real breach lookups via Have I Been Pwned."],
            "source": "Have I Been Pwned",
        }
    else:
        encoded_target = quote(target, safe="")
        async with httpx.AsyncClient(timeout=20, headers={"hibp-api-key": HIBP_API_KEY, "user-agent": "CyberGuard/1.0"}) as http_client:
            response = await http_client.get(
                f"https://haveibeenpwned.com/api/v3/breachedaccount/{encoded_target}",
                params={"truncateResponse": "false", "includeUnverified": "true"},
            )
        if response.status_code == 404:
            result = {
                "target": target,
                "configured": True,
                "found": False,
                "risk_score": 0,
                "entries": [],
                "recommendations": ["No public breach records found for this account in HIBP."],
                "source": "Have I Been Pwned",
            }
        elif response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"HIBP lookup failed with status {response.status_code}")
        else:
            breaches = response.json()
            entries = [{
                "source": item.get("Name"),
                "domain": item.get("Domain"),
                "year": item.get("BreachDate"),
                "risk": "high" if item.get("IsSensitive") or item.get("IsVerified") else "medium",
                "exposed": ", ".join(item.get("DataClasses", [])[:5]),
                "verified": item.get("IsVerified"),
            } for item in breaches]
            result = {
                "target": target,
                "configured": True,
                "found": True,
                "risk_score": min(100, 25 + len(entries) * 18),
                "entries": entries,
                "recommendations": [
                    "Rotate passwords reused across breached services",
                    "Enable MFA on primary email and financial accounts",
                    "Review exposed data classes and watch for phishing or account recovery abuse",
                ],
                "source": "Have I Been Pwned",
            }
    await db.tool_history.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "tool_name": "Dark Web Scanner",
        "input_data": target,
        "result_summary": "Potential exposures found" if result.get("found") else ("Not configured" if result.get("found") is None else "No exposure detected"),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return result

@api_router.post("/tools/file-malware-scanner")
async def file_malware_scanner(file: UploadFile = File(...), user=Depends(get_current_user)):
    content = await file.read()
    sha256_hash = hashlib.sha256(content).hexdigest()
    result = {
        "filename": file.filename,
        "size": len(content),
        "sha256": sha256_hash,
        "configured": bool(VIRUSTOTAL_API_KEY),
        "source": "VirusTotal",
    }
    if not VIRUSTOTAL_API_KEY:
        result.update({
            "status": "Unavailable",
            "engine_count": 0,
            "detections": 0,
            "signature_hits": [{"engine": "CyberGuard", "category": "info", "result": "Set VIRUSTOTAL_API_KEY for real malware verdicts"}],
        })
    else:
        headers = {"x-apikey": VIRUSTOTAL_API_KEY}
        async with httpx.AsyncClient(timeout=45, headers=headers) as http_client:
            lookup = await http_client.get(f"https://www.virustotal.com/api/v3/files/{sha256_hash}")
            if lookup.status_code == 404:
                files = {"file": (file.filename, content, file.content_type or "application/octet-stream")}
                upload = await http_client.post("https://www.virustotal.com/api/v3/files", files=files)
                if upload.status_code not in {200, 201}:
                    raise HTTPException(status_code=502, detail=f"VirusTotal upload failed with status {upload.status_code}")
                analysis_id = upload.json().get("data", {}).get("id")
                if analysis_id:
                    for _ in range(8):
                        await asyncio.sleep(2)
                        analysis = await http_client.get(f"https://www.virustotal.com/api/v3/analyses/{analysis_id}")
                        if analysis.status_code == 200 and analysis.json().get("data", {}).get("attributes", {}).get("status") == "completed":
                            break
                lookup = await http_client.get(f"https://www.virustotal.com/api/v3/files/{sha256_hash}")
            if lookup.status_code != 200:
                raise HTTPException(status_code=502, detail=f"VirusTotal lookup failed with status {lookup.status_code}")
            result.update(vt_analysis_summary(lookup.json()))
    await db.tool_history.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "tool_name": "File Malware Scanner",
        "input_data": file.filename,
        "result_summary": result["status"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return result

@api_router.post("/tools/hash-generator")
async def hash_generator(data: ToolInput):
    text = data.target
    encoded = text.encode("utf-8")
    return {
        "input_length": len(text),
        "md5": hashlib.md5(encoded).hexdigest(),
        "sha1": hashlib.sha1(encoded).hexdigest(),
        "sha256": hashlib.sha256(encoded).hexdigest(),
        "sha512": hashlib.sha512(encoded).hexdigest(),
    }


@api_router.post("/recon/start")
async def start_recon_scan(data: ReconStartRequest, user=Depends(get_current_user)):
    domain = validate_domain_input(data.domain)
    active_scan = next(
        (
            scan for scan in recon_scans.values()
            if scan["user_id"] == user["id"] and scan["status"] in {"queued", "running"}
        ),
        None,
    )
    if active_scan:
        raise HTTPException(status_code=409, detail="A recon scan is already running for this user")

    scan_id = str(uuid.uuid4())
    scan = {
        "id": scan_id,
        "user_id": user["id"],
        "domain": domain,
        "status": "queued",
        "progress": 0,
        "stage": {"key": "queued", "label": "Queued", "progress": 0},
        "started_at": datetime.now(timezone.utc).isoformat(),
        "finished_at": None,
        "report_id": None,
        "error": None,
        "subscribers": set(),
        "result": {
            "subdomains": [],
            "live_hosts": [],
            "ports": [],
            "urls": [],
            "logs": [f"[queue] Recon request accepted for {domain}"],
        },
    }
    recon_scans[scan_id] = scan
    asyncio.create_task(run_recon_scan(scan_id))
    return {"scan_id": scan_id, "domain": domain, "status": scan["status"]}


@api_router.get("/recon/capabilities")
async def get_recon_capabilities(user=Depends(get_current_user)):
    snapshot = get_recon_capability_snapshot()
    latest_reports = await db.recon_reports.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(6)
    snapshot["recent_reports"] = latest_reports
    active_scan = next(
        (
            {
                "id": scan["id"],
                "domain": scan["domain"],
                "status": scan["status"],
                "progress": scan["progress"],
                "stage": scan["stage"],
                "started_at": scan["started_at"],
            }
            for scan in recon_scans.values()
            if scan["user_id"] == user["id"] and scan["status"] in {"queued", "running"}
        ),
        None,
    )
    snapshot["active_scan"] = active_scan
    return snapshot


@api_router.get("/recon/reports")
async def list_recon_reports(user=Depends(get_current_user)):
    reports = await db.recon_reports.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return reports


@api_router.get("/recon/reports/{report_id}")
async def get_recon_report(report_id: str, user=Depends(get_current_user)):
    report = await db.recon_reports.find_one({"id": report_id, "user_id": user["id"]}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Recon report not found")
    return report

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
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="AI chat is not available in this deployment.",
        )
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
        "ai_conversations": await db.chat_messages.count_documents({"user_id": user["id"]}),
        "active_sessions": await db.auth_sessions.count_documents({"user_id": user["id"], "revoked_at": None}),
        "login_alerts": await db.login_alerts.count_documents({"user_id": user["id"]}),
    }

@api_router.get("/dashboard/history")
async def get_dashboard_history(user=Depends(get_current_user)):
    return await db.tool_history.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)

@api_router.get("/health")
async def health_check():
    db_ok = False
    if client is not None:
        try:
            await client.admin.command("ping")
            db_ok = True
        except Exception:
            db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else ("unavailable" if client is not None else "not-configured"),
        "environment": "vercel" if os.environ.get("VERCEL") else "local",
        "ssh_terminal": "disabled" if not ssh_terminal_available() else "enabled",
    }

# ── Security Routes ────────────────────────────────────
@api_router.get("/security/sessions")
async def list_sessions(user=Depends(get_current_user)):
    return await db.auth_sessions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(20)

@api_router.post("/security/sessions/revoke")
async def revoke_session(data: SessionRevokeRequest, user=Depends(get_current_user)):
    result = await db.auth_sessions.update_one(
        {"id": data.session_id, "user_id": user["id"]},
        {"$set": {"revoked_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session revoked"}

@api_router.get("/security/login-alerts")
async def list_login_alerts(user=Depends(get_current_user)):
    return await db.login_alerts.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(20)

@api_router.post("/security/2fa")
async def toggle_two_factor(data: TwoFactorToggle, user=Depends(get_current_user)):
    if data.enabled and not GMAIL_APP_PASSWORD:
        raise HTTPException(status_code=400, detail="Email delivery must be configured before enabling 2FA")
    await db.users.update_one({"id": user["id"]}, {"$set": {"two_factor_enabled": data.enabled}})
    return {"message": f"2FA {'enabled' if data.enabled else 'disabled'}", "enabled": data.enabled}

# ── Plans Routes ────────────────────────────────────────
PLANS = [
    {"id": "live-class", "name": "Live Classes", "price": 500, "currency": "INR", "period": "month", "features": ["Live interactive sessions", "Real-time Q&A", "Hands-on labs", "Certificate of completion", "Discord community access"], "popular": True},
    {"id": "recorded-class", "name": "Recorded Classes", "price": 299, "currency": "INR", "period": "month", "features": ["Self-paced learning", "HD video lectures", "Downloadable resources", "Practice exercises", "Lifetime access"]},
    {"id": "free-demo", "name": "Free Demo (7 days)", "price": 0, "currency": "INR", "period": "7 days", "features": ["Access to 3 demo classes", "Preview of all courses", "Limited lab access", "Email support"], "note": f"For gokali.pro subscribers: Send subscription screenshot to {support_email()} for free 7-day demo access."},
]

ROADMAP_TASK_TEMPLATES = [
    {"category": "spatial", "title": "Import live site context", "summary": "Bring terrain, trees, and nearby buildings from real map context into the project scene.", "priority": "high"},
    {"category": "spatial", "title": "Align model with GIS or KML data", "summary": "Use KML, KMZ, or GIS layers for accurate coordinates, solar studies, and site impact checks.", "priority": "high"},
    {"category": "software", "title": "Replace static datasets with live APIs", "summary": "Move demo CSV or mocked data to real live data providers wherever possible.", "priority": "high"},
    {"category": "software", "title": "Use a real cloud database", "summary": "Store app data in MongoDB Atlas or SQL instead of local-only files or temporary state.", "priority": "high"},
    {"category": "software", "title": "Ship authentication and CRUD", "summary": "Support real user login plus create, read, update, and delete flows that mirror production apps.", "priority": "medium"},
    {"category": "delivery", "title": "Automate CI and deployment", "summary": "Add GitHub Actions or similar pipeline for tests, builds, and deployments.", "priority": "medium"},
    {"category": "delivery", "title": "Deploy to a real URL", "summary": "Publish the application to Vercel, AWS, or another host and document the environment setup.", "priority": "high"},
    {"category": "delivery", "title": "Document inputs and blockers", "summary": "Track API keys, cloud access, deployment credentials, and pending decisions in one place.", "priority": "medium"},
]

ROADMAP_CATEGORIES = {"spatial", "software", "delivery"}
ROADMAP_PRIORITIES = {"low", "medium", "high"}
ROADMAP_STATUSES = {"pending", "in_progress", "done"}


def build_roadmap_task(user_id: str, title: str, category: str, summary: str, priority: str = "medium", status: str = "pending", source: str = "custom") -> dict:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title.strip(),
        "category": category.strip().lower(),
        "summary": summary.strip(),
        "priority": priority.strip().lower(),
        "status": status.strip().lower(),
        "source": source,
        "created_at": now,
        "updated_at": now,
        "completed_at": now if status == "done" else None,
    }

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

@api_router.get("/roadmap/tasks")
async def list_roadmap_tasks(user=Depends(get_current_user)):
    tasks = await db.roadmap_tasks.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", 1).to_list(200)
    if tasks:
        return tasks

    seeded_tasks = [
        build_roadmap_task(
            user["id"],
            item["title"],
            item["category"],
            item["summary"],
            priority=item["priority"],
            source="template",
        )
        for item in ROADMAP_TASK_TEMPLATES
    ]
    if seeded_tasks:
        await db.roadmap_tasks.insert_many(seeded_tasks)
        for task in seeded_tasks:
            task.pop("_id", None)
    return seeded_tasks


@api_router.post("/roadmap/tasks")
async def create_roadmap_task(data: RoadmapTaskCreate, user=Depends(get_current_user)):
    category = data.category.strip().lower()
    priority = data.priority.strip().lower()
    if category not in ROADMAP_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid roadmap category")
    if priority not in ROADMAP_PRIORITIES:
        raise HTTPException(status_code=400, detail="Invalid roadmap priority")
    task = build_roadmap_task(user["id"], data.title, category, data.summary, priority=priority, source="custom")
    await db.roadmap_tasks.insert_one(task)
    task.pop("_id", None)
    return task


@api_router.patch("/roadmap/tasks/{task_id}")
async def update_roadmap_task(task_id: str, data: RoadmapTaskUpdate, user=Depends(get_current_user)):
    task = await db.roadmap_tasks.find_one({"id": task_id, "user_id": user["id"]}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Roadmap task not found")

    updates = {}
    if data.title is not None:
        updates["title"] = data.title.strip()
    if data.summary is not None:
        updates["summary"] = data.summary.strip()
    if data.category is not None:
        category = data.category.strip().lower()
        if category not in ROADMAP_CATEGORIES:
            raise HTTPException(status_code=400, detail="Invalid roadmap category")
        updates["category"] = category
    if data.priority is not None:
        priority = data.priority.strip().lower()
        if priority not in ROADMAP_PRIORITIES:
            raise HTTPException(status_code=400, detail="Invalid roadmap priority")
        updates["priority"] = priority
    if data.status is not None:
        status = data.status.strip().lower()
        if status not in ROADMAP_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid roadmap status")
        updates["status"] = status
        updates["completed_at"] = datetime.now(timezone.utc).isoformat() if status == "done" else None

    if not updates:
        return task

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.roadmap_tasks.update_one({"id": task_id, "user_id": user["id"]}, {"$set": updates})
    task.update(updates)
    return task


@api_router.delete("/roadmap/tasks/{task_id}")
async def delete_roadmap_task(task_id: str, user=Depends(get_current_user)):
    result = await db.roadmap_tasks.delete_one({"id": task_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Roadmap task not found")
    return {"message": "Roadmap task deleted"}

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
    await ensure_database_backend()

    # Seed admin account
    admin_username = os.environ.get('ADMIN_USERNAME', '').strip()
    admin_password = os.environ.get('ADMIN_PASSWORD', '').strip()
    admin_email = os.environ.get('ADMIN_EMAIL', '').strip()
    if not all([admin_username, admin_password, admin_email]):
        logger.warning("Admin seed skipped. Set ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_EMAIL.")
        return
    try:
        existing_admin = await db.users.find_one({"username": admin_username})
        if not existing_admin:
            admin_doc = {
                "id": str(uuid.uuid4()), "email": admin_email, "username": admin_username,
                "password_hash": pwd_context.hash(admin_password), "role": "admin",
                "email_verified": True, "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(admin_doc)
            logger.info(f"Admin account created: {admin_username}")

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
    except PyMongoError as exc:
        logger.warning("Startup seed skipped because database is unavailable: %s", exc)

# ── WebSocket SSH Terminal ──────────────────────────────
@app.websocket("/api/ws/recon/{scan_id}")
async def websocket_recon(websocket: WebSocket, scan_id: str):
    await websocket.accept()
    token = websocket.query_params.get("token")
    if not token:
        await websocket.send_json({"type": "error", "message": "Authentication token missing"})
        await websocket.close(code=4001)
        return

    try:
        require_jwt_secret()
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        session = await db.auth_sessions.find_one({"id": payload.get("sid")}, {"_id": 0})
        if not session or session.get("revoked_at"):
            await websocket.send_json({"type": "error", "message": "Session expired"})
            await websocket.close(code=4001)
            return
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            await websocket.send_json({"type": "error", "message": "User not found"})
            await websocket.close(code=4001)
            return
    except Exception:
        await websocket.send_json({"type": "error", "message": "Invalid or expired session token"})
        await websocket.close(code=4001)
        return

    scan = recon_scans.get(scan_id)
    if scan is None:
        report = await db.recon_reports.find_one({"id": scan_id, "user_id": user["id"]}, {"_id": 0})
        if report:
            await websocket.send_json({
                "type": "snapshot",
                "scan_id": report["id"],
                "status": report["status"],
                "domain": report["domain"],
                "progress": report.get("progress", 100),
                "stage": get_recon_stage(report.get("stage", "complete")),
                "started_at": report.get("created_at"),
                "finished_at": report.get("finished_at"),
                "logs": report.get("result", {}).get("logs", [])[-250:],
                "result": report.get("result", {}),
                "report_id": report["id"],
                "error": report.get("error"),
            })
            await websocket.close()
            return
        await websocket.send_json({"type": "error", "message": "Recon scan not found"})
        await websocket.close(code=4404)
        return

    if scan["user_id"] != user["id"]:
        await websocket.send_json({"type": "error", "message": "Forbidden"})
        await websocket.close(code=4003)
        return

    scan["subscribers"].add(websocket)
    await websocket.send_json(build_recon_snapshot(scan))
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        scan["subscribers"].discard(websocket)
    except Exception:
        scan["subscribers"].discard(websocket)


# ── WebSocket Docker SSH ────────────────────────────────
@app.websocket("/api/ws/docker-ssh/{node_id}")
async def websocket_docker_ssh(websocket: WebSocket, node_id: str):
    await websocket.accept()
    user = await authenticate_websocket_user(websocket)
    if not user:
        return

    node = DOCKER_SSH_NODES.get(node_id)
    if not node:
        await websocket.send_text("\r\nUnknown Docker SSH node.\r\n")
        await websocket.close(code=4404)
        return

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: ssh.connect(
                hostname=node["host"],
                port=node["port"],
                username=node["username"],
                password=node["password"],
                timeout=15,
                look_for_keys=False,
                allow_agent=False,
            ),
        )
        channel = ssh.invoke_shell(term='xterm-256color', width=120, height=30)
        await websocket.send_text(f"\r\n[DockerSSH] Connected to {node['label']} ({node['host']}:{node['port']})\r\n")

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
                    try:
                        payload = json.loads(data)
                    except Exception:
                        payload = None

                    if isinstance(payload, dict) and payload.get("type") == "resize":
                        cols = int(payload.get("cols", 120) or 120)
                        rows = int(payload.get("rows", 30) or 30)
                        channel.resize_pty(width=max(40, cols), height=max(12, rows))
                    elif isinstance(payload, dict) and payload.get("type") == "input":
                        channel.send(payload.get("data", ""))
                    else:
                        channel.send(data)
        except WebSocketDisconnect:
            pass
        finally:
            read_task.cancel()
            channel.close()
    except Exception as e:
        try:
            await websocket.send_text(f"\r\nDocker SSH Error: {str(e)}\r\n")
        except Exception:
            pass
    finally:
        ssh.close()
        try:
            await websocket.close()
        except Exception:
            pass


# ── WebSocket SSH Terminal ──────────────────────────────
@app.websocket("/api/ws/terminal")
async def websocket_terminal(websocket: WebSocket):
    if not ssh_terminal_available():
        await websocket.accept()
        await websocket.send_text("\r\nSSH terminal is disabled on Vercel deployments.\r\n")
        await websocket.close(code=1008)
        return

    await websocket.accept()
    user = await authenticate_websocket_user(websocket)
    if not user:
        return
    if user.get("role") != "admin":
        await websocket.send_text("\r\nAdmin access required.\r\n")
        await websocket.close(code=4003)
        return

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
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=os.environ.get('CORS_ORIGINS', '*') != '*',
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

if (FRONTEND_BUILD_DIR / "static").exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_BUILD_DIR / "static")), name="frontend-static")


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    if not FRONTEND_BUILD_DIR.exists():
        raise HTTPException(status_code=404, detail="Frontend build not found")

    candidate = (FRONTEND_BUILD_DIR / full_path).resolve()
    try:
        candidate.relative_to(FRONTEND_BUILD_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=404, detail="Not found")

    if full_path and candidate.exists() and candidate.is_file():
        return FileResponse(candidate)

    index_file = FRONTEND_BUILD_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Frontend entrypoint not found")

@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()
