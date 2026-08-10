# 🐳 Docker + Apache Tools — Complete Master Architecture Guide (PROJECT-KAVACH SIH)

Ye guide tujhe **beginning se end tak** samjhayegi — Docker kya hai, Apache aur Custom Tools kya karte hain, aur ye sab ek chain mein kaise kaam karte hain.

---

## 📦 PART 1: Docker — Kya Hai Ye?

### Real-Life Analogy

```
Soch tu apne dost ke ghar khana banana chahta hai.
Par uske ghar pe:
  ❌ Tere wala gas stove nahi hai
  ❌ Tere wale masale nahi hain
  ❌ Tere wale bartan nahi hain

Toh kya karega? 🤔

SOLUTION: Tu apna poora kitchen ek DABBA (container) mein pack karega:
  ✅ Gas stove
  ✅ Saare masale
  ✅ Bartan
  ✅ Recipe book

Ab ye dabba kisi ke bhi ghar le jao — same khana banega! 🎉

DOCKER = WO DABBA
```

### Technical Explanation

Docker ek tool hai jo **software ko ek sealed box (container) mein pack** karta hai. Is box mein sab kuch hota hai:
- Application ka code
- Uski saari dependencies (libraries, tools)
- Operating system settings
- Configuration files

**Faayda:** Tere computer pe chalega, mere computer pe chalega, server pe chalega — **har jagah same chalega**.

---

### Docker Ke 4 Key Concepts

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  1. DOCKERFILE (Recipe)                                │
│     → Ek text file jismein likha hai:                  │
│       "Pehle Python install karo,                      │
│        phir ye files copy karo,                        │
│        phir ye command run karo"                       │
│                                                         │
│  2. IMAGE (Frozen Meal / Ready Package)                │
│     → Dockerfile se banti hai                          │
│     → Ye ek snapshot hai — change nahi hota            │
│     → Share kar sakte ho (DockerHub pe)                │
│                                                         │
│  3. CONTAINER (Running Instance)                       │
│     → Image ko "run" karo → Container banta hai        │
│     → Ye actually chal raha hota hai                   │
│     → Start/Stop/Delete kar sakte ho                   │
│     → Tumhare computer ko affect nahi karta            │
│                                                         │
│  4. DOCKER COMPOSE (Multi-Container Manager)           │
│     → Ek YAML file jismein likha hai:                  │
│       "Kafka bhi chalao, Ingestion Engine bhi chalao,  │
│        Processor, Flink, Spark, Cassandra, Grafana      │
│        — SAB EK SAATH!"                                │
│                                                         │
│     → Ek command se sab start:                         │
│       docker-compose up -d                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 PART 2: System Architecture — Tools & Services Ek Ek Karke Samjho

Tumhare PROJECT-KAVACH system mein **8 core services** ek unified pipeline mein kaam karti hain:

---

