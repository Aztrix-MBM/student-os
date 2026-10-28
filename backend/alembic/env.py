import sys
from os.path import abspath, dirname
from logging.config import fileConfig

from sqlalchemy import create_engine, pool

from alembic import context

# Ensure app is discoverable in python path
sys.path.insert(0, dirname(dirname(abspath(__file__))))

from app.config import settings
from app.models import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set database URL dynamically from environment (escaping % for configparser interpolation)
config.set_main_option("sqlalchemy.url", settings.sqlalchemy_database_url.replace("%", "%%"))

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = settings.sqlalchemy_database_url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(
        settings.sqlalchemy_database_url,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
