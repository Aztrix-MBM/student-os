import hashlib
import threading
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from app.config import settings


class SyllabusCacheManager:
    """
    Thread-safe in-memory cache and per-user daily rate limiter for Syllabus AI.
    - Caches extracted JSON trees by SHA-256 hash of normalized text.
    - Enforces max extractions per day per user (e.g. 5/day).
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._cache: Dict[str, Dict[str, Any]] = {}
        # user_id -> { "YYYY-MM-DD": count }
        self._daily_usage: Dict[str, Dict[str, int]] = {}

    @staticmethod
    def compute_hash(text: str) -> str:
        """Computes SHA-256 hex digest for normalized syllabus text."""
        normalized = " ".join(text.strip().split())
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def get_cached_draft(self, text_hash: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._cache.get(text_hash)

    def set_cached_draft(self, text_hash: str, draft: Dict[str, Any]) -> None:
        with self._lock:
            self._cache[text_hash] = draft

    def check_and_increment_usage(
        self, user_id: str, max_daily: int = settings.SYLLABUS_DAILY_LIMIT_PER_USER
    ) -> Tuple[bool, int, int]:
        """
        Checks if the user has reached their daily extraction limit.
        If under limit, increments count and returns (True, used_today, remaining_today).
        If limit exceeded, returns (False, used_today, 0).
        """
        today_key = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        with self._lock:
            if user_id not in self._daily_usage:
                self._daily_usage[user_id] = {}

            current_count = self._daily_usage[user_id].get(today_key, 0)
            if current_count >= max_daily:
                return False, current_count, 0

            new_count = current_count + 1
            self._daily_usage[user_id][today_key] = new_count
            remaining = max(0, max_daily - new_count)
            return True, new_count, remaining

    def get_user_limits(
        self, user_id: str, max_daily: int = settings.SYLLABUS_DAILY_LIMIT_PER_USER
    ) -> Dict[str, int]:
        today_key = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        with self._lock:
            usage_map = self._daily_usage.get(user_id, {})
            used = usage_map.get(today_key, 0)
            remaining = max(0, max_daily - used)
            return {
                "limit": max_daily,
                "used_today": used,
                "remaining_today": remaining,
            }

    def clear(self) -> None:
        """Helper for test suites to reset cache & rate limits."""
        with self._lock:
            self._cache.clear()
            self._daily_usage.clear()


syllabus_cache = SyllabusCacheManager()
