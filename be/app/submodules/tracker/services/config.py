"""TrackerConfig service."""

from __future__ import annotations

from app.submodules.tracker.models.config import TrackerConfig

_DEFAULTS = {
    "planning_status": ["planned", "active", "halted", "done", "canceled"],
    "issue_status": ["triage", "todo", "backlog", "in_progress", "in_review", "done", "canceled"],
}


async def ensure_default_config() -> None:
    for config_type, values in _DEFAULTS.items():
        existing = await TrackerConfig.find_one(TrackerConfig.config_type == config_type)
        if existing is None:
            await TrackerConfig(config_type=config_type, values=values).insert()


async def get_config(config_type: str) -> dict:
    cfg = await TrackerConfig.find_one(TrackerConfig.config_type == config_type)
    if cfg is None:
        return {"config_type": config_type, "values": _DEFAULTS.get(config_type, []), "updated_at": None}
    return {"config_type": cfg.config_type, "values": cfg.values, "updated_at": cfg.updated_at}


async def get_allowed_statuses(config_type: str) -> list[str]:
    cfg = await TrackerConfig.find_one(TrackerConfig.config_type == config_type)
    if cfg is None:
        return _DEFAULTS.get(config_type, [])
    return cfg.values


async def update_config(config_type: str, values: list[str]) -> dict:
    cfg = await TrackerConfig.find_one(TrackerConfig.config_type == config_type)
    if cfg is None:
        cfg = TrackerConfig(config_type=config_type, values=values)
        await cfg.insert()
    else:
        cfg.values = values
        await cfg.touch()
    return {"config_type": cfg.config_type, "values": cfg.values, "updated_at": cfg.updated_at}
