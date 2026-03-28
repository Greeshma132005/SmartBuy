from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from supabase import create_client, Client

from app.config import get_settings


# ── Supabase REST Client ──────────────────────────────────────────────────────

def get_supabase_client() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_key)


_client: Client | None = None


def get_db() -> Client:
    global _client
    if _client is None:
        _client = get_supabase_client()
    return _client


# ── SQLAlchemy Engine & Session ───────────────────────────────────────────────

_engine = None
_SessionLocal = None


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), autocommit=False, autoflush=False)
    return _SessionLocal


def get_session() -> Session:
    """Get a new SQLAlchemy session. Use as a context manager or close manually."""
    factory = get_session_factory()
    return factory()
