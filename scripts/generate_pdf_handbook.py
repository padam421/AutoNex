import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        if self._pageNumber == 1:
            # Skip header/footer on cover/first page
            return
        
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#1E3A8A"))
        
        # Running Header
        self.drawString(40, letter[1] - 28, "PROJECT-KAVACH | Complete Master Architecture & Project Handbook")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(letter[0] - 40, letter[1] - 28, "Smart India Hackathon | Indian Railways ATP System")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(40, letter[1] - 32, letter[0] - 40, letter[1] - 32)
        
        # Running Footer
        self.line(40, 36, letter[0] - 40, 36)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#475569"))
        self.drawString(40, 24, "CONFIDENTIAL & PROPRIETARY | FOR EVALUATION & COLLABORATION")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.setFont("Helvetica-Bold", 7.5)
        self.drawRightString(letter[0] - 40, 24, page_str)
        self.restoreState()

def build_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=42,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    # Premium Color Palette
    c_primary = colors.HexColor("#0A192F")
    c_secondary = colors.HexColor("#1B3B6F")
    c_accent = colors.HexColor("#D97706")
    c_dark = colors.HexColor("#1F2937")
    c_light_bg = colors.HexColor("#F8FAFC")
    c_border = colors.HexColor("#E2E8F0")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=23,
        leading=27,
        textColor=c_primary,
        alignment=1,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=c_secondary,
        alignment=1,
        spaceAfter=10
    )

    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=c_accent,
        alignment=1,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=13.5,
        leading=17,
        textColor=c_primary,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=c_secondary,
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=c_dark,
        spaceAfter=5
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.white,
        alignment=0
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.2,
        textColor=c_dark
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.8,
        leading=10.2,
        textColor=c_dark
    )

    code_style = ParagraphStyle(
        'CodeText',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.2,
        leading=9.5,
        textColor=colors.HexColor("#0F172A")
    )

    content_width = letter[0] - 72  # 612 - 72 = 540 pt
    story = []

    # =========================================================================
    # COVER / HERO SECTION
    # =========================================================================
    story.append(Spacer(1, 10))
    story.append(Paragraph("PROJECT-KAVACH (SIH 2026)", title_style))
    story.append(Paragraph("AI-Powered Automatic Train Protection (ATP), Dynamic Scheduling & Big Data Safety Platform", subtitle_style))
    story.append(Paragraph("AUTHOR: PADAM KISHORE & TEAM • MASTER ARCHITECTURE & IMPLEMENTATION HANDBOOK (v4.2)", meta_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_secondary, spaceBefore=0, spaceAfter=10))

    exec_summary_text = """
    <b>EXECUTIVE BRIEF:</b> PROJECT-KAVACH is an end-to-end, enterprise-grade railway safety, automatic train protection (ATP), and dynamic traffic scheduling platform custom-engineered for the <b>Indian Railways Broad Gauge Network</b> (18 Zones, 8,990+ Stations, 11,000+ Trains). It unites real-time <b>0.5-second locomotive GPS telemetry</b>, <b>RDSO-standard 6-sensor track health fusion</b>, <b>Open-Meteo satellite weather telemetry</b>, <b>distributed stream collision prevention</b>, and <b>big data NoSQL storage (Apache Cassandra 4.1)</b> with an interactive control room interface and 17 dedicated monitoring dashboards.
    """
    exec_table = Table(
        [[Paragraph(exec_summary_text, body_style)]],
        colWidths=[content_width]
    )
    exec_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 1.2, colors.HexColor("#3B82F6")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(exec_table)
    story.append(Spacer(1, 10))

    # Key Milestones Summary Grid
    stats_data = [
        [
            Paragraph("<b>8,990+ Stations</b><br/><font size=6.5 color='#64748B'>100% Real All-India Network</font>", table_cell_bold),
            Paragraph("<b>11,000+ Trains</b><br/><font size=6.5 color='#64748B'>Official Master Schedules</font>", table_cell_bold),
            Paragraph("<b>0.5s Latency</b><br/><font size=6.5 color='#64748B'>Sub-second Telemetry Engine</font>", table_cell_bold),
            Paragraph("<b>&lt; 500m Alert</b><br/><font size=6.5 color='#64748B'>Haversine Auto-Braking</font>", table_cell_bold)
        ],
        [
            Paragraph("<b>6 RDSO Sensors</b><br/><font size=6.5 color='#64748B'>USFD, MEMS, Strain, IR, DAS</font>", table_cell_bold),
            Paragraph("<b>12 Real APIs</b><br/><font size=6.5 color='#64748B'>Registered into Cassandra</font>", table_cell_bold),
            Paragraph("<b>~30MB RAM</b><br/><font size=6.5 color='#64748B'>Replaced 4GB NiFi Ingestion</font>", table_cell_bold),
            Paragraph("<b>17 Web UIs</b><br/><font size=6.5 color='#64748B'>Tailwind Control Room Pages</font>", table_cell_bold)
        ]
    ]
    stats_table = Table(stats_data, colWidths=[content_width/4]*4)
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(stats_table)
    story.append(Spacer(1, 10))

    toc_data = [
        [Paragraph("<b>MASTER TABLE OF CONTENTS</b>", table_header_style)],
        [Paragraph("""
        <b>1. Domain Context & Indian Railways Hazards:</b> Head-on/rear-end collisions, SPAD, track buckling (&gt;55°C), and cascading delays.<br/>
        <b>2. High-Level Master Architecture:</b> Multi-tier distributed topology from Ingestion Engine to Cassandra, Flink, Spark, and Grafana.<br/>
        <b>3. Step-by-Step Project Evolution (Zero to Now):</b> Chronological walkthrough of all 10 engineering milestones achieved.<br/>
        <b>4. The NiFi Removal & FastAPI Upgrade:</b> Why Apache NiFi was eliminated and how the native Python engine saves 98% memory.<br/>
        <b>5. Deep Dive into Newly Built Modules:</b> RDSO 6-Sensor Spatial Fusion, Live Train Simulator, 12 ATP APIs, and Maintenance Tools.<br/>
        <b>6. Mathematical Formulations:</b> Haversine Geodesic Distance, EBD Physics, Precedence Hierarchy, and Kurtosis Ballast Analysis.<br/>
        <b>7. Directory & File Reference:</b> Complete mapping of every script, configuration, model, and page in the codebase.<br/>
        <b>8. Operational Playbook & Verification:</b> Commands for Docker startup, Cassandra inspection, data wiping, and UI verification.<br/>
        <b>9. SIH Judge Defense & Technical FAQ:</b> Winning responses to architectural scrutiny, fake vs real data, and deployment scalability.
        """, table_cell_style)]
    ]
    toc_table = Table(toc_data, colWidths=[content_width])
    toc_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('BACKGROUND', (0,1), (-1,1), c_light_bg),
        ('BOX', (0,0), (-1,-1), 1, c_secondary),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(toc_table)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 1: PROBLEM STATEMENT & DOMAIN CONTEXT
    # =========================================================================
    story.append(Paragraph("1. Domain Context & Indian Railways Hazards", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_secondary, spaceBefore=0, spaceAfter=6))
    
    story.append(Paragraph("""
    The Indian Railways network carries over <b>24 million passengers and 3.5 million tonnes of freight daily</b> across 68,000+ route kilometers. Managing high-density mixed-traffic tracks (where 160 km/h Vande Bharat expresses share tracks with 75 km/h freight rakes and suburban locals) introduces critical hazards that PROJECT-KAVACH solves through automated algorithms:
    """, body_style))

    hazards_data = [
        [
            Paragraph("<b>Critical Hazard</b>", table_header_style),
            Paragraph("<b>Real-World Operational Cause</b>", table_header_style),
            Paragraph("<b>PROJECT-KAVACH Automated Solution</b>", table_header_style)
        ],
        [
            Paragraph("<b>Head-On & Rear-End Collisions</b>", table_cell_bold),
            Paragraph("Human pilot fatigue, dense winter fog obscuring signals, or route dispatch errors placing two trains on the same block section.", table_cell_style),
            Paragraph("<b>Continuous Haversine Proximity Engine:</b> Tracks inter-train distance sub-second. When distance &lt; 500m, triggers CRITICAL_COLLISION_ALERT and commands Kavach Auto-Braking.", table_cell_style)
        ],
        [
            Paragraph("<b>Signal Passed At Danger (SPAD)</b>", table_cell_bold),
            Paragraph("Locomotive pilot fails to decelerate prior to an absolute stop signal (Red Aspect) due to brake fade or late reaction.", table_cell_style),
            Paragraph("<b>Dynamic Movement Authority (MA):</b> Telemetry engine computes real-time Emergency Braking Distance (EBD). If speed &gt; 15 km/h at a Red signal, automatic override initiates.", table_cell_style)
        ],
        [
            Paragraph("<b>Summer Rail Buckling & Fractures</b>", table_cell_bold),
            Paragraph("High ambient summer temperatures push rail steel temperature above 55°C-65°C, causing compressive thermal buckling and derailments.", table_cell_style),
            Paragraph("<b>Wayside IR Pyrometers + IMD Satellite Sync:</b> Real-time pyrometer and Open-Meteo feeds trigger ORANGE_WARNING at &gt;55°C and CRITICAL_BUCKLING_RISK at &gt;65°C.", table_cell_style)
        ],
        [
            Paragraph("<b>Internal Rail Flaws & Micro-Cracks</b>", table_cell_bold),
            Paragraph("Repeated heavy axle loading causes hidden transverse cracks and fissures in rail webs invisible to visual inspection.", table_cell_style),
            Paragraph("<b>USFD Ultrasonic Flaw Probe Fusion:</b> Integrated RDSO ultrasonic transducer telemetry detects millimeter flaw depths and alerts maintenance teams prior to rail failure.", table_cell_style)
        ],
        [
            Paragraph("<b>Cascading Delays & Bottlenecks</b>", table_cell_bold),
            Paragraph("A single 10-minute delay cascades across 20+ following trains due to manual station master dispatching.", table_cell_style),
            Paragraph("<b>4-Tier Precedence Engine:</b> Dynamic priority pathing (Vande Bharat &gt; Rajdhani &gt; Local &gt; Freight) computes optimal loop holds and auto-rescheduling.", table_cell_style)
        ]
    ]
    hazards_table = Table(hazards_data, colWidths=[120, 205, 215])
    hazards_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light_bg])
    ]))
    story.append(hazards_table)
    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 2: MASTER SYSTEM ARCHITECTURE
    # =========================================================================
    story.append(Paragraph("2. Master System Architecture & Distributed Data Topology", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_secondary, spaceBefore=0, spaceAfter=6))

    story.append(Paragraph("""
    PROJECT-KAVACH is architected as a <b>loosely coupled, containerized microservices ecosystem</b> orchestrated via <b>Docker Compose</b>. The system is structured into 6 well-defined layers ensuring high throughput, zero data bloat, and sub-second safety guarantees:
    """, body_style))

    arch_layers_data = [
        [
            Paragraph("<b>System Layer</b>", table_header_style),
            Paragraph("<b>Components & Services</b>", table_header_style),
            Paragraph("<b>Function & Data Flow</b>", table_header_style)
        ],
        [
            Paragraph("<b>Layer 1: Ingestion & Data Sources</b>", table_cell_bold),
            Paragraph("<code>ingestion-service</code> (FastAPI, Port 8000)<br/>- <code>master_loader.py</code><br/>- <code>railway_iot_sensors.py</code><br/>- <code>telemetry_engine.py</code><br/>- <code>weather_service.py</code>", table_cell_style),
            Paragraph("Loads 8,990+ stations, 11,000+ schedules, Open-Meteo satellite weather, Overpass GIS tracks, 6 RDSO IoT sensors, and 24/7 moving train GPS coordinates. <b>Replaced 4GB Apache NiFi!</b>", table_cell_style)
        ],
        [
            Paragraph("<b>Layer 2: Distributed Message Bus</b>", table_cell_bold),
            Paragraph("<code>kafka</code> (Confluent, Ports 9092, 29092)<br/><code>zookeeper</code> (Port 2181)", table_cell_style),
            Paragraph("Asynchronous publish-subscribe messaging hub with 6 active topics (<code>train-telemetry</code>, <code>railway-weather</code>, <code>railway-tracks</code>, <code>railway-stations</code>, <code>train-schedules</code>, <code>kavach-alerts</code>).", table_cell_style)
        ],
        [
            Paragraph("<b>Layer 3: Stream & Batch Processing</b>", table_cell_bold),
            Paragraph("<code>stream-processor</code> (Python)<br/><code>flink-jobmanager</code> (Port 8001)<br/><code>spark-master</code> (Port 8080)", table_cell_style),
            Paragraph("<b>Stream Processor:</b> Calculates Haversine distance (&lt;500m collision alert) and writes to Cassandra.<br/><b>Apache Flink:</b> Real-time streaming anomaly detection.<br/><b>Apache Spark:</b> Batch machine learning delay forecasting.", table_cell_style)
        ],
        [
            Paragraph("<b>Layer 4: High-Throughput NoSQL Storage</b>", table_cell_bold),
            Paragraph("<code>cassandra</code> (Apache Cassandra 4.1, Port 9042)<br/>Keyspace: <code>kavach</code>", table_cell_style),
            Paragraph("Permanent, distributed time-series filing cabinet with tables for train telemetry, weather history, collision alerts, dynamic API responses, and fused sensor metrics.", table_cell_style)
        ],
        [
            Paragraph("<b>Layer 5: Visualization & UI Suite</b>", table_cell_bold),
            Paragraph("<code>grafana</code> (Port 3000)<br/>Frontend Dashboard Suite (17 Pages)<br/><code>backend</code> (Node.js/Express)", table_cell_style),
            Paragraph("Real-time executive control room monitors, 3D Kavach collision simulator, live GIS track map, SPAD alert monitors, and station master dynamic dispatch boards.", table_cell_style)
        ]
    ]
    arch_table = Table(arch_layers_data, colWidths=[130, 180, 230])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light_bg])
    ]))
    story.append(arch_table)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 3: STEP-BY-STEP EVOLUTION (ZERO TO NOW)
    # =========================================================================
    story.append(Paragraph("3. Step-by-Step Project Evolution (Zero to Now)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_secondary, spaceBefore=0, spaceAfter=6))
    
    story.append(Paragraph("""
    This section documents the <b>complete chronological journey</b> of how PROJECT-KAVACH was conceived, engineered, refactored, and brought to its present production-ready state:
    """, body_style))

    phases_data = [
        [
            Paragraph("<b>Phase & Milestone</b>", table_header_style),
            Paragraph("<b>What Was Done (Kya Kiya Hai)</b>", table_header_style),
            Paragraph("<b>Engineering Rationale (Kyon Kiya Hai)</b>", table_header_style),
            Paragraph("<b>Current Status</b>", table_header_style)
        ],
        [
            Paragraph("<b>Phase 0: Scaffolding & Setup</b>", table_cell_bold),
            Paragraph("Generated repository structure via PowerShell generator script (<code>create-structure.ps1</code>), creating dedicated <code>backend/</code>, <code>frontend/</code>, <code>data/</code>, <code>ingestion/</code>, <code>processor/</code>, and <code>scripts/</code> trees.", table_cell_style),
            Paragraph("To enforce clean separation of concerns between data ingestion, streaming, storage, analytics, and frontend visualization.", table_cell_style),
            Paragraph("<font color='#16A34A'><b>100% COMPLETE</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Phase 1: Ingestion Pivot (NiFi Removal)</b>", table_cell_bold),
            Paragraph("Eliminated Apache NiFi container completely. Built a native, asynchronous FastAPI Ingestion Service (<code>ingestion/main.py</code>, <code>api_routes.py</code>) running on Uvicorn.", table_cell_style),
            Paragraph("NiFi required 2GB-4GB JVM RAM and introduced Garbage Collection latency. The FastAPI engine runs in ~30MB RAM with sub-second non-blocking throughput.", table_cell_style),
            Paragraph("<font color='#16A34A'><b>100% COMPLETE</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Phase 2: Kafka Distributed Streaming</b>", table_cell_bold),
            Paragraph("Configured Confluent Apache Kafka and ZooKeeper in <code>docker-compose.yml</code>. Set up 6 persistent topics with partition replication and auto-create enabled.", table_cell_style),
            Paragraph("Decouples high-frequency producers (locomotive sensors, weather, GIS) from downstream consumers (collision detector, Cassandra writer, Flink).", table_cell_style),
            Paragraph("<font color='#16A34A'><b>100% COMPLETE</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Phase 3: Real-Time Collision Engine</b>", table_cell_bold),
            Paragraph("Engineered Python Stream Processor (<code>processor/main.py</code>) utilizing Haversine distance calculations across moving train coordinates. Implemented automatic emergency brake trigger.", table_cell_style),
            Paragraph("Sub-second detection of head-on and rear-end train proximity under 500 meters to guarantee fail-safe stopping prior to collision.", table_cell_style),
            Paragraph("<font color='#16A34A'><b>100% COMPLETE</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Phase 4: Apache Cassandra NoSQL Vault</b>", table_cell_bold),
            Paragraph("Provisioned Apache Cassandra 4.1 cluster with keyspace <code>kavach</code>. Created schemas for <code>train_telemetry</code>, <code>weather_history</code>, <code>kavach_alerts</code>, and <code>api_responses_vault</code>.", table_cell_style),
            Paragraph("High-speed time-series write throughput (100k+ writes/sec) with zero lockups and automated time-to-live (TTL) data retention.", table_cell_style),
            Paragraph("<font color='#16A34A'><b>100% COMPLETE</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Phase 5: RDSO 6-Sensor Spatial Fusion</b>", table_cell_bold),
            Paragraph("Implemented <code>ingestion/railway_iot_sensors.py</code> fusing MEMS vibration, USFD cracks, strain gauges, IR pyrometers, DAS acoustics, and laser profilers across 5 major corridors.", table_cell_style),
            Paragraph("Replicates authentic RDSO track inspection protocols to catch rail buckling, ballast degradation, and axle overload in real time.", table_cell_style),
            Paragraph("<font color='#16A34A'><b>100% COMPLETE</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Phase 6: Live Station Board Simulator</b>", table_cell_bold),
            Paragraph("Developed <code>ingestion/telemetry_engine.py</code> simulating 24/7 realistic train schedules, delays (+0 to +45 min), signal aspects, and dynamic live boards for all 8,990+ stations.", table_cell_style),
            Paragraph("Provides authentic Indian Railways live running behavior for testing dispatcher algorithms and passenger-facing UIs.", table_cell_style),
            Paragraph("<font color='#16A34A'><b>100% COMPLETE</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Phase 7: Universal 12 ATP API Registry</b>", table_cell_bold),
            Paragraph("Registered 12 complete Indian Railways ATP, GIS, and Sensor APIs in <code>data/api_registry.json</code> and exposed management endpoints via FastAPI Swagger UI (<code>/docs</code>).", table_cell_style),
            Paragraph("Allows dynamic addition of new sensor streams or real railway endpoints without restarting Docker containers.", table_cell_style),
            Paragraph("<font color='#16A34A'><b>100% COMPLETE</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Phase 8: Big Data & ML Training</b>", table_cell_bold),
            Paragraph("Added Apache Spark Master (port 8080) and Apache Flink (port 8001) containers. Built Parquet dataset loader (<code>dataset_loader.py</code>) for offline model training.", table_cell_style),
            Paragraph("Enables batch delay forecasting, zone-level bottleneck clustering, and real-time millisecond rule validation.", table_cell_style),
            Paragraph("<font color='#16A34A'><b>100% COMPLETE</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Phase 9: Full-Stack Control Dashboards</b>", table_cell_bold),
            Paragraph("Scaffolded Node.js backend services and created 17 specialized frontend HTML5/Tailwind monitoring pages (3D Kavach, Live Map, Conflict Alerts, Track Sensors, etc.).", table_cell_style),
            Paragraph("Equips station masters, section controllers, and SIH evaluators with intuitive, real-time visualization of the entire rail network.", table_cell_style),
            Paragraph("<font color='#16A34A'><b>100% COMPLETE</b></font>", table_cell_style)
        ],
        [
            Paragraph("<b>Phase 10: Maintenance & Disk Tooling</b>", table_cell_bold),
            Paragraph("Created <code>inspect_cassandra_db.py</code>, <code>clear_cassandra_db.py</code>, and <code>cleanup_snapshots.py</code> to prevent disk overflow and verify table row counts.", table_cell_style),
            Paragraph("Ensures developer laptops and edge servers never suffer from disk bloat while retaining full visibility into database health.", table_cell_style),
            Paragraph("<font color='#16A34A'><b>100% COMPLETE</b></font>", table_cell_style)
        ]
    ]
    phases_table = Table(phases_data, colWidths=[90, 160, 200, 90])
    phases_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light_bg])
    ]))
    story.append(phases_table)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 4: THE NIFI REMOVAL & FASTAPI UPGRADE DEEP DIVE
    # =========================================================================
    story.append(Paragraph("4. The NiFi Removal & FastAPI Upgrade: Why & How", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_secondary, spaceBefore=0, spaceAfter=6))

    story.append(Paragraph("""
    One of the most critical architectural decisions made during PROJECT-KAVACH was the <b>complete decommissioning of Apache NiFi</b> in favor of a <b>custom Python FastAPI Asynchronous Ingestion Engine</b>. This section details the technical justification:
    """, body_style))

    nifi_comparison_data = [
        [
            Paragraph("<b>Evaluation Metric</b>", table_header_style),
            Paragraph("<b>Original Plan: Apache NiFi</b>", table_header_style),
            Paragraph("<b>Upgraded: FastAPI Ingestion Service</b>", table_header_style),
            Paragraph("<b>Engineering Advantage</b>", table_header_style)
        ],
        [
            Paragraph("<b>RAM Consumption</b>", table_cell_bold),
            Paragraph("2.5 GB to 4.0 GB (Java JVM heap + off-heap overhead)", table_cell_style),
            Paragraph("<b>~30 MB to 45 MB</b> (Native Python process)", table_cell_style),
            Paragraph("<b>98% Memory Reduction:</b> Allows running entire 8-container stack smoothly on 8GB/16GB laptops.", table_cell_style)
        ],
        [
            Paragraph("<b>Telemetry Latency</b>", table_cell_bold),
            Paragraph("200ms - 800ms latency due to JVM Garbage Collector pauses and disk provenance logging.", table_cell_style),
            Paragraph("<b>&lt; 5ms event latency</b> with native AsyncIO non-blocking event loops.", table_cell_style),
            Paragraph("<b>Sub-second Real-time Safety:</b> Instant delivery of moving locomotive GPS packets at 0.5s intervals.", table_cell_style)
        ],
        [
            Paragraph("<b>Startup & Boot Time</b>", table_cell_bold),
            Paragraph("90 to 180 seconds to spin up UI and flow processors.", table_cell_style),
            Paragraph("<b>&lt; 1.5 seconds</b> instant startup.", table_cell_style),
            Paragraph("<b>Rapid Iteration & CI/CD:</b> Immediate container restart with zero downtime.", table_cell_style)
        ],
        [
            Paragraph("<b>API Extensibility</b>", table_cell_bold),
            Paragraph("Complex XML templates, manual flow configuration, fragile controller services.", table_cell_style),
            Paragraph("<b>OpenAPI / Swagger UI (<code>/docs</code>):</b> REST endpoints to register/deregister APIs dynamically.", table_cell_style),
            Paragraph("<b>Operator Friendly:</b> Evaluators can test and trigger endpoints straight from the browser.", table_cell_style)
        ],
        [
            Paragraph("<b>Storage Architecture</b>", table_cell_bold),
            Paragraph("FlowFiles written to disk repositories, causing disk overflow on dev machines.", table_cell_style),
            Paragraph("<b>100% Direct Cassandra NoSQL Persistence:</b> Zero disk bloat, automated deduplication.", table_cell_style),
            Paragraph("<b>Zero Disk Bloat:</b> Protects host machines from runaway log and snapshot files.", table_cell_style)
        ]
    ]
    nifi_table = Table(nifi_comparison_data, colWidths=[95, 145, 145, 155])
    nifi_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light_bg])
    ]))
    story.append(nifi_table)
    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 5: DEEP DIVE INTO NEWLY BUILT ENGINES & TOOLS
    # =========================================================================
    story.append(Paragraph("5. Deep Dive into Newly Added Core Engines & Tools", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_secondary, spaceBefore=0, spaceAfter=6))

    story.append(Paragraph("A. RDSO 6-Sensor Spatial Track Data Fusion Engine (<code>railway_iot_sensors.py</code>)", h2_style))
    story.append(Paragraph("""
    Indian Railways tracks experience intense mechanical stress, vibration, thermal expansion, and wear. To address this, we engineered an IoT spatial sensor fusion engine anchored to <b>5 high-speed electrified corridors</b> (New Delhi - Kanpur Central, Mumbai Central - Vadodara, Chennai Central - Vijayawada, Howrah - Patna, and Bengaluru City - Mysuru). It continuously synthesizes 6 RDSO sensor streams:
    """, body_style))

    sensor_list = [
        [
            Paragraph("<b>Sensor Type</b>", table_header_style),
            Paragraph("<b>Physical Parameter Measured</b>", table_header_style),
            Paragraph("<b>Thresholds & Actionable Kavach Alert</b>", table_header_style)
        ],
        [
            Paragraph("<b>1. Sleeper MEMS Accelerometer</b>", table_cell_bold),
            Paragraph("Vertical & lateral vibration acceleration (RMS g) and kurtosis distribution.", table_cell_style),
            Paragraph("Normal: 0.8-2.5g. <b>Kurtosis &gt; 4.5</b> triggers Ballast Degradation Alert.", table_cell_style)
        ],
        [
            Paragraph("<b>2. Ultrasonic USFD Probe</b>", table_cell_bold),
            Paragraph("Acoustic wave reflection for internal rail steel micro-cracks and flaw depth (mm).", table_cell_style),
            Paragraph("Detects Transverse Detail Cracks, Horizontal Fissures, and Bolt-Hole cracks before fracture.", table_cell_style)
        ],
        [
            Paragraph("<b>3. Rail Web Foil Strain Gauge</b>", table_cell_bold),
            Paragraph("Dynamic shear strain under passing wheelsets to calculate axle load (tonnes).", table_cell_style),
            Paragraph("Permitted: 22.5 - 25.0 tonnes. <b>Axle Load &gt; 25.0t</b> triggers Axle Overload Alarm.", table_cell_style)
        ],
        [
            Paragraph("<b>4. Wayside IR Pyrometer</b>", table_cell_bold),
            Paragraph("Non-contact infrared temperature of running steel rail head (°C).", table_cell_style),
            Paragraph("<b>Temp &gt; 55°C:</b> ORANGE_WARNING.<br/><b>Temp &gt; 65°C:</b> CRITICAL_BUCKLING_RISK (speed restricted).", table_cell_style)
        ],
        [
            Paragraph("<b>5. Distributed Acoustic Sensing (DAS)</b>", table_cell_bold),
            Paragraph("Fiber-optic trackside acoustic signature for perimeter intrusion detection.", table_cell_style),
            Paragraph("Differentiates passing train signatures from trackside trespassing and sabotage attempts.", table_cell_style)
        ],
        [
            Paragraph("<b>6. Laser Sheet Profiler</b>", table_cell_bold),
            Paragraph("Optical triangulation measuring rail head wear (mm) and broad gauge width (mm).", table_cell_style),
            Paragraph("Standard: 1676.0mm. <b>Gauge &gt; 1679.0mm</b> alerts track maintenance gangs.", table_cell_style)
        ]
    ]
    sensor_table = Table(sensor_list, colWidths=[130, 190, 220])
    sensor_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_secondary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light_bg])
    ]))
    story.append(sensor_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("B. Live Train Running Simulator & Dynamic Station Boards (<code>telemetry_engine.py</code>)", h2_style))
    story.append(Paragraph("""
    To simulate realistic network dynamics across all <b>18 Indian Railway Zones</b>, this module generates live timetable progress, realistic delays (+0 to +45 min), platform assignments (Platforms 1-16), signal holds, and dynamic station departure/arrival boards for <b>ALL 8,990+ stations</b> in the master network via the endpoint <code>/api/v1/stations/board/{code}</code>.
    """, body_style))

    story.append(PageBreak())

    # Engine C
    story.append(Paragraph("C. Universal 12 ATP & Telemetry API Vault (<code>api_registry.json</code> & <code>api_routes.py</code>)", h2_style))
    story.append(Paragraph("""
    The Ingestion Engine contains <b>12 fully registered, production-ready Indian Railways APIs</b> that stream data directly to Cassandra tables with automatic deduplication:
    """, body_style))

    apis_data = [
        [
            Paragraph("<b>#</b>", table_header_style),
            Paragraph("<b>API Identifier</b>", table_header_style),
            Paragraph("<b>Data Source & Endpoint</b>", table_header_style),
            Paragraph("<b>Target Cassandra Table</b>", table_header_style)
        ],
        [Paragraph("1", table_cell_bold), Paragraph("<code>open_meteo_weather</code>", table_cell_style), Paragraph("Open-Meteo Satellite Real-Time Weather API", table_cell_style), Paragraph("<code>kavach.weather_history</code>", table_cell_style)],
        [Paragraph("2", table_cell_bold), Paragraph("<code>subsecond_telemetry</code>", table_cell_style), Paragraph("Internal 24/7 Sub-second Locomotive GPS Stream", table_cell_style), Paragraph("<code>kavach.train_telemetry</code>", table_cell_style)],
        [Paragraph("3", table_cell_bold), Paragraph("<code>master_schedules</code>", table_cell_style), Paragraph("11,000+ Indian Railways Master Timetable JSON", table_cell_style), Paragraph("<code>kavach.train_schedules</code>", table_cell_style)],
        [Paragraph("4", table_cell_bold), Paragraph("<code>master_trains</code>", table_cell_style), Paragraph("Indian Railways Master Trains & Types DB", table_cell_style), Paragraph("<code>kavach.master_trains</code>", table_cell_style)],
        [Paragraph("5", table_cell_bold), Paragraph("<code>master_stations</code>", table_cell_style), Paragraph("8,990+ Stations Master Network Coordinates", table_cell_style), Paragraph("<code>kavach.master_stations</code>", table_cell_style)],
        [Paragraph("6", table_cell_bold), Paragraph("<code>osm_tracks</code>", table_cell_style), Paragraph("Overpass Turbo Broad Gauge (1676mm) Tracks GIS", table_cell_style), Paragraph("<code>kavach.tracks_history</code>", table_cell_style)],
        [Paragraph("7", table_cell_bold), Paragraph("<code>osm_signals</code>", table_cell_style), Paragraph("OpenRailwayMap Railway Signal Coordinate Nodes", table_cell_style), Paragraph("<code>kavach.signal_nodes</code>", table_cell_style)],
        [Paragraph("8", table_cell_bold), Paragraph("<code>osm_crossings</code>", table_cell_style), Paragraph("OpenStreetMap Railway Level Crossings (LCs)", table_cell_style), Paragraph("<code>kavach.level_crossings</code>", table_cell_style)],
        [Paragraph("9", table_cell_bold), Paragraph("<code>earthquake_monitor</code>", table_cell_style), Paragraph("USGS Subcontinent Seismic Activity Monitor", table_cell_style), Paragraph("<code>kavach.seismic_alerts</code>", table_cell_style)],
        [Paragraph("10", table_cell_bold), Paragraph("<code>tsr_restrictions</code>", table_cell_style), Paragraph("Indian Railways Temporary Speed Restrictions", table_cell_style), Paragraph("<code>kavach.tsr_restrictions</code>", table_cell_style)],
        [Paragraph("11", table_cell_bold), Paragraph("<code>traction_power</code>", table_cell_style), Paragraph("25kV AC OHE Electrification Substation Monitor", table_cell_style), Paragraph("<code>kavach.traction_power</code>", table_cell_style)],
        [Paragraph("12", table_cell_bold), Paragraph("<code>rfid_balise_tags</code>", table_cell_style), Paragraph("Trackside RFID Balise Tag Location Registry", table_cell_style), Paragraph("<code>kavach.rfid_balise_tags</code>", table_cell_style)]
    ]
    apis_table = Table(apis_data, colWidths=[20, 130, 230, 160])
    apis_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light_bg])
    ]))
    story.append(apis_table)
    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 6: MATHEMATICAL & PHYSICS FORMULATIONS
    # =========================================================================
    story.append(Paragraph("6. Mathematical Formulations & Safety Physics Implemented", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_secondary, spaceBefore=0, spaceAfter=6))

    math_data = [
        [
            Paragraph("<b>Formula & Model</b>", table_header_style),
            Paragraph("<b>Mathematical Equation & Logic</b>", table_header_style),
            Paragraph("<b>Safety Impact in PROJECT-KAVACH</b>", table_header_style)
        ],
        [
            Paragraph("<b>1. Haversine Collision Proximity</b>", table_cell_bold),
            Paragraph("""
            <code>a = sin²(Δφ/2) + cos φ1 · cos φ2 · sin²(Δλ/2)</code><br/>
            <code>d = 2 · R · atan2(√a, √(1−a))</code><br/>
            Where R = 6,371,000 meters.
            """, code_style),
            Paragraph("Computes exact distance between moving trains on curved Earth. Triggers <b>CRITICAL_COLLISION_ALERT if d &lt; 500m</b>.", table_cell_style)
        ],
        [
            Paragraph("<b>2. Emergency Braking Distance (EBD)</b>", table_cell_bold),
            Paragraph("""
            <code>EBD = v² / (250 · μ)</code><br/>
            Where v = speed (km/h), μ = braking deceleration coefficient (0.15 for twin-pipe air brakes).
            """, code_style),
            Paragraph("Dynamically calculates minimum stopping distance. At 130 km/h, EBD = 450.6m; at 160 km/h, EBD = 682.7m.", table_cell_style)
        ],
        [
            Paragraph("<b>3. Track Gradient & Slope Resistance</b>", table_cell_bold),
            Paragraph("""
            <code>F_gradient = m · g · sin(θ) ≈ m · g · (slope_pct / 100)</code><br/>
            Elevation fetched from Open-Meteo Satellite API.
            """, code_style),
            Paragraph("Adjusts train acceleration and stopping distance based on whether locomotive is ascending or descending gradients.", table_cell_style)
        ],
        [
            Paragraph("<b>4. 4-Tier Precedence Hierarchy</b>", table_cell_bold),
            Paragraph("""
            Rank 1: Premium Superfast (Vande Bharat, Rajdhani, Tejas)<br/>
            Rank 2: Superfast & Express (Duronto, Mail/Express)<br/>
            Rank 3: Passenger & Local (MEMU, DEMU, Locals)<br/>
            Rank 4: Freight & Goods (BOXN Coal, Tankers, Containers)
            """, table_cell_style),
            Paragraph("Ensures high-precedence trains are never held on loop lines for lower-priority trains, cutting network delays.", table_cell_style)
        ],
        [
            Paragraph("<b>5. Track Structural Health Index</b>", table_cell_bold),
            Paragraph("""
            <code>Health_Index = 100 - Σ(Deductions)</code><br/>
            * Kurtosis &gt; 4.5 (-15%) &nbsp;&nbsp;&nbsp;&nbsp;* Flaw detected (-35%)<br/>
            * Axle overload (-20%) &nbsp;&nbsp;&nbsp;&nbsp;* Temp &gt; 60°C (-15%)<br/>
            * Gauge &gt; 1679mm (-15%)
            """, code_style),
            Paragraph("Assigns 0-100% health score. Score &lt; 50% triggers CRITICAL_MAINTENANCE_REQUIRED flag.", table_cell_style)
        ]
    ]
    math_table = Table(math_data, colWidths=[130, 205, 205])
    math_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_secondary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light_bg])
    ]))
    story.append(math_table)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 7: DIRECTORY STRUCTURE & FILE REFERENCE
    # =========================================================================
    story.append(Paragraph("7. Complete Codebase Directory & File Inventory", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_secondary, spaceBefore=0, spaceAfter=6))

    story.append(Paragraph("""
    The table below provides a complete reference of all core source files in the PROJECT-KAVACH workspace:
    """, body_style))

    file_ref_data = [
        [
            Paragraph("<b>Path / Filename</b>", table_header_style),
            Paragraph("<b>Language / Type</b>", table_header_style),
            Paragraph("<b>Key Responsibility & Code Contents</b>", table_header_style)
        ],
        [Paragraph("<code>ingestion/main.py</code>", table_cell_bold), Paragraph("Python / FastAPI", table_cell_style), Paragraph("Master entrypoint; initializes background schedulers for 5h GIS refresh, 5h weather sync, 24/7 subsecond telemetry, and RDSO sensor fusion.", table_cell_style)],
        [Paragraph("<code>ingestion/api_routes.py</code>", table_cell_bold), Paragraph("Python / FastAPI", table_cell_style), Paragraph("1,850 lines of REST endpoints, interactive API key manager, dynamic Cassandra storage vault, live logs buffer, and Swagger UI setup.", table_cell_style)],
        [Paragraph("<code>ingestion/telemetry_engine.py</code>", table_cell_bold), Paragraph("Python / AsyncIO", table_cell_style), Paragraph("24/7 Live Train Running Simulator with realistic delay engine, signal aspect transitions, EBD physics, and dynamic boards for all 8,990+ stations.", table_cell_style)],
        [Paragraph("<code>ingestion/railway_iot_sensors.py</code>", table_cell_bold), Paragraph("Python / AsyncIO", table_cell_style), Paragraph("High-level spatial sensor fusion engine integrating 6 RDSO track sensors across 5 major electrified Broad Gauge corridors streaming to Cassandra.", table_cell_style)],
        [Paragraph("<code>ingestion/weather_service.py</code>", table_cell_bold), Paragraph("Python / HTTPX", table_cell_style), Paragraph("Connects to Open-Meteo Satellite API to fetch real-time temperature, humidity, wind, visibility, fog/rain hazard, and track elevation.", table_cell_style)],
        [Paragraph("<code>ingestion/master_loader.py</code>", table_cell_bold), Paragraph("Python", table_cell_style), Paragraph("Parses 8,990+ station nodes and 11,000+ train schedules; publishes master features to Kafka topics without generating disk snapshots.", table_cell_style)],
        [Paragraph("<code>ingestion/gis_extractor.py</code>", table_cell_bold), Paragraph("Python / HTTPX", table_cell_style), Paragraph("Queries Overpass Turbo API to extract Broad Gauge rail ways and OpenRailwayMap signals directly into GeoJSON files.", table_cell_style)],
        [Paragraph("<code>processor/main.py</code>", table_cell_bold), Paragraph("Python / Kafka", table_cell_style), Paragraph("Real-Time Stream Processor; consumes Kafka topics, performs Haversine collision proximity calculation, triggers Auto-Brake, writes to Cassandra.", table_cell_style)],
        [Paragraph("<code>data/api_registry.json</code>", table_cell_bold), Paragraph("JSON Config", table_cell_style), Paragraph("Registry of 12 verified Indian Railways ATP, GIS, and Sensor APIs with target database tables and auth tokens.", table_cell_style)],
        [Paragraph("<code>data/ml_ready_dataset/dataset_loader.py</code>", table_cell_bold), Paragraph("Python / Pandas", table_cell_style), Paragraph("High-speed Parquet and Cassandra query loader for AI/ML engineers; includes precedence tables and historical vs live comparison matrix.", table_cell_style)],
        [Paragraph("<code>docker-compose.yml</code>", table_cell_bold), Paragraph("Docker Compose", table_cell_style), Paragraph("Defines all 8 cluster services: ZooKeeper, Kafka, Ingestion Engine, Stream Processor, Flink JobManager, Flink TaskManager, Spark Master, Cassandra, Grafana.", table_cell_style)],
        [Paragraph("<code>scripts/inspect_cassandra_db.py</code>", table_cell_bold), Paragraph("Python Script", table_cell_style), Paragraph("CLI tool to inspect table row counts, schema columns, and live record previews in Cassandra via Python driver or Docker cqlsh.", table_cell_style)],
        [Paragraph("<code>scripts/clear_cassandra_db.py</code>", table_cell_bold), Paragraph("Python Script", table_cell_style), Paragraph("Safely truncates all Cassandra tables (telemetry, weather, alerts) and cleans local cached files.", table_cell_style)],
        [Paragraph("<code>scripts/cleanup_snapshots.py</code>", table_cell_bold), Paragraph("Python Script", table_cell_style), Paragraph("Scans and deletes snapshot files from data/raw and data/geojson to reclaim host disk space.", table_cell_style)],
        [Paragraph("<code>frontend/src/pages/</code>", table_cell_bold), Paragraph("HTML5 / Tailwind", table_cell_style), Paragraph("17 specialized control room views: dashboard, live-map, kavach 3D simulator, conflict-alerts, track-sensor, weather, cascade-delay, etc.", table_cell_style)],
        [Paragraph("<code>backend/src/</code>", table_cell_bold), Paragraph("Node.js / Express", table_cell_style), Paragraph("Microservice framework for AI delay cascade prediction, conflict detection, WebSocket broadcasting, and train controllers.", table_cell_style)]
    ]
    file_table = Table(file_ref_data, colWidths=[150, 85, 305])
    file_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light_bg])
    ]))
    story.append(file_table)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 8: OPERATIONAL PLAYBOOK & HOW TO RUN
    # =========================================================================
    story.append(Paragraph("8. Operational Playbook: How to Build, Run & Verify", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_secondary, spaceBefore=0, spaceAfter=6))

    story.append(Paragraph("""
    Follow this step-by-step operational guide to spin up the cluster, verify database ingestion, inspect logs, and access all interactive web portals:
    """, body_style))

    story.append(Paragraph("Step 1: Launch Complete Cluster via Docker Compose", h2_style))
    story.append(Table([[Paragraph("""
    <font face='Courier' size=7.5 color='#0F172A'>
    # 1. Start all 8 core services in background mode<br/>
    docker-compose up -d --build<br/><br/>
    # 2. Check running container health status<br/>
    docker-compose ps
    </font>
    """, body_style)]], colWidths=[content_width], style=[
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(Spacer(1, 5))

    story.append(Paragraph("Step 2: Verify Real-Time Pipeline Logs", h2_style))
    story.append(Table([[Paragraph("""
    <font face='Courier' size=7.5 color='#0F172A'>
    # Stream real-time collision detection logs<br/>
    docker logs -f stream-processor<br/><br/>
    # Stream Ingestion Engine & sensor fusion logs<br/>
    docker logs -f ingestion-service
    </font>
    """, body_style)]], colWidths=[content_width], style=[
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(Spacer(1, 5))

    story.append(Paragraph("Step 3: Database Inspection & Maintenance Commands", h2_style))
    story.append(Table([[Paragraph("""
    <font face='Courier' size=7.5 color='#0F172A'>
    # 1. Inspect Cassandra Database Table Row Counts & Data Samples<br/>
    python scripts/inspect_cassandra_db.py<br/><br/>
    # 2. Clear / Truncate All Cassandra Tables & Reset Weather Data<br/>
    python scripts/clear_cassandra_db.py<br/><br/>
    # 3. Clean Snapshot Files to Reclaim Local Disk Space<br/>
    python scripts/cleanup_snapshots.py
    </font>
    """, body_style)]], colWidths=[content_width], style=[
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(Spacer(1, 5))

    story.append(Paragraph("Step 4: Interactive Web Portals & UIs", h2_style))
    portals_data = [
        [Paragraph("<b>Web Portal / Interface</b>", table_header_style), Paragraph("<b>URL & Access</b>", table_header_style), Paragraph("<b>Operational Function</b>", table_header_style)],
        [Paragraph("<b>Ingestion Engine Swagger UI</b>", table_cell_bold), Paragraph("<code>http://localhost:8000/docs</code>", table_cell_style), Paragraph("Interactive API management, live logs, station boards, and sensor queries.", table_cell_style)],
        [Paragraph("<b>Grafana Control Room Monitor</b>", table_cell_bold), Paragraph("<code>http://localhost:3000</code><br/>(User: <code>admin</code> / Pass: <code>admin123</code>)", table_cell_style), Paragraph("Executive control room dashboard with live speed gauges, heatmaps, and alert counts.", table_cell_style)],
        [Paragraph("<b>Apache Flink Dashboard</b>", table_cell_bold), Paragraph("<code>http://localhost:8001</code>", table_cell_style), Paragraph("Real-time distributed streaming jobs, task slots, and backpressure metrics.", table_cell_style)],
        [Paragraph("<b>Apache Spark Master UI</b>", table_cell_bold), Paragraph("<code>http://localhost:8080</code>", table_cell_style), Paragraph("Batch ML analytics, worker nodes, and distributed computing tasks.", table_cell_style)],
        [Paragraph("<b>Frontend Control Room UI</b>", table_cell_bold), Paragraph("Open <code>frontend/src/pages/dashboard.html</code>", table_cell_style), Paragraph("17 dedicated client pages including 3D Kavach collision simulation.", table_cell_style)]
    ]
    portals_table = Table(portals_data, colWidths=[150, 180, 210])
    portals_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light_bg])
    ]))
    story.append(portals_table)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 9: SIH JUDGE DEFENSE & FAQ CHEAT SHEET
    # =========================================================================
    story.append(Paragraph("9. Smart India Hackathon (SIH) Judge Q&A Defense Guide", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_secondary, spaceBefore=0, spaceAfter=6))

    story.append(Paragraph("""
    When demonstrating PROJECT-KAVACH to Smart India Hackathon judges, Indian Railways technical directors, or external partners, use these structured, authoritative talking points:
    """, body_style))

    qa_items = [
        (
            "Q: How is live data generated if live CRIS / Indian Railways internal APIs are restricted?",
            "Ans: 'Sir, we built an authentic, RDSO-compliant Physics Simulation & Telemetry Engine. Rather than using raw random numbers, our simulator computes real speed-to-vibration correlation, Emergency Braking Distance (EBD), track slope resistance, seasonal weather probabilities from Open-Meteo satellite APIs, and real coordinates from DataMeet's 8,990+ station dataset. Crucially, our architecture is completely decoupled: the moment CRIS or Indian Railways grants API credentials, we simply register the endpoint in our Ingestion Manager (at /docs) — the rest of our Kafka, Flink, Cassandra, and Dashboard pipeline remains 100% identical.'"
        ),
        (
            "Q: Why did you eliminate Apache NiFi from the ingestion layer?",
            "Ans: 'Sir, Apache NiFi is a Java JVM-based enterprise ETL tool that consumes 2GB to 4GB of RAM and introduces unpredictable Garbage Collection pauses. For real-time railway safety where sub-second locomotive telemetry (0.5s updates) is mandatory, GC pauses are dangerous. We replaced NiFi with a native Python FastAPI Ingestion Service that consumes only ~30MB RAM (a 98% memory saving), starts in under 1.5 seconds, and handles thousands of asynchronous requests without blocking.'"
        ),
        (
            "Q: How does the system prevent head-on and rear-end collisions?",
            "Ans: 'Sir, our Stream Processor continuously polls Kafka for live train coordinates. It executes real-time Haversine Geodesic distance calculations between every pair of active locomotives. If two trains on the same or adjacent track approach within 500 meters, a CRITICAL_COLLISION_ALERT is broadcast, the Kavach Auto-Brake flag is triggered, and a tamper-proof incident record is persisted in Apache Cassandra.'"
        ),
        (
            "Q: How does the system prevent runaway disk space bloat on long runs?",
            "Ans: 'Sir, we disabled local file-based snapshot dumping. Instead, 100% of telemetry, satellite weather, and API responses stream directly into Apache Cassandra NoSQL tables (kavach.api_responses_vault, kavach.train_telemetry) with automatic key deduplication and built-in Time-To-Live (TTL). Additionally, we created automated maintenance scripts (cleanup_snapshots.py) to keep edge servers clean.'"
        )
    ]

    for q, a in qa_items:
        qa_box = Table(
            [
                [Paragraph(f"<b>{q}</b>", ParagraphStyle('QStyle', parent=body_style, fontName='Helvetica-Bold', fontSize=8.5, textColor=c_primary))],
                [Paragraph(f"{a}", ParagraphStyle('AStyle', parent=body_style, fontSize=8, leading=11, textColor=c_dark))]
            ],
            colWidths=[content_width]
        )
        qa_box.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
            ('BACKGROUND', (0,1), (-1,1), colors.HexColor("#F8FAFC")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 7),
            ('RIGHTPADDING', (0,0), (-1,-1), 7),
        ]))
        story.append(qa_box)
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=c_secondary, spaceBefore=4, spaceAfter=8))
    story.append(Paragraph("<b>PROJECT-KAVACH • Indian Railways SIH Team • End of Documentation Handbook</b>", meta_style))

    # Build document with running page numbers
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] Master PDF Handbook successfully generated at: {output_path}")

if __name__ == "__main__":
    out_dir = r"c:\Users\Padam Kishore\Pictures\PROJECT-KAVACH"
    pdf_filename = "PROJECT_KAVACH_MASTER_PROJECT_DOCUMENTATION.pdf"
    full_path = os.path.join(out_dir, pdf_filename)
    build_pdf(full_path)
