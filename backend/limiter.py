from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared across main.py (handler wiring) and api/sessions.py (route decorators).
# Per-IP by default; behind a proxy set the app to trust X-Forwarded-For.
limiter = Limiter(key_func=get_remote_address)
