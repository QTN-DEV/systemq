import asyncio
import os
import importlib
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv
from bullmq import Worker

from app.submodules.background_job import BaseQueue, BaseProcessor

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("workers")

async def main():
    app_dir = Path(__file__).parent.resolve()
    load_dotenv(app_dir.parent / ".env")
    
    if str(app_dir) not in sys.path:
        sys.path.insert(0, str(app_dir))

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    BaseQueue.register(redis_url)

    active_workers = []
    processors_map = {}
    queues_found = []

    logger.info(f"🔍 System Scan Started: {app_dir}")

    # 1. Discover Processors in **/processors/*.py
    # This looks for any file ending in .py inside any 'processors' folder
    for f in app_dir.glob("**/processors/*.py"):
        if f.name == "__init__.py": continue
        try:
            module_name = ".".join(f.relative_to(app_dir).with_suffix("").parts)
            module = importlib.import_module(module_name)
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if isinstance(attr, type) and issubclass(attr, BaseProcessor) and attr is not BaseProcessor:
                    instance = attr()
                    processors_map[instance.name] = instance
                    logger.info(f"🎯 Found Job: '{instance.name}' -> handled by {attr.__name__}")
        except Exception as e:
            logger.error(f"❌ Error loading processor {f.name}: {e}")

    # 2. Discover Queues in **/queues/*.py
    for f in app_dir.glob("**/queues/*.py"):
        if f.name == "__init__.py": continue
        try:
            module_name = ".".join(f.relative_to(app_dir).with_suffix("").parts)
            module = importlib.import_module(module_name)
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if isinstance(attr, type) and issubclass(attr, BaseQueue) and attr is not BaseQueue:
                    q_instance = attr()
                    queues_found.append(q_instance)
                    logger.info(f"🏗️  Found Queue: '{q_instance.name}' ({attr.__name__})")
        except Exception as e:
            logger.error(f"❌ Error loading queue {f.name}: {e}")

    # 3. Validation & Worker Initialization
    if not queues_found:
        logger.warning("⚠️ No queues found in 'queues' folders.")
        return

    logger.info(f"⚙️  Initializing {len(queues_found)} workers...")

    for q_instance in queues_found:
        try:
            async def process_bridge(job, job_id):
                processor = processors_map.get(job.name)
                if not processor:
                    logger.error(f"🚫 No registered processor for job name: '{job.name}' in queue '{q_instance.name}'")
                    raise Exception(f"Processor missing for {job.name}")
                return await processor.handle(job)

            worker = Worker(q_instance.name, process_bridge, {"connection": redis_url})
            active_workers.append(worker)
            logger.info(f"✅ Worker Live: {q_instance.name}")
        except Exception as e:
            logger.error(f"❌ Failed to start worker for {q_instance.name}: {e}")

    logger.info(f"🚀 All systems go. {len(active_workers)} workers monitoring Redis.")
    await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("👋 Shutdown signal received.")