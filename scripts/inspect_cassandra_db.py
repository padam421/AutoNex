"""
PROJECT-KAVACH CASSANDRA DATABASE INSPECTION TOOL
=================================================
Run this script anytime to inspect row counts, tables, and sample data in Cassandra:
    python scripts/inspect_cassandra_db.py
"""

import os
import sys
import subprocess
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("kavach-db-inspector")

def inspect_cassandra(host: str = "localhost", port: int = 9042):
    tables = ["api_responses_vault", "train_telemetry", "kavach_alerts", "weather_history"]
    
    # Try Python Cassandra driver first
    try:
        from cassandra.cluster import Cluster
        import pandas as pd
        logger.info(f"Connecting to Cassandra Database at {host}:{port}...")
        cluster = Cluster([host], port=port)
        session = cluster.connect("kavach")
        
        print("\n" + "="*80)
        print("PROJECT-KAVACH CASSANDRA DB INSPECTION & CONTENT REPORT")
        print("="*80)
        
        for table in tables:
            try:
                count_res = session.execute(f"SELECT count(*) FROM kavach.{table}")
                total_rows = count_res.one()[0]
                print(f"\nTable Name: kavach.{table}")
                print(f"   Total Rows / Lines: {total_rows}")
                
                rows = session.execute(f"SELECT * FROM kavach.{table} LIMIT 5")
                df = pd.DataFrame(list(rows))
                
                if not df.empty:
                    print(f"   Format / Columns ({len(df.columns)}):", list(df.columns))
                    print("   Content Preview (First 5 Rows):")
                    print("-" * 80)
                    for idx, row in df.iterrows():
                        print(f"   Row #{idx+1}:")
                        for col in df.columns:
                            val = str(row[col])
                            if len(val) > 120:
                                val = val[:117] + "..."
                            print(f"     * {col}: {val}")
                        print("     " + "-"*40)
                else:
                    print("   Table is currently empty (0 rows).")
            except Exception as te:
                print(f"Table: kavach.{table} (Notice: {te})")
                
        print("\n" + "="*80 + "\n")
        cluster.shutdown()
        return
    except Exception as e:
        logger.warning(f"Host Python driver skipped ({e}). Using Docker cqlsh interface...")

    # Docker cqlsh interface (Always works on Windows host!)
    print("\n" + "="*80)
    print("PROJECT-KAVACH CASSANDRA DB INSPECTION REPORT (DOCKER CONTAINER)")
    print("="*80)
    for tbl in tables:
        try:
            cmd = f'docker exec cassandra cqlsh -e "SELECT count(*) FROM kavach.{tbl}; SELECT * FROM kavach.{tbl} LIMIT 3;"'
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding="utf-8", errors="ignore")
            print(f"\nTable Name: kavach.{tbl}")
            if res.stdout:
                print(res.stdout)
            else:
                print(f"Notice: {res.stderr}")
        except Exception as de:
            print(f"Error querying table {tbl}: {de}")
    print("="*80 + "\n")

if __name__ == "__main__":
    host = sys.argv[1] if len(sys.argv) > 1 else "localhost"
    inspect_cassandra(host=host)
