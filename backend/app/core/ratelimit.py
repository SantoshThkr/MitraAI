import time
import uuid
from collections import defaultdict, deque


class RateLimiter:
    """Fixed-window counter held in process memory.

    Adequate for a single-process MVP; a multi-worker deployment would need shared state.
    """

    def __init__(self, limit: int, window_seconds: float = 60.0) -> None:
        self._limit = limit
        self._window = window_seconds
        self._hits: dict[uuid.UUID, deque[float]] = defaultdict(deque)

    def allow(self, key: uuid.UUID) -> bool:
        now = time.monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] >= self._window:
            hits.popleft()

        if len(hits) >= self._limit:
            return False

        hits.append(now)
        return True

    def reset(self) -> None:
        self._hits.clear()
