import time
from collections import defaultdict, deque
from threading import Lock
from typing import Optional
from fastapi import HTTPException, Request, status
from app.config import settings


class InMemoryRateLimiter:
    """
    Sliding window in-memory rate limiter with separate limits:
    - Login: 5 attempts/min per (IP + email) AND 30 attempts/min per IP.
    - Register: 20 attempts/min per IP.
    - Client IP: Reads from X-Forwarded-For only when settings.TRUSTED_PROXY is True.
    """

    def __init__(self, window_seconds: int = 60):
        self.window_seconds = window_seconds
        self._records = defaultdict(deque)
        self._lock = Lock()
        self.enabled = True

    def get_client_ip(self, request: Request) -> str:
        """
        Extracts client IP. Respects X-Forwarded-For only when TRUSTED_PROXY is True.
        """
        if settings.TRUSTED_PROXY:
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                return forwarded.split(",")[0].strip()

        return request.client.host if request.client else "127.0.0.1"

    def _check_key(self, key: str, max_requests: int, now: float) -> None:
        cutoff = now - self.window_seconds
        queue = self._records[key]
        while queue and queue[0] < cutoff:
            queue.popleft()

        if len(queue) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many attempts. Rate limit exceeded ({max_requests} attempts per {self.window_seconds}s). Please try again later.",
            )
        queue.append(now)

    def check_login(self, request: Request, email: Optional[str] = None) -> None:
        """
        Login limits:
        1) 5 attempts per minute per (IP + email)
        2) 30 attempts per minute per IP
        """
        if not self.enabled:
            return

        now = time.time()
        client_ip = self.get_client_ip(request)

        with self._lock:
            # 1. Check (IP + email) combo limit: 5 / min
            if email:
                normalized_email = email.lower().strip()
                combo_key = f"login:combo:{client_ip}:{normalized_email}"
                self._check_key(combo_key, max_requests=5, now=now)

            # 2. Check IP-wide login limit: 30 / min
            ip_key = f"login:ip:{client_ip}"
            self._check_key(ip_key, max_requests=30, now=now)

    def check_register(self, request: Request) -> None:
        """
        Register limit:
        20 attempts per minute per IP
        """
        if not self.enabled:
            return

        now = time.time()
        client_ip = self.get_client_ip(request)

        with self._lock:
            ip_key = f"register:ip:{client_ip}"
            self._check_key(ip_key, max_requests=20, now=now)

    def reset(self) -> None:
        """Clear all rate limiting records (used in test isolation)."""
        with self._lock:
            self._records.clear()


auth_rate_limiter = InMemoryRateLimiter(window_seconds=60)
