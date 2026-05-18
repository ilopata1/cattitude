"""PostgreSQL connection string helpers for LlamaIndex PGVectorStore."""


def postgres_connection_strings(database_url: str) -> tuple[str, str]:
    """
    Build sync (psycopg2) and async (asyncpg) SQLAlchemy URLs from DATABASE_URL.

    PGVectorStore.from_params() requires both; if async_connection_string is
    omitted it builds one from host/port/user/password, which are None when only
    connection_string is supplied.
    """
    url = database_url.strip()
    if url.startswith("postgresql+psycopg2://"):
        sync = url
        async_url = url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql+asyncpg://"):
        async_url = url
        sync = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://"):
        sync = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        async_url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        sync = url.replace("postgres://", "postgresql+psycopg2://", 1)
        async_url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    else:
        sync = url
        async_url = url
    return sync, async_url
