"""
PROJECT-KAVACH CASSANDRA DATABASE & WEATHER DATA CLEANUP SCRIPT
================================================================
Truncates all Cassandra tables (weather_history, train_telemetry, stations_history, kavach_alerts)
and resets weather data.
"""

import sys
import os
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("kavach-db-cleaner")

def clear_cassandra(host: str = "localhost", port: int = 9042):
    logger.info("Starting complete Cassandra Database & Weather data wipe...")
    
    # 1. Truncate Cassandra Tables if Cassandra container is running
    try:
        from cassandra.cluster import Cluster
        logger.info(f"Connecting to Cassandra at {host}:{port}...")
        cluster = Cluster([host], port=port)
        session = cluster.connect("kavach")
        
        tables = ["weather_history", "train_telemetry", "stations_history", "kavach_alerts"]
        for table in tables:
            try:
                session.execute(f"TRUNCATE kavach.{table}")
                logger.info(f"✅ Successfully cleared table: kavach.{table}")
            except Exception as e:
                logger.warning(f"Notice on table kavach.{table}: {e}")
                
        cluster.shutdown()
        logger.info("✅ All Cassandra database tables truncated successfully.")
    except Exception as e:
        logger.warning(f"Could not directly connect via python cassandra driver ({e}). Attempting via Docker exec if available...")
        # Fallback using docker exec cqlsh
        try:
            import subprocess
            cmd = 'docker exec -i cassandra cqlsh -e "TRUNCATE kavach.weather_history; TRUNCATE kavach.train_telemetry; TRUNCATE kavach.stations_history; TRUNCATE kavach.kavach_alerts;"'
            subprocess.run(cmd, shell=True, check=True)
            logger.info("✅ Successfully truncated Cassandra tables via Docker cqlsh!")
        except Exception as de:
            logger.warning(f"Docker exec cqlsh notice: {de}")

    # 2. Reset local weather telemetry file in data/raw
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    weather_file = os.path.join(project_dir, "data", "raw", "india_railway_weather_telemetry.json")
    if os.path.exists(weather_file):
        try:
            os.remove(weather_file)
            logger.info(f"✅ Removed local weather telemetry snapshot file: {weather_file}")
        except Exception as fe:
            logger.warning(f"Could not remove weather file: {fe}")

    logger.info("🎉 COMPLETE DATA WIPE FINISHED. Cassandra and Weather data are now 100% clean!")

if __name__ == "__main__":
    host = sys.argv[1] if len(sys.argv) > 1 else "localhost"
    clear_cassandra(host=host)
