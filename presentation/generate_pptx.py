import sys
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    # Set 16:9 widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Palette (Dark Professional Tech Theme)
    COLOR_BG = RGBColor(11, 19, 43)        # #0B132B Deep Navy
    COLOR_CARD = RGBColor(23, 37, 68)      # #172544 Card Navy
    COLOR_BORDER = RGBColor(40, 65, 110)    # Border Accent
    COLOR_WHITE = RGBColor(255, 255, 255)  # Text primary
    COLOR_MUTED = RGBColor(160, 174, 192)  # Text secondary
    COLOR_CYAN = RGBColor(6, 182, 212)     # #06B6D4 Primary Accent
    COLOR_EMERALD = RGBColor(16, 185, 129)  # #10B981 Success Accent
    COLOR_AMBER = RGBColor(245, 158, 11)   # #F59E0B Warning Accent

    def set_slide_bg(slide):
        bg = slide.background
        fill = bg.fill
        fill.solid()
        fill.fore_color.rgb = COLOR_BG

    def add_header(slide, title_text, category_text="SIH PROJECT PRESENTATION"):
        # Top banner tag
        tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.35), Inches(11.7), Inches(0.4))
        tf_tag = tag_box.text_frame
        tf_tag.word_wrap = True
        p_tag = tf_tag.paragraphs[0]
        p_tag.text = category_text.upper()
        p_tag.font.size = Pt(11)
        p_tag.font.bold = True
        p_tag.font.color.rgb = COLOR_CYAN
        p_tag.font.name = 'Calibri'

        # Main Slide Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.65), Inches(11.7), Inches(0.8))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.size = Pt(24)
        p_title.font.bold = True
        p_title.font.color.rgb = COLOR_WHITE
        p_title.font.name = 'Calibri'

    # -------------------------------------------------------------
    # SLIDE 1: Title, Executive Summary, Problem Statement & Objective
    # -------------------------------------------------------------
    slide1 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide1)

    # Title Card Main Header
    main_title_box = slide1.shapes.add_textbox(Inches(0.8), Inches(0.3), Inches(11.7), Inches(1.3))
    tf1 = main_title_box.text_frame
    tf1.word_wrap = True
    
    p1 = tf1.paragraphs[0]
    p1.text = "AUTONEX"
    p1.font.size = Pt(32)
    p1.font.bold = True
    p1.font.color.rgb = COLOR_CYAN
    p1.font.name = 'Calibri'

    p2 = tf1.add_paragraph()
    p2.text = "Dynamic Forecast of Expected Time of Arrival (ETA) & Safety Management for Coaching Trains"
    p2.font.size = Pt(16)
    p2.font.bold = True
    p2.font.color.rgb = COLOR_WHITE
    p2.font.name = 'Calibri'

    p3 = tf1.add_paragraph()
    p3.text = "Smart India Hackathon (SIH) | Intelligent Multi-Sensor Traffic, Safety & Maintenance System"
    p3.font.size = Pt(11)
    p3.font.color.rgb = COLOR_MUTED
    p3.font.name = 'Calibri'

    # Problem Statement Container (Middle Box)
    card_prob = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.7), Inches(11.733), Inches(2.2))
    card_prob.fill.solid()
    card_prob.fill.fore_color.rgb = COLOR_CARD
    card_prob.line.color.rgb = COLOR_AMBER
    card_prob.line.width = Pt(1.5)

    prob_tf = card_prob.text_frame
    prob_tf.word_wrap = True
    prob_tf.margin_top = Inches(0.15)
    prob_tf.margin_left = Inches(0.3)
    prob_tf.margin_right = Inches(0.3)

    pp0 = prob_tf.paragraphs[0]
    pp0.text = "PROBLEM STATEMENT: STUDENT INNOVATION TECHNOLOGY IDEAS IN TERTIARY SECTORS LIKE HOSPITALITY, FINANCIAL SERVICES, ENTERTAINMENT AND RETAILS"
    pp0.font.size = Pt(11)
    pp0.font.bold = True
    pp0.font.color.rgb = COLOR_AMBER
    pp0.font.name = 'Calibri'

    bullets1 = [
        ("Cross-Sector Innovation Transfer:", " Translating advanced data analytics, sensor telemetry, dynamic forecasting, and automated queue/resource management from tertiary service sectors into heavy railway transport logistics."),
        ("Operational Friction & Delays:", " Traditional transport management suffers from reactive decision-making, manual communication latency, and lack of real-time predictive visibility across complex service networks.")
    ]

    for title, desc in bullets1:
        p = prob_tf.add_paragraph()
        p.space_before = Pt(3)
        run_t = p.add_run()
        run_t.text = "•  " + title
        run_t.font.bold = True
        run_t.font.size = Pt(10.5)
        run_t.font.color.rgb = COLOR_WHITE
        
        run_d = p.add_run()
        run_d.text = desc
        run_d.font.size = Pt(10.5)
        run_d.font.color.rgb = COLOR_MUTED

    # Objective & Railway Problem Statement Box (Bottom Box)
    card_obj = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(4.1), Inches(11.733), Inches(3.0))
    card_obj.fill.solid()
    card_obj.fill.fore_color.rgb = COLOR_CARD
    card_obj.line.color.rgb = COLOR_CYAN
    card_obj.line.width = Pt(1.5)

    obj_tf = card_obj.text_frame
    obj_tf.word_wrap = True
    obj_tf.margin_top = Inches(0.15)
    obj_tf.margin_left = Inches(0.3)
    obj_tf.margin_right = Inches(0.3)

    op0 = obj_tf.paragraphs[0]
    op0.text = "OBJECTIVE: RAILWAY TRAFFIC BOTTLENECK ELIMINATION, MULTI-SENSOR INTEGRATION & ETA FORECAST"
    op0.font.size = Pt(12)
    op0.font.bold = True
    op0.font.color.rgb = COLOR_CYAN
    op0.font.name = 'Calibri'

    obj_bullets = [
        ("Cascading Network Delays:", " Freight trains (maal gadi) choke express corridors, causing massive cascading delay propagation for high-priority coaching trains."),
        ("Multi-Sensor Integration (Speed, Safety & Track Health):", " Deploying wheel tachometers and axle counter sensors for live train speed tracking, proximity/brake sensors for safety management, and trackside strain & vibration sensors for predictive track maintenance."),
        ("Pre-emptive Overtake & Halt Optimization:", " Detecting speed deltas and distance gaps 20-30 minutes in advance to shunt freight trains into loop lines smoothly with zero collision risk."),
        ("Dynamic Live ETA Readout:", " Delivering sub-second accurate ETA updates to Station Master signaling consoles and passenger screens, eliminating financial and fuel losses.")
    ]

    for title, desc in obj_bullets:
        p = obj_tf.add_paragraph()
        p.space_before = Pt(3)
        run_t = p.add_run()
        run_t.text = "•  " + title
        run_t.font.bold = True
        run_t.font.size = Pt(10.5)
        run_t.font.color.rgb = COLOR_WHITE
        
        run_d = p.add_run()
        run_d.text = desc
        run_d.font.size = Pt(10.5)
        run_d.font.color.rgb = COLOR_MUTED

    # -------------------------------------------------------------
    # SLIDE 2: Core System Overview & Multi-Sensor Telemetry
    # -------------------------------------------------------------
    slide2 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide2)
    add_header(slide2, "AUTONEX Multi-Sensor Engine: Real-Time Speed, Safety & Track Maintenance")

    cards_data2 = [
        ("1. Train Speed & Telemetry Sensors", 
         "• Live Speed Tracking: Wheel tachometers and axle counters capture real-time train speed and acceleration profiles.\n• GPS + Trackside RFID Telemetry: Calculates exact gap (in meters) between preceding and trailing trains in real-time.\n• Fail-Safe Anti-Collision: Enforces dynamic braking curves based on speed sensor data.", 
         COLOR_CYAN),
        ("2. Track Maintenance & Safety Sensors", 
         "• Track Performance Sensors: Strain gauges and vibration accelerometers monitor rail stress, load distribution, and ballast stability.\n• Preventive Maintenance Alerts: Automatically flags track wear & deformation before failures occur.\n• Trackside Thermal & Structural Sensors: Monitors rail temperature expansion to prevent track buckling.", 
         COLOR_EMERALD),
        ("3. Live Accurate ETA & Signal Advisory", 
         "• Dynamic Forecast Readout: Instant calculation of Expected Time of Arrival (ETA) displayed live on station screens (+18 min delay recovery).\n• AI Traffic Optimization: Recommends optimal speed recovery profiles 30-40 km in advance.\n• Station Master Signal Sync: Seamless interlock with station signaling terminals.", 
         COLOR_AMBER)
    ]

    for idx, (ctitle, cdesc, ccolor) in enumerate(cards_data2):
        left_pos = Inches(0.8 + idx * 4.0)
        card = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_pos, Inches(1.8), Inches(3.733), Inches(5.0))
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_CARD
        card.line.color.rgb = ccolor
        card.line.width = Pt(2)

        ctf = card.text_frame
        ctf.word_wrap = True
        ctf.margin_top = Inches(0.3)
        ctf.margin_left = Inches(0.3)
        ctf.margin_right = Inches(0.3)

        cp0 = ctf.paragraphs[0]
        cp0.text = ctitle
        cp0.font.size = Pt(14)
        cp0.font.bold = True
        cp0.font.color.rgb = ccolor
        cp0.font.name = 'Calibri'

        cp1 = ctf.add_paragraph()
        cp1.text = cdesc
        cp1.space_before = Pt(14)
        cp1.font.size = Pt(12)
        cp1.font.color.rgb = COLOR_WHITE
        cp1.font.name = 'Calibri'

    # -------------------------------------------------------------
    # SLIDE 3: Scenario 1 - Dynamic Speed Recovery & Safe Distance Control
    # -------------------------------------------------------------
    slide3 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide3)
    add_header(slide3, "Scenario 1: Dynamic Speed Recovery, Sensor Safety & Distance Control")

    card3_left = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(6.8), Inches(5.0))
    card3_left.fill.solid()
    card3_left.fill.fore_color.rgb = COLOR_CARD
    card3_left.line.color.rgb = COLOR_BORDER
    card3_left.line.width = Pt(1.5)

    tf3l = card3_left.text_frame
    tf3l.word_wrap = True
    tf3l.margin_top = Inches(0.3)
    tf3l.margin_left = Inches(0.4)

    p3l_head = tf3l.paragraphs[0]
    p3l_head.text = "SPEED BOOST WITH MULTI-SENSOR SAFETY MANAGEMENT"
    p3l_head.font.size = Pt(14)
    p3l_head.font.bold = True
    p3l_head.font.color.rgb = COLOR_CYAN

    bullets3 = [
        ("Speed Sensor Telemetry:", " Speed sensors (wheel tachometers & axle counters) continuously monitor train speed to ensure permissible section limit acceleration."),
        ("Track Performance Validation:", " Track strain and vibration sensors confirm track health stability before permitting speed recovery."),
        ("Real-Time Inter-Train Gap Guard:", " Telemetry data of preceding and trailing trains streams synchronously to maintain mandatory safe braking distance."),
        ("Collision Prevention Assurance:", " If inter-train gap narrows below safe threshold, the system automatically throttles back or applies controlled braking.")
    ]

    for title, desc in bullets3:
        p = tf3l.add_paragraph()
        p.space_before = Pt(8)
        rt = p.add_run()
        rt.text = "• " + title
        rt.font.bold = True
        rt.font.size = Pt(12)
        rt.font.color.rgb = COLOR_WHITE

        rd = p.add_run()
        rd.text = desc
        rd.font.size = Pt(12)
        rd.font.color.rgb = COLOR_MUTED

    card3_right = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.8), Inches(1.8), Inches(4.733), Inches(5.0))
    card3_right.fill.solid()
    card3_right.fill.fore_color.rgb = COLOR_CARD
    card3_right.line.color.rgb = COLOR_CYAN
    card3_right.line.width = Pt(2)

    tf3r = card3_right.text_frame
    tf3r.word_wrap = True
    tf3r.margin_top = Inches(0.3)
    tf3r.margin_left = Inches(0.3)

    p3r_head = tf3r.paragraphs[0]
    p3r_head.text = "AUTONEX SENSOR & SAFETY MATRIX"
    p3r_head.font.size = Pt(15)
    p3r_head.font.bold = True
    p3r_head.font.color.rgb = COLOR_EMERALD

    specs3 = [
        ("Speed Telemetry:", " Wheel Tachometers + Axle Counters"),
        ("Track Maintenance:", " Strain Gauges + Vibration Sensors"),
        ("Location Tracking:", " GPS + Trackside RFID Transponders"),
        ("Gap Calculation:", " Continuous Sub-Second Delta"),
        ("ETA Forecast Model:", " Dynamic Live Delay Adjustment"),
        ("Collision Risk:", " 0% (Fail-Safe Sensor Interlock)")
    ]

    for label, val in specs3:
        p = tf3r.add_paragraph()
        p.space_before = Pt(10)
        rl = p.add_run()
        rl.text = label
        rl.font.bold = True
        rl.font.size = Pt(12)
        rl.font.color.rgb = COLOR_WHITE

        rv = p.add_run()
        rv.text = val
        rv.font.size = Pt(12)
        rv.font.color.rgb = COLOR_CYAN

    # -------------------------------------------------------------
    # SLIDE 4: Scenario 2 - Pre-emptive Loop Line & Dynamic Halt Management
    # -------------------------------------------------------------
    slide4 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide4)
    add_header(slide4, "Scenario 2: Pre-emptive Loop Line Routing & Dynamic Station Halt")

    card4_top = slide4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(11.733), Inches(2.4))
    card4_top.fill.solid()
    card4_top.fill.fore_color.rgb = COLOR_CARD
    card4_top.line.color.rgb = COLOR_EMERALD
    card4_top.line.width = Pt(2)

    tf4t = card4_top.text_frame
    tf4t.word_wrap = True
    tf4t.margin_top = Inches(0.2)
    tf4t.margin_left = Inches(0.4)

    p4t_h = tf4t.paragraphs[0]
    p4t_h.text = "A) PRE-EMPTIVE 20-30 MIN LOOP LINE SHUNTING (FAST OVERTAKE)"
    p4t_h.font.size = Pt(14)
    p4t_h.font.bold = True
    p4t_h.font.color.rgb = COLOR_EMERALD

    p4t_b1 = tf4t.add_paragraph()
    p4t_b1.space_before = Pt(6)
    p4t_b1.text = "• Speed & Distance Gap Detection: When a Coaching train approaches a slower Freight train, AUTONEX speed sensors and gap telemetry detect closing distance 20–30 minutes in advance."
    p4t_b1.font.size = Pt(12)
    p4t_b1.font.color.rgb = COLOR_WHITE

    p4t_b2 = tf4t.add_paragraph()
    p4t_b2.space_before = Pt(4)
    p4t_b2.text = "• Seamless Shunting: The slower freight train is pre-routed into a loop line smoothly ahead of time, allowing the coaching train to overtake effortlessly without abrupt stopping."
    p4t_b2.font.size = Pt(12)
    p4t_b2.font.color.rgb = COLOR_MUTED

    card4_bot = slide4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(4.4), Inches(11.733), Inches(2.4))
    card4_bot.fill.solid()
    card4_bot.fill.fore_color.rgb = COLOR_CARD
    card4_bot.line.color.rgb = COLOR_CYAN
    card4_bot.line.width = Pt(2)

    tf4b = card4_bot.text_frame
    tf4b.word_wrap = True
    tf4b.margin_top = Inches(0.2)
    tf4b.margin_left = Inches(0.4)

    p4b_h = tf4b.paragraphs[0]
    p4b_h.text = "B) DYNAMIC STATION HALT SHIFTING (BOTTLENECK AVOIDANCE)"
    p4b_h.font.size = Pt(14)
    p4b_h.font.bold = True
    p4b_h.font.color.rgb = COLOR_CYAN

    p4b_b1 = tf4b.add_paragraph()
    p4b_b1.space_before = Pt(6)
    p4b_b1.text = "• Smart Station Halt Selection: If stopping a train at a congested station will choke section throughput, AUTONEX dynamically shifts operational halts to the next available station."
    p4b_b1.font.size = Pt(12)
    p4b_b1.font.color.rgb = COLOR_WHITE

    p4b_b2 = tf4b.add_paragraph()
    p4b_b2.space_before = Pt(4)
    p4b_b2.text = "• Real-Time Controller Sync: Updated ETA schedules and track status are broadcast live to station master signaling screens."
    p4b_b2.font.size = Pt(12)
    p4b_b2.font.color.rgb = COLOR_MUTED

    # -------------------------------------------------------------
    # SLIDE 5: Expected Impact, Safety & Key Outcomes
    # -------------------------------------------------------------
    slide5 = prs.slides.add_slide(blank_layout)
    set_slide_bg(slide5)
    add_header(slide5, "Expected Impact & Value Proposition for Indian Railways")

    metrics5 = [
        ("0%", "Collision Risk", "Fail-safe speed & proximity sensor interlocks", COLOR_EMERALD),
        ("35-40%", "Delay Reduction", "Eliminating cascading bottleneck delays", COLOR_CYAN),
        ("Predictive", "Track Maintenance", "Track strain & vibration sensor telemetry", COLOR_AMBER),
        ("100%", "Accurate Screen Visibility", "Real-time location, speed & ETA on screen", COLOR_WHITE)
    ]

    for idx, (val, title, desc, color) in enumerate(metrics5):
        left_pos = Inches(0.8 + idx * 3.0)
        card = slide5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_pos, Inches(1.8), Inches(2.733), Inches(2.2))
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_CARD
        card.line.color.rgb = color
        card.line.width = Pt(2)

        ctf = card.text_frame
        ctf.word_wrap = True
        ctf.margin_top = Inches(0.2)
        ctf.margin_left = Inches(0.2)

        cp0 = ctf.paragraphs[0]
        cp0.text = val
        cp0.font.size = Pt(24)
        cp0.font.bold = True
        cp0.font.color.rgb = color
        cp0.font.name = 'Calibri'

        cp1 = ctf.add_paragraph()
        cp1.text = title
        cp1.font.size = Pt(12)
        cp1.font.bold = True
        cp1.font.color.rgb = COLOR_WHITE
        cp1.font.name = 'Calibri'

        cp2 = ctf.add_paragraph()
        cp2.text = desc
        cp2.font.size = Pt(10.5)
        cp2.font.color.rgb = COLOR_MUTED
        cp2.font.name = 'Calibri'

    card5_bot = slide5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(4.3), Inches(11.733), Inches(2.5))
    card5_bot.fill.solid()
    card5_bot.fill.fore_color.rgb = COLOR_CARD
    card5_bot.line.color.rgb = COLOR_BORDER
    card5_bot.line.width = Pt(1.5)

    tf5b = card5_bot.text_frame
    tf5b.word_wrap = True
    tf5b.margin_top = Inches(0.2)
    tf5b.margin_left = Inches(0.4)

    p5_h = tf5b.paragraphs[0]
    p5_h.text = "WHY AUTONEX IS A GAME-CHANGER FOR SIH & INDIAN RAILWAYS"
    p5_h.font.size = Pt(14)
    p5_h.font.bold = True
    p5_h.font.color.rgb = COLOR_CYAN

    points5 = [
        "1. Dynamic ETA Forecasting: Accurate live ETA predictions dynamically updated via multi-sensor telemetry.",
        "2. Multi-Sensor Safety Management: Speed sensors, proximity tracking, and track health monitoring ensure 0% collision and derailment risk.",
        "3. Predictive Track Maintenance: Continuous trackside sensor telemetry detects rail strain & ballast wear to prevent unscheduled track failures.",
        "4. Optimized Section Capacity: Pre-emptively shunts slow freight trains to loop lines 20-30 mins prior, keeping high-speed corridors unlocked."
    ]

    for pt in points5:
        p = tf5b.add_paragraph()
        p.space_before = Pt(4)
        p.text = pt
        p.font.size = Pt(12)
        p.font.color.rgb = COLOR_WHITE

    # Save to presentation folder and root
    output_names = [
        "AUTONEX_SIH_Presentation.pptx",
        "AUTONEX_SIH.pptx",
        "Project_Kavach_SIH_Presentation.pptx",
        "Project_Kavach_SIH.pptx"
    ]
    
    for name in output_names:
        path_pres = os.path.join(os.getcwd(), "presentation", name)
        prs.save(path_pres)
        print(f"Saved: {path_pres}")

if __name__ == "__main__":
    create_deck()
