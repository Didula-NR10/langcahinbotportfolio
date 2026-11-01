from alembic import context
from sqlalchemy import create_engine, pool

from app.admin.models import Base
from app.core.config import get_settings

target_metadata = Base.metadata


def database_url():
    settings = get_settings()
    if settings.database_url is None:
        raise RuntimeError("DATABASE_URL is required for migrations")
    return settings.database_url.get_secret_value().replace("postgresql://", "postgresql+psycopg://", 1)


def run_migrations_offline():
    context.configure(url=database_url(), target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    engine = create_engine(database_url(), poolclass=pool.NullPool, hide_parameters=True)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
