from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_key: str = ""  # service role key
    supabase_anon_key: str = ""
    database_url: str = ""  # PostgreSQL connection string for SQLAlchemy/Alembic
    backend_port: int = 8000
    frontend_url: str = "http://localhost:3000"
    scraper_api_key: str = ""
    scraping_delay_min: float = 2.0
    scraping_delay_max: float = 3.0
    scraping_interval_hours: int = 6

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
