import os
from pathlib import Path


TRUE_VALUES = {"1", "true", "yes", "on"}


def load_env_file(env_path):
    path = Path(env_path)
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        if value and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]

        os.environ.setdefault(key, value)


def env(key, default=None):
    return os.getenv(key, default)


def env_bool(key, default=False):
    value = os.getenv(key)
    if value is None:
        return default
    return value.strip().lower() in TRUE_VALUES


def env_int(key, default):
    value = os.getenv(key)
    if value is None or not value.strip():
        return default
    return int(value)


def env_list(key, default=None):
    value = os.getenv(key)
    if value is None:
        return list(default or [])
    return [item.strip() for item in value.split(",") if item.strip()]
