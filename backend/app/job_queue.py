from __future__ import annotations

from redis import Redis
from rq import Queue

from .config import settings


def connection() -> Redis:
    return Redis.from_url(settings.redis_url)


def queue() -> Queue:
    return Queue(settings.queue_name, connection=connection(), default_timeout=7200)


def enqueue(func: str, object_id: str, *, job_id: str | None = None, timeout: int = 7200) -> str:
    job = queue().enqueue(
        func,
        object_id,
        job_id=job_id,
        job_timeout=timeout,
        result_ttl=86400,
        failure_ttl=604800,
    )
    return str(job.id)