### 🔗 CHAIN OVERVIEW (Pehle Poori Pipeline Dekho)

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                                                                                  ║
║   DATA SOURCES                                                                   ║
║   (Open-Meteo Satellite, Overpass GIS,    ┌───────────────────────────────┐     ║
║    Indian Railways Master Datasets,  ───▶ │  INGESTION SERVICE (FastAPI)  │     ║
║    24/7 Telemetry Engine)                 └───────────────┬───────────────┘     ║
║                                                           │                     ║
║                                                           ▼                     ║
║                                           ┌───────────────────────────────┐     ║
║                                           │     APACHE KAFKA BROKER       │     ║
║                                           │    (Central Message Bus)      │     ║
║                                           └───────────────┬───────────────┘     ║
║                                                           │                     ║
║                       ┌───────────────────────────────────┼──────────────────┐  ║
║                       ▼                                   ▼                  ▼  ║
║            ┌────────────────────┐               ┌──────────────────┐   ┌─────────┐
║            │  STREAM PROCESSOR  │               │   APACHE FLINK   │   │  SPARK  │
║            │ (Collision Alert & │               │  (Real-Time ML   │   │ (Batch  │
║            │ Cassandra Bridge)  │               │   Alert Stream)  │   │ Model)  │
║            └──────────┬─────────┘               └─────────┬────────┘   └────┬────┘
║                       │                                   │                 │   ║
║                       └─────────────────┬─────────────────┘                 │   ║
║                                         │                                   │   ║
║                                         ▼                                   ▼   ║
║                           ┌───────────────────────────┐                         ║
║                           │  APACHE CASSANDRA NoSQL   │                         ║
║                           │  (Keyspace: kavach)       │                         ║
║                           └─────────────┬─────────────┘                         ║
║                                         │                                       ║
║                                         ▼                                       ║
║                           ┌───────────────────────────┐                         ║
║                           │    GRAFANA DASHBOARD      │                         ║
║                           │   (Control Room Monitor)  │                         ║
║                           └─────────────┬─────────────┘                         ║
║                                         │                                       ║
║                                         ▼                                       ║
║                           ┌───────────────────────────┐                         ║
║                           │   FRONTEND WEB APP &      │                         ║
║                           │   3D KAVACH SIMULATOR     │                         ║
║                           └───────────────────────────┘                         ║
║                                                                                  ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

Behind the scenes **Apache ZooKeeper** cluster components ko coordinate karta hai.

---

### 🔗 Service 1: Ingestion Engine (`ingestion-service`) — HIGH-SPEED DATA INGESTION ENGINE

- **Container Name:** `ingestion-service` (Port: `8000`)
- **Kya Karta Hai:**
  - Overpass Turbo API se **Broad Gauge Tracks GeoJSON** (`india_railway_tracks.geojson`) aur OpenRailwayMap Signals download karta hai.
  - Open-Meteo Satellite API se **All-India Station Weather Telemetry** fetch karta hai.
  - 100% Real Master Datasets (**8,990+ Stations & 11,000+ Trains**) ko direct load karke Kafka Topics mein publish karta hai.
  - **24/7 Telemetry Stream Engine:** 0.5s interval pe live locomotive coordinates generate karke Kafka `train-telemetry` topic par bhejta hai.
  - **Interactive API Control & Swagger UI:** `http://localhost:8000/docs` par API Key & Target Endpoint register/manage karne ka dashboard provide karta hai.
  - Ultra-lightweight (~30MB RAM) aur fast performance ke sath chalta hai.

---

### 🔗 Service 2: Apache Kafka — CENTRAL MESSAGE BROKER (डाक घर)

- **Container Name:** `kafka` (Port: `9092`, `29092`)
- **Kya Karta Hai:**
  - Saare producers se asynchronous data receive karta hai aur persistent topics mein distribute karta hai.
- **Kafka Topics in PROJECT-KAVACH:**
  1. `train-telemetry`: Live locomotive GPS, speed, slope, EBD, precedence rank, RFID tag, brake type.
  2. `railway-weather`: Real-time satellite temperature, humidity, visibility, fog/rain hazard data.
  3. `railway-tracks`: GeoJSON track lines and coordinates.
  4. `railway-stations`: 8,990+ station metadata.
  5. `train-schedules`: 11,000+ train schedules.
  6. `kavach-alerts`: Real-time safety collision warnings.

---

### 🔗 Service 3: Stream Processor (`stream-processor`) — REAL-TIME COLLISION & CASSANDRA BRIDGE

- **Container Name:** `stream-processor`
- **Kya Karta Hai:**
  - Kafka topics (`train-telemetry`, `railway-weather`) ko continuous poll karta hai.
  - **Haversine Collision Engine:** Active trains ke latitudes/longitudes compare karta hai. Agar do trains ke beech ka distance **< 500 meters** ho jata hai, toh automatically `CRITICAL_COLLISION_ALERT` generate karta hai aur `kavach_alerts` table mein store karta hai.
  - Data ko direct Apache Cassandra NoSQL tables mein persist karta hai.

