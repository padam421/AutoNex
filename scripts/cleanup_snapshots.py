import os
import glob
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("cleanup_snapshots")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")

def cleanup():
    logger.info(f"Starting snapshot cleanup in {DATA_DIR}...")
    
    patterns = [
        os.path.join(DATA_DIR, "raw", "*snapshot*.*"),
        os.path.join(DATA_DIR, "ml_ready_dataset", "*snapshot*.*"),
        os.path.join(DATA_DIR, "geojson", "*snapshot*.*")
    ]
    
    deleted_count = 0
    freed_bytes = 0
    
    for pattern in patterns:
        files = glob.glob(pattern)
        for filepath in files:
            try:
                size = os.path.getsize(filepath)
                os.remove(filepath)
                deleted_count += 1
                freed_bytes += size
                logger.info(f"Deleted snapshot file: {os.path.basename(filepath)} ({size / 1024:.1f} KB)")
            except Exception as e:
                logger.error(f"Failed to delete {filepath}: {e}")
                
    freed_mb = freed_bytes / (1024 * 1024)
    logger.info(f"✅ Cleanup Complete! Deleted {deleted_count} snapshot files. Freed {freed_mb:.2f} MB of disk space.")

if __name__ == "__main__":
    cleanup()