---

### 🔗 Service 4: Apache Flink — REAL-TIME STREAM PROCESSING ENGINE (Traffic Police 🚦)

- **Container Name:** `flink-jobmanager` (Port: `8001`) & `flink-taskmanager`
- **Kya Karta Hai:**
  - Millisecond latency ke sath continuous streaming telemetry verify karta hai.
  - High vibration, rail temperature buckling risk (> 55°C), speed limit violation detect karke immediate alerts push karta hai.

---

### 🔗 Service 5: Apache Spark — BATCH ANALYTICS & ML TRAINING ENGINE

- **Container Name:** `spark-master` (Web UI Port: `8080`, Master Port: `7077`)
- **Kya Karta Hai:**
  - Historical train delay records par Machine Learning models (Random Forest / Gradient Boosting) train karta hai.
  - Zone-wise performance analytics aur trend predictions generate karta hai.

---

### 🔗 Service 6: Apache Cassandra — NOSQL DATABASE ENGINE (Permanent Storage Cabinet 🗄️)

- **Container Name:** `cassandra` (Port: `9042`)
- **Keyspace Name:** `kavach`
- **Tables:**
  1. `train_telemetry`: High-speed time-series telemetry data (train_id, timestamp, precedence_rank, speed, EBD, slope, rail_temp, rfid_tag, signal_status, collision_risk).
  2. `weather_history`: Live satellite weather telemetry per station.
  3. `kavach_alerts`: Safety alerts, collision alerts, auto-brake triggers.
  4. `api_responses_vault`: Dynamically registered API payloads.

---

### 🔗 Service 7: Grafana — MONITORING DASHBOARD (Control Room TV 📺)

- **Container Name:** `grafana` (Port: `3000`, Default Pass: `admin123`)
- **Kya Karta Hai:**
  - Cassandra DB se connect hoke control room dashboards, real-time heatmaps, safety alert counters aur speed graphs render karta hai.

---

### 🔗 Service 8: Apache ZooKeeper — CLUSTER COORDINATOR (Manager 👔)

- **Container Name:** `zookeeper` (Port: `2181`)
- **Kya Karta Hai:**
  - Kafka brokers aur distributed nodes ka state coordinate karta hai.

---

## 🐳 PART 3: Current `docker-compose.yml` Configuration

Yahan humara active `docker-compose.yml` file hai:

```yaml
version: '3.8'

services:

  # ─── LINK 8: ZooKeeper (Cluster Coordinator) ───
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: zookeeper
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  # ─── LINK 2: Kafka (Central Message Broker) ───
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
      - "29092:29092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,PLAINTEXT_HOST://0.0.0.0:29092
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"

  # ─── LINK 1: High-Speed Ingestion Engine (API Extractor, Master Data & Telemetry) ───
  ingestion-service:
    build:
      context: ./ingestion
      dockerfile: Dockerfile
    container_name: ingestion-service
    restart: always
    ports:
      - "8000:8000"
    environment:
      - KAFKA_BOOTSTRAP_SERVERS=kafka:9092
      - CASSANDRA_HOST=cassandra
      - DATA_DIR=/app/data
    volumes:
      - ./data:/app/data
      - ./ingestion:/app
    depends_on:
      - kafka
      - cassandra

  # ─── LINK 3: Stream Processor (Real-Time Collision Detection & Cassandra Bridge) ───
  stream-processor:
    build:
      context: ./processor
      dockerfile: Dockerfile
    container_name: stream-processor
    restart: always
    environment:
      - KAFKA_BOOTSTRAP_SERVERS=kafka:9092
      - CASSANDRA_HOST=cassandra
    volumes:
      - ./data:/app/data
      - ./processor:/app
    depends_on:
      - kafka
      - cassandra

  # ─── LINK 4: Flink JobManager & TaskManager ───
  flink-jobmanager:
    image: flink:1.18-scala_2.12-java11
    container_name: flink-jobmanager
    ports:
      - "8001:8081"
    command: jobmanager
    environment:
      FLINK_PROPERTIES: "jobmanager.rpc.address: flink-jobmanager"

  flink-taskmanager:
    image: flink:1.18-scala_2.12-java11
    container_name: flink-taskmanager
    depends_on:
      - flink-jobmanager
    command: taskmanager
    environment:
      FLINK_PROPERTIES: "jobmanager.rpc.address: flink-jobmanager"

  # ─── LINK 5: Spark Master (Big Data Analytics) ───
  spark:
    image: apache/spark:latest
    container_name: spark-master
    command: /opt/spark/bin/spark-class org.apache.spark.deploy.master.Master
    ports:
      - "8080:8080"   # Spark Web UI
      - "7077:7077"   # Spark Master
    environment:
      SPARK_MODE: master

  # ─── LINK 6: Cassandra (NoSQL Database) ───
  cassandra:
    image: cassandra:4.1
    container_name: cassandra
    ports:
      - "9042:9042"
    environment:
      CASSANDRA_CLUSTER_NAME: "RailwayCluster"
    volumes:
      - cassandra-data:/var/lib/cassandra

  # ─── LINK 7: Grafana (Control Room TV Dashboard) ───
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin123

volumes:
  cassandra-data:
```

---

## 💻 PART 4: Project Management & Verification Commands

### System Start/Stop Commands

```bash
# 1. System Start (Background Mode)
docker-compose up -d --build

# 2. Check Container Health Status
docker-compose ps

# 3. View Real-time Stream Processor Logs
docker logs -f stream-processor

# 4. View Ingestion Engine Logs
docker logs -f ingestion-service

# 5. Complete System Stop
docker-compose down
```

### Database Inspection & Cleanup Scripts

```bash
# Cassandra Database Table Row Counts & Data Inspection
python scripts/inspect_cassandra_db.py

# Wipe/Truncate Cassandra Tables & Clean Stale Files
python scripts/clear_cassandra_db.py

# Cleanup Snapshot Files (Disk space optimization)
python scripts/cleanup_snapshots.py
```

### Web UIs URLs Overview

- 🛠️ **Ingestion Engine & API Control Room:** `http://localhost:8000/docs`
- ⚡ **Flink Dashboard:** `http://localhost:8001`
- 📊 **Spark Master UI:** `http://localhost:8080`
- 📺 **Grafana Dashboards:** `http://localhost:3000` (User: `admin`, Pass: `admin123`)

---

## 🎤 SIH Presentation / Judge Q&A Cheat Sheet

```
Q: Ingestion Engine ka kya role hai?

Ans: "Sir, humne FastAPI + AsyncIO pe 100% Python-native High-Speed Ingestion Engine banaya hai jo sirf ~30MB RAM use karta hai, 0-timeout fault tolerance deta hai, 11,000+ train schedules aur 8,990+ station nodes auto-sync karta hai, aur Kafka + Cassandra me real-time streaming provide karta hai."
```

```
Q: Collision Risk aur Safety Alerts kaise detect ho rahe hain?

Ans: "Sir, humara Stream Processor engine (stream-processor) Kafka se continuous locomotive telemetry read karta hai. 
Wo Real-Time Haversine Distance calculation run karta hai. 
Agar same/adjacent tracks pe do trains ke beech distance < 500 meters ho jaye, toh automatically 'CRITICAL_COLLISION_ALERT' trigger hota hai, Kavach Auto-Brake flag activate hota hai aur record Cassandra NoSQL DB mein persist hota hai."
```

```
Q: Data storage architecture kaisa hai?

Ans: "Sir, humne disk bloat problem ko resolve karne ke liye local snapshot file generation complete disable kar diya hai. 
Poora telemetry, satellite weather aur track GIS data Apache Cassandra NoSQL Database mein directly stream hota hai."
```
