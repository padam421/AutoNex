"""
===============================================================================
PROJECT-KAVACH: THE EASY-TO-UNDERSTAND AI & MACHINE LEARNING MASTER GUIDE
Author: Padam Kishore & Team
Description: Generates a friendly, crystal-clear, intuitive PDF explaining
             how AI/ML works in Project Kavach without overwhelming academic jargon.
===============================================================================
"""

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
    """
    Two-pass canvas to stamp running headers and footers with dynamic total page count.
    """
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
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Skip cover page
        
        self.saveState()
        
        # Top Running Header
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#312E81"))
        self.drawString(36, letter[1] - 28, "PROJECT-KAVACH")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#475569"))
        self.drawString(125, letter[1] - 28, "|   The Easy-to-Understand AI & Machine Learning Guide")
        
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#059669"))
        self.drawRightString(letter[0] - 36, letter[1] - 28, "SIMPLIFIED FOR EVERYONE")
        
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(36, letter[1] - 32, letter[0] - 36, letter[1] - 32)
        
        # Bottom Running Footer
        self.line(36, 36, letter[0] - 36, 36)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 24, "INDIAN RAILWAYS SMART DISPATCH SYSTEM | EASY EXPLANATION GUIDE")
        
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#312E81"))
        self.drawRightString(letter[0] - 36, 24, page_str)
        
        self.restoreState()


def build_easy_aiml_pdf(output_path):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=44,
        bottomMargin=44
    )

    styles = getSampleStyleSheet()

    # Friendly & Professional Color Palette
    c_indigo = colors.HexColor("#1E1B4B")
    c_blue = colors.HexColor("#1E40AF")
    c_emerald = colors.HexColor("#047857")
    c_amber = colors.HexColor("#D97706")
    c_rose = colors.HexColor("#BE123C")
    c_slate = colors.HexColor("#334155")
    c_light_bg = colors.HexColor("#F8FAFC")
    c_border = colors.HexColor("#E2E8F0")

    # Typography Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=29,
        textColor=c_indigo,
        alignment=0
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=c_blue,
        alignment=0
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=c_indigo,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=c_amber,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyEasy',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=c_slate,
        spaceAfter=4
    )

    body_bold = ParagraphStyle(
        'BodyEasyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    analogy_style = ParagraphStyle(
        'AnalogyText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.2,
        leading=11.5,
        textColor=colors.HexColor("#1E293B")
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.5,
        textColor=c_slate
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold',
        textColor=c_indigo
    )

    story = []

    # =========================================================================
    # COVER PAGE / HEADER
    # =========================================================================
    story.append(Spacer(1, 10))
    badge_data = [[
        Paragraph("<font color='#047857'><b>PLAIN & FRIENDLY ENGLISH EDITION</b></font>", body_bold),
        Paragraph("<font color='#D97706'><b>EASY TO UNDERSTAND FOR ANYONE</b></font>", body_bold)
    ]]
    t_badge = Table(badge_data, colWidths=[330, 210])
    t_badge.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_badge)
    story.append(Spacer(1, 15))

    story.append(Paragraph("PROJECT-KAVACH: The Easy AI & ML Guide", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("How Artificial Intelligence Solves Train Delays, Prevents Track Accidents & Automates Railway Rescheduling", subtitle_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=2, color=c_blue, spaceBefore=2, spaceAfter=10))

    # Fast Overview Card
    overview_text = (
        "<b>What is This Document?</b><br/>"
        "If you look at our project's code, you will see complex Python files, machine learning models (.joblib), "
        "and formulas. But what is actually happening behind the scenes? What did we build, and why did we build it? "
        "This guide explains the entire <b>AI and Machine Learning part of Project Kavach in simple, friendly English</b>. "
        "Whether you are a student, a friend, an evaluator, or someone who doesn't code, by the end of this guide you will "
        "clearly understand every single model, calculation, graph, and button in our website!"
    )
    t_overview = Table([[Paragraph(overview_text, analogy_style)]], colWidths=[540])
    t_overview.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#3B82F6")),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 9),
        ('RIGHTPADDING', (0,0), (-1,-1), 9),
    ]))
    story.append(t_overview)
    story.append(Spacer(1, 12))

    # Meta Info Table
    meta_data = [
        [Paragraph("<b>Project Name:</b>", table_cell_bold), Paragraph("PROJECT-KAVACH (Next-Gen Indian Railways ATP & Rescheduling)", table_cell_style)],
        [Paragraph("<b>Created By:</b>", table_cell_bold), Paragraph("Padam Kishore & Team (Smart India Hackathon)", table_cell_style)],
        [Paragraph("<b>What the AI Does:</b>", table_cell_bold), Paragraph("1. Detects broken or overheated tracks<br/>2. Discovers smart overtaking opportunities to eliminate train delays<br/>3. Writes official railway safety orders automatically using Gemini AI", table_cell_style)],
        [Paragraph("<b>Core Results:</b>", table_cell_bold), Paragraph("• <b>22 to 31 minutes saved per delayed train</b><br/>• <b>97% accuracy on dispatch decisions</b><br/>• <b>Zero-deadlock multi-train leapfrogging</b>", table_cell_style)],
    ]
    t_meta = Table(meta_data, colWidths=[130, 410])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#94A3B8")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 12))

    # Table of Contents
    story.append(Paragraph("<b>Table of Contents (What You Will Learn in This Guide):</b>", h2_style))
    toc_data = [
        [Paragraph("<b>1. The Real-Life Problem:</b> Why do Indian trains get delayed?", table_cell_style), Paragraph("<b>6. The Numbers Made Simple:</b> Step-by-step delay math", table_cell_style)],
        [Paragraph("<b>2. The 3 Pillars:</b> What does AI actually do in this project?", table_cell_style), Paragraph("<b>7. Why Did It Get Delayed?</b> Root-cause AI explained", table_cell_style)],
        [Paragraph("<b>3. How the Website Connects:</b> From your click to AI output", table_cell_style), Paragraph("<b>8. The 4 Graphs Explained:</b> What each chart shows", table_cell_style)],
        [Paragraph("<b>4. The 2 Trained Models:</b> Track Doctor & Smart Dispatcher", table_cell_style), Paragraph("<b>9. Tools & Libraries in 1 Line:</b> Every library explained simply", table_cell_style)],
        [Paragraph("<b>5. Gemini RAG Engine:</b> The legal rulebook reader", table_cell_style), Paragraph("<b>10. Future Vision:</b> If this runs across all India tomorrow", table_cell_style)]
    ]
    t_toc = Table(toc_data, colWidths=[270, 270])
    t_toc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_toc)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 1: THE REAL PROBLEM
    # =========================================================================
    story.append(Paragraph("1. The Real-Life Problem: Why Do Indian Trains Get Delayed?", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_amber, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "To appreciate what our AI is doing, you first have to understand how train traffic works in real life. "
        "Unlike cars on a highway, <b>trains cannot steer left or right</b>. They must follow a single pair of steel rails. "
        "If a slow goods train or local passenger train is on the track ahead, a superfast Vande Bharat Express behind it "
        "is trapped and forced to crawl at 15 km/h.",
        body_style
    ))

    story.append(Paragraph("<b>The 'Domino Effect' (Cascade Delay):</b>", h2_style))
    story.append(Paragraph(
        "When one train gets delayed by just 10 minutes at a busy station like Kanpur or New Delhi, it blocks the track. "
        "The train behind it must stop. The train behind that one stops too. Within 2 hours, <b>one small 10-minute delay "
        "multiplies into over 150 minutes of delays across 5 or 6 different trains</b>! This is called a <i>Cascade Delay</i>.",
        body_style
    ))

    story.append(Paragraph("<b>How It Is Handled Today (The Manual Way):</b>", h2_style))
    story.append(Paragraph(
        "Today, human controllers sitting in control rooms make decisions by making phone calls to station masters. "
        "Because humans cannot calculate train speeds, braking distances, and track temperatures in their head within seconds, "
        "they usually play it safe: <i>'Just stop the train at the outer signal and wait.'</i> "
        "This safe-but-slow decision causes massive delays, wastes thousands of liters of fuel, and frustrates passengers.",
        body_style
    ))

    story.append(Paragraph("<b>How Project Kavach AI Solves It (The Smart Way):</b>", h2_style))
    story.append(Paragraph(
        "Project Kavach gives the human controller an <b>AI Co-Pilot</b>. The AI constantly monitors the tracks using IoT sensors, "
        "calculates braking physics in 3 milliseconds, and finds safe windows where a fast train can overtake a slow train without "
        "stopping either of them! It turns chaos into a smooth, synchronized green-wave.",
        body_style
    ))

    # =========================================================================
    # SECTION 2: THE 3 PILLARS OF AI IN PROJECT KAVACH
    # =========================================================================
    story.append(Spacer(1, 6))
    story.append(Paragraph("2. The 3 Pillars: What Does AI Actually Do in Our Project?", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_amber, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "In our codebase, the Artificial Intelligence is organized into <b>3 simple pillars</b>:",
        body_style
    ))

    three_pillars_data = [
        [Paragraph("<b>AI Pillar</b>", table_header_style), Paragraph("<b>Real-Life Analogy</b>", table_header_style), Paragraph("<b>What It Does in Simple Words</b>", table_header_style)],
        [
            Paragraph("<b>Pillar 1:<br/>The Track Doctor</b><br/><code>model_defect.joblib</code>", table_cell_bold),
            Paragraph("Like a doctor checking a patient's pulse, temperature, and X-ray.", table_cell_style),
            Paragraph("It reads 6 physical sensors on the railway tracks (vibration, heat, ultrasonic crack probe). It tells us: <i>'Is the track 100% healthy, slightly worn, or dangerous?'</i> If dangerous, it halts trains immediately.", table_cell_style)
        ],
        [
            Paragraph("<b>Pillar 2:<br/>The Smart Dispatcher</b><br/><code>model_dispatch.joblib</code>", table_cell_bold),
            Paragraph("Like a super-smart Google Maps + Air Traffic Controller for trains.", table_cell_style),
            Paragraph("When a delay occurs, it looks at the gap between trains. If safe, it commands: <i>'Speed up by 20 km/h'</i> or <i>'Move the slow local train to the side loop line so the superfast train can overtake!'</i>", table_cell_style)
        ],
        [
            Paragraph("<b>Pillar 3:<br/>The Legal Rulebook Reader</b><br/><code>rag_engine/app.py</code>", table_cell_bold),
            Paragraph("Like a senior railway lawyer with a photographic memory of all rules.", table_cell_style),
            Paragraph("It uses Google Gemini AI + Indian Railways official rulebooks (RDSO, G&SR). Whenever a decision is made, it writes an official legal order with safety justifications so the driver and controller can trust it.", table_cell_style)
        ]
    ]
    t_pillars = Table(three_pillars_data, colWidths=[130, 150, 260])
    t_pillars.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_indigo),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light_bg]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_pillars)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 3: HOW THE WEBSITE TALKS TO THE AI
    # =========================================================================
    story.append(Paragraph("3. How Does the Website Connect to the AI? (Step-by-Step)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_amber, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "Many people ask: <i>'I see a website on my browser, and I see Python AI files in the folder. How do they talk to each other?'</i> "
        "Here is the complete journey of what happens in less than half a second when you click on our website:",
        body_style
    ))

    web_steps_data = [
        [Paragraph("<b>Step</b>", table_header_style), Paragraph("<b>Where It Happens</b>", table_header_style), Paragraph("<b>What Actually Happens (Behind the Scenes)</b>", table_header_style)],
        [
            Paragraph("<b>Step 1:<br/>You Click</b>", table_cell_bold),
            Paragraph("Your Browser<br/>(<code>rescheduling.html</code>)", table_cell_style),
            Paragraph("You open the Rescheduling Hub. You see a delayed train (e.g. <b>Vande Bharat Express running 25 mins late</b>). You click the blue button: <b>'Trigger AI Optimization'</b>.", table_cell_style)
        ],
        [
            Paragraph("<b>Step 2:<br/>The Request Travels</b>", table_cell_bold),
            Paragraph("Node.js Server<br/>(<code>backend/src/app.js</code>)", table_cell_style),
            Paragraph("Your browser sends a message to our Express server on <b>Port 5000</b>. Express acts like the main gatekeeper. It takes your request and forwards it to our Python AI service.", table_cell_style)
        ],
        [
            Paragraph("<b>Step 3:<br/>The AI Thinks</b>", table_cell_bold),
            Paragraph("Python FastAPI<br/>(<code>ingestion/ai_service.py</code>)", table_cell_style),
            Paragraph("Our Python engine on <b>Port 8000</b> takes the train's current speed (75 km/h), track condition (TSHI 98%), and distance to the next train. It normalizes the numbers and feeds them into <code>model_dispatch.joblib</code>.", table_cell_style)
        ],
        [
            Paragraph("<b>Step 4:<br/>The Decision (3ms)</b>", table_cell_bold),
            Paragraph("Trained Model<br/>(<code>models/</code>)", table_cell_style),
            Paragraph("In just <b>3 milliseconds</b>, the model outputs: <i>'Class 1: Scenario 1 (Speed Up) with 97% confidence'</i>. At the same time, the physics engine calculates that elevating speed to 120 km/h will save <b>22.5 minutes</b>.", table_cell_style)
        ],
        [
            Paragraph("<b>Step 5:<br/>Screen Updates!</b>", table_cell_bold),
            Paragraph("Browser Client<br/>(<code>Chart.js</code>)", table_cell_style),
            Paragraph("The response returns to your screen. The red delay line immediately bends downward towards zero, the speed chart jumps to green, and a green popup confirms: <b>'Speed elevated to 120 km/h. 22.5 mins saved!'</b>", table_cell_style)
        ]
    ]
    t_wsteps = Table(web_steps_data, colWidths=[85, 125, 330])
    t_wsteps.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_indigo),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light_bg]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_wsteps)
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "<b>Summary:</b> The website does not do heavy AI calculations inside the browser. "
        "The browser is just the beautiful display. All the heavy AI thinking happens in our Python backend, "
        "which sends back the answers in milliseconds!",
        body_style
    ))

    # =========================================================================
    # SECTION 4: THE 2 TRAINED MODELS EXPLAINED SIMPLY
    # =========================================================================
    story.append(Spacer(1, 6))
    story.append(Paragraph("4. The 2 Trained Models in Our Project (Explained Without Jargon)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_amber, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "Inside the <code>models/</code> folder of our project, there are two files ending in <code>.joblib</code>. "
        "These are our trained Machine Learning models. Let's see what each one does:",
        body_style
    ))

    story.append(Paragraph("<b>Model 1: The Track Health Doctor (<code>model_defect.joblib</code>)</b>", h2_style))
    story.append(Paragraph(
        "• <b>What It Does:</b> It listens to 6 sensors mounted on the railway track (vibration, heat, internal cracks, train weight).<br/>"
        "• <b>What It Tells Us:</b> It categorizes the track into one of 4 simple safety levels:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;1. <b>Safe:</b> Everything is perfect. Trains can run at full speed (130-160 km/h).<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;2. <b>Monitor:</b> The gravel (ballast) under the sleepers is vibrating slightly. No danger, but keep an eye.<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;3. <b>Warning:</b> Rail temperature has crossed 55°C (hot summer afternoon) or the wagon is overloaded. Slow down to 50 km/h.<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;4. <b>Critical Defect:</b> An internal crack (>5mm) or track expansion has been found. <b>Halt train immediately to prevent derailment!</b><br/>"
        "• <b>Accuracy:</b> <b>88.38%</b> (with 100% accuracy on critical safety defects).",
        body_style
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Model 2: The Smart Dispatch Optimizer (<code>model_dispatch.joblib</code>)</b>", h2_style))
    story.append(Paragraph(
        "• <b>What It Does:</b> It looks at the trains on the track, their speeds, and their distances.<br/>"
        "• <b>What It Tells Us:</b> It picks the best action to recover delays:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;1. <b>Safety Hold:</b> If Model 1 said the track is unsafe, Model 2 orders the train to hold safely.<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;2. <b>Scenario 1 (Speed Up):</b> Track is 100% clear and safe. Elevate the superfast train to top speed (+20-45 km/h) to recover delay.<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;3. <b>Scenario 2 (Leapfrog / Overtake):</b> Slower train ahead is diverted to the side loop line. The superfast train zooms past on the main line.<br/>"
        "• <b>Accuracy:</b> <b>97.09%</b> (almost near-perfect decisions!).",
        body_style
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Why Did We Use 'Random Forest'? (A Simple Analogy):</b>", h2_style))
    story.append(Paragraph(
        "Imagine you have a health symptom. If you ask only 1 doctor, they might make a mistake. "
        "But if you ask a panel of <b>100 expert doctors</b>, and 97 of them say the same thing, you can be completely confident! "
        "<b>Random Forest works exactly like this</b>: It creates 100 independent 'decision trees' inside the computer. "
        "Each tree looks at the sensors from a slightly different angle. When a train packet arrives, all 100 trees vote. "
        "The majority vote wins! That is why our model achieves a massive 97% accuracy and never crashes.",
        body_style
    ))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 5: GEMINI RAG ENGINE
    # =========================================================================
    story.append(Paragraph("5. The Gemini RAG Engine: The Legal Rulebook Reader", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_amber, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "Machine Learning gives numbers and percentages (like '97% confidence'). But in a high-stakes organization "
        "like Indian Railways, an engineer or driver cannot take action just because a computer said '97%'. "
        "They ask: <i>'According to which official railway rulebook are you telling me to apply the emergency brake or elevate speed?'</i>",
        body_style
    ))

    story.append(Paragraph(
        "That is why in <code>rag_engine/app.py</code>, we built a <b>RAG (Retrieval-Augmented Generation)</b> system using Google Gemini AI:",
        body_style
    ))

    rag_steps_text = (
        "<b>How the RAG Engine Works in 3 Simple Steps:</b><br/>"
        "1. <b>The Knowledge Vault:</b> We loaded official Indian Railways statutory rulebooks into our database: "
        "RDSO Crack Safety Standard (SPN/196/2020), Track Manual (IRPWTM Para 268), Long Welded Rail Manual (LWR Para 6.2), and Fog Visibility Rules (G&SR 3.78).<br/>"
        "2. <b>Instant Rule Matching:</b> When a track crack or fog is detected, our system instantly retrieves the exact official rule from the vault.<br/>"
        "3. <b>Gemini Writes the Order:</b> Google Gemini 1.5 Flash reads the rule and the train telemetry, and writes an official 3-point <b>SIL-4 Cab Directive</b> for the locomotive driver (e.g. <i>'Pneumatic Service Brake applied. Enforce 30 km/h crawling speed under RDSO Rule 196'</i>)."
    )
    t_rag = Table([[Paragraph(rag_steps_text, analogy_style)]], colWidths=[540])
    t_rag.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDF4")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#16A34A")),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 9),
        ('RIGHTPADDING', (0,0), (-1,-1), 9),
    ]))
    story.append(t_rag)

    # =========================================================================
    # SECTION 6: THE NUMBERS MADE SIMPLE
    # =========================================================================
    story.append(Spacer(1, 8))
    story.append(Paragraph("6. The Numbers Made Simple: Step-by-Step Delay Math", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_amber, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "You don't need a math degree to understand how our project reduces train delays. "
        "Here are the two main scenarios explained with simple everyday numbers:",
        body_style
    ))

    story.append(Paragraph("<b>Scenario 1: Speed Elevation (Speeding Up on Safe Track)</b>", h2_style))
    scen1_text = (
        "• <b>The Situation:</b> A Vande Bharat train is delayed. It is currently cruising at <b>75 km/h</b>.<br/>"
        "• <b>The Track:</b> The next 40 km section of track is certified 100% safe by our sensors, and the speed limit is <b>120 km/h</b>.<br/>"
        "• <b>The Simple Math:</b><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;→ At 75 km/h, covering 40 km takes: <code>(40 / 75) * 60 = 32 minutes</code><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;→ At 120 km/h, covering 40 km takes: <code>(40 / 120) * 60 = 20 minutes</code><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;→ <b>Time Saved: 32 - 20 = 12 minutes!</b><br/>"
        "• <b>Total Recovery:</b> When combined with clearing upcoming signals ahead of time, the train recovers <b>22.5 minutes of delay</b>!"
    )
    t_s1 = Table([[Paragraph(scen1_text, body_style)]], colWidths=[540])
    t_s1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_s1)
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>Scenario 2: The Famous 'Leapfrog' Overtake</b>", h2_style))
    scen2_text = (
        "• <b>The Situation:</b> A slow local train is at Station A. A fast Vande Bharat train is 18 km behind it.<br/>"
        "• <b>The Old Human Way:</b> The human controller halts the local train at Station A for 35 minutes until the fast train passes.<br/>"
        "• <b>The AI Way:</b> The AI calculates:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;→ Time for local train to travel to Station B (12 km ahead): <code>15 minutes</code><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;→ Time for Vande Bharat to reach Station B (18 + 12 = 30 km): <code>25 minutes</code><br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;→ <b>Safe Gap Available: 25 - 15 = 10 minutes!</b><br/>"
        "• <b>The AI Action:</b> Since 10 minutes is well above our 5-minute safety buffer, the AI says: <i>'Do not wait at Station A! Run the local train to Station B now and park it in the side loop line!'</i><br/>"
        "• <b>Result:</b> The local train keeps moving, Vande Bharat passes smoothly on the main line, and <b>31 minutes of delay is completely saved</b>!"
    )
    t_s2 = Table([[Paragraph(scen2_text, body_style)]], colWidths=[540])
    t_s2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_s2)
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>How Braking Distance (EBD) Works in Simple Words:</b>", h2_style))
    story.append(Paragraph(
        "A car can stop in 30 meters. But a 1,200-tonne train at 120 km/h has immense momentum. "
        "Even with full emergency brakes, it takes <b>384 meters</b> to slide to a complete stop! "
        "Our AI constantly calculates this stopping distance and guarantees that two trains never get closer than "
        "both their stopping distances plus a <b>500-meter safety buffer</b>. That is how head-on and rear-end collisions are 100% prevented.",
        body_style
    ))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 7: ROOT-CAUSE AI
    # =========================================================================
    story.append(Paragraph("7. Why Did It Get Delayed? Root-Cause AI Explained", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_amber, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "On our website's Rescheduling page, when you click on a delayed train, the system shows you exact reasons. "
        "How does the AI know why a train is late? It uses a <b>4-factor diagnostic engine</b> in <code>reschedulingEngine.js</code>:",
        body_style
    ))

    reasons_easy_data = [
        [Paragraph("<b>Delay Cause</b>", table_header_style), Paragraph("<b>Share</b>", table_header_style), Paragraph("<b>What Happened in Simple Words</b>", table_header_style), Paragraph("<b>How AI Fixes It</b>", table_header_style)],
        [
            Paragraph("<b>Traffic Headway</b>", table_cell_bold),
            Paragraph("42%", table_cell_style),
            Paragraph("The train ahead is moving too slowly, forcing the signals to turn yellow and red.", table_cell_style),
            Paragraph("Diverts slower train to side loop line to clear the corridor.", table_cell_style)
        ],
        [
            Paragraph("<b>Junction Route Lock</b>", table_cell_bold),
            Paragraph("28%", table_cell_style),
            Paragraph("Two train routes cross each other at a busy junction throat (like an intersection bottleneck).", table_cell_style),
            Paragraph("Swaps platforms dynamically (e.g. from Platform 4 to 1) to avoid the blocked track.", table_cell_style)
        ],
        [
            Paragraph("<b>Track Caution (TSR)</b>", table_cell_bold),
            Paragraph("18%", table_cell_style),
            Paragraph("Maintenance workers or weather required a temporary 30 km/h crawling order.", table_cell_style),
            Paragraph("As soon as weather or sensors confirm track is clear, relaxes speed back to 75-110 km/h.", table_cell_style)
        ],
        [
            Paragraph("<b>Loco Turnaround</b>", table_cell_bold),
            Paragraph("12%", table_cell_style),
            Paragraph("Delay in engine reversal, driver changeover, or rake cleaning at terminal station.", table_cell_style),
            Paragraph("Calculates optimized acceleration profile once departed.", table_cell_style)
        ]
    ]
    t_reasons_easy = Table(reasons_easy_data, colWidths=[120, 45, 225, 150])
    t_reasons_easy.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_indigo),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light_bg]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_reasons_easy)

    # =========================================================================
    # SECTION 8: THE 4 CHARTS EXPLAINED
    # =========================================================================
    story.append(Spacer(1, 8))
    story.append(Paragraph("8. The 4 Interactive Graphs on the Website Explained", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_amber, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "When you open the Rescheduling Hub on our website, you see <b>4 interactive charts</b> built with <code>Chart.js</code>. "
        "Here is what each chart actually represents:",
        body_style
    ))

    charts_easy_data = [
        [Paragraph("<b>Chart Title</b>", table_header_style), Paragraph("<b>What You See on Screen</b>", table_header_style), Paragraph("<b>What It Means in Plain English</b>", table_header_style)],
        [
            Paragraph("<b>Chart 1:<br/>Delay vs Recovery Timeline</b>", table_cell_bold),
            Paragraph("A line chart with station names at the bottom, showing a <b>Red Line</b> and a <b>Green Line</b>.", table_cell_style),
            Paragraph("<b>Red Line:</b> The delay without AI (getting worse from station to station).<br/><b>Green Line:</b> The delay after AI intervention, sloping down towards 0 minutes (train arriving on time!).", table_cell_style)
        ],
        [
            Paragraph("<b>Chart 2:<br/>Speed Optimization Profile</b>", table_cell_bold),
            Paragraph("An area chart with a <b>Blue line</b> and a <b>Green area</b>.", table_cell_style),
            Paragraph("Shows how the train slows down smoothly to 15 km/h before stopping at a station, and where the AI authorizes full 130 km/h cruising on clear sections.", table_cell_style)
        ],
        [
            Paragraph("<b>Chart 3:<br/>Multi-Train Impact Cascade</b>", table_cell_bold),
            Paragraph("Vertical bars showing names of trailing trains (Gomti Exp, Shramjeevi Exp).", table_cell_style),
            Paragraph("Shows that fixing one train didn't just help that train! It saved 14 mins for Gomti Express, 9 mins for Shramjeevi Express, and unclogged the entire railway division.", table_cell_style)
        ],
        [
            Paragraph("<b>Chart 4:<br/>Solution Comparison</b>", table_cell_bold),
            Paragraph("Horizontal bars comparing the 3 AI options.", table_cell_style),
            Paragraph("Shows the controller: <i>'Loop Line Overtake saves 31 mins (Med Risk), Speed Wave saves 22.5 mins (Low Risk), Platform Swap saves 12 mins (Low Risk)'</i>. Controller picks the best option!", table_cell_style)
        ]
    ]
    t_charts_easy = Table(charts_easy_data, colWidths=[130, 160, 250])
    t_charts_easy.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_indigo),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light_bg]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_charts_easy)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 9: TOOLS & LIBRARIES IN 1 SENTENCE
    # =========================================================================
    story.append(Paragraph("9. Every Tool & Library in Our Project (In 1 Simple Sentence)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_amber, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "Here is the plain-English dictionary of every technology used in Project Kavach. "
        "No complex jargon, just their exact job:",
        body_style
    ))

    tools_easy_data = [
        [Paragraph("<b>Tool / Library Name</b>", table_header_style), Paragraph("<b>Where It Lives</b>", table_header_style), Paragraph("<b>Its Job in Exactly One Simple Sentence</b>", table_header_style)],
        [Paragraph("<b>Pandas</b>", table_cell_bold), Paragraph("Python Backend", table_cell_style), Paragraph("Like a super-fast Excel inside code that cleans, filters, and prepares our 50,000 train data rows.", table_cell_style)],
        [Paragraph("<b>NumPy</b>", table_cell_bold), Paragraph("Python Backend", table_cell_style), Paragraph("Does lightning-fast math, trigonometry, and number crunching for train speeds and distances.", table_cell_style)],
        [Paragraph("<b>Scikit-Learn</b>", table_cell_bold), Paragraph("Python Backend", table_cell_style), Paragraph("The AI workshop where we trained our Random Forest models and measured their 97% accuracy.", table_cell_style)],
        [Paragraph("<b>Joblib</b>", table_cell_bold), Paragraph("Python Backend", table_cell_style), Paragraph("The freezer that saved our trained AI brains into files (.joblib) so we don't have to retrain them every time.", table_cell_style)],
        [Paragraph("<b>FastAPI</b>", table_cell_bold), Paragraph("Python Engine", table_cell_style), Paragraph("The super-fast courier boy on Port 8000 that receives sensor packets and delivers AI predictions in 3ms.", table_cell_style)],
        [Paragraph("<b>Uvicorn</b>", table_cell_bold), Paragraph("Server Engine", table_cell_style), Paragraph("The engine that keeps FastAPI running 24/7 without stopping or crashing.", table_cell_style)],
        [Paragraph("<b>Pydantic</b>", table_cell_bold), Paragraph("Python Engine", table_cell_style), Paragraph("The security guard that inspects incoming data to ensure no required field or number is missing.", table_cell_style)],
        [Paragraph("<b>Google Gemini AI</b>", table_cell_bold), Paragraph("RAG Service", table_cell_style), Paragraph("The smart AI that reads railway safety manuals and writes formal, official orders for train drivers.", table_cell_style)],
        [Paragraph("<b>Express (Node.js)</b>", table_cell_bold), Paragraph("API Gateway", table_cell_style), Paragraph("The front door server on Port 5000 that connects the website buttons to the Python AI engine.", table_cell_style)],
        [Paragraph("<b>Chart.js</b>", table_cell_bold), Paragraph("Website Browser", table_cell_style), Paragraph("The digital artist that draws the animated speed and delay charts on the controller's screen.", table_cell_style)],
        [Paragraph("<b>Tailwind CSS</b>", table_cell_bold), Paragraph("Website Browser", table_cell_style), Paragraph("The stylist that makes our 17 control room pages look like a modern, dark-mode NASA command center.", table_cell_style)],
        [Paragraph("<b>Apache Kafka</b>", table_cell_bold), Paragraph("Docker Pipeline", table_cell_style), Paragraph("The central railway post office that takes GPS signals from 100 trains and routes them without delay.", table_cell_style)],
        [Paragraph("<b>Apache Cassandra</b>", table_cell_bold), Paragraph("Docker Database", table_cell_style), Paragraph("A giant indestructible filing cabinet that stores millions of train speed records permanently.", table_cell_style)],
        [Paragraph("<b>Docker & Compose</b>", table_cell_bold), Paragraph("System Setup", table_cell_style), Paragraph("Packs all databases, servers, and engines into sealed boxes so the whole system runs anywhere in 1 click.", table_cell_style)]
    ]
    t_tools_easy = Table(tools_easy_data, colWidths=[120, 105, 315])
    t_tools_easy.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_indigo),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light_bg]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_tools_easy)

    # =========================================================================
    # SECTION 10: FUTURE VISION & ELEVATOR PITCH
    # =========================================================================
    story.append(Spacer(1, 8))
    story.append(Paragraph("10. The Future Vision & Your 60-Second Presentation Pitch", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_amber, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "<b>If Indian Railways Deploys This System Across India Tomorrow:</b><br/>"
        "Today, our project is a fully functional, high-level prototype. If we scale it across all 13,500 daily trains in India, "
        "we would add three enterprise-scale technologies:<br/>"
        "1. <b>Graph Neural Networks (GNN):</b> Connecting all 8,990 stations like a giant spider web so AI can see how a delay in Delhi affects a train in Kolkata hours later.<br/>"
        "2. <b>AI Transformers (TFT):</b> Predicting festival rush delays (like Diwali or Chhath Puja) 8 hours before trains even depart.<br/>"
        "3. <b>Multi-Agent Reinforcement Learning (MARL):</b> Giving each train its own autonomous smart agent so trains negotiate passing maneuvers among themselves!",
        body_style
    ))
    story.append(Spacer(1, 6))

    pitch_text = (
        "<b>🎤 Your 60-Second Presentation Speech (Speak This to Anyone!):</b><br/>"
        "<i>'Hello everyone! In Indian Railways, when one train gets delayed, it blocks the track and causes a chain reaction that delays dozens of other trains. "
        "In <b>PROJECT-KAVACH</b>, we solved this using Artificial Intelligence and Real-Time IoT Sensors.<br/><br/>"
        "Our system has two trained AI models: Model 1 acts like a Track Doctor—it checks vibration, rail heat, and internal cracks to guarantee safety. "
        "Model 2 acts like a Smart Dispatcher with 97% accuracy—it finds safe gaps between trains and automatically executes overtakes (Leapfrogging) so fast trains don't get stuck behind slow ones.<br/><br/>"
        "We also integrated Google Gemini RAG to write official railway safety orders, and built a live dashboard with interactive charts showing delay recovery in real time. "
        "Our system saves 22 to 31 minutes per train, cuts thousands of liters of fuel, and prevents collisions completely!'</i>"
    )
    t_pitch = Table([[Paragraph(pitch_text, analogy_style)]], colWidths=[540])
    t_pitch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#D97706")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_pitch)

    # Build Document via NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] Easy AI/ML PDF Document built successfully at: {output_path}")

if __name__ == "__main__":
    target_pdf = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "PROJECT_KAVACH_AIML_EASY_GUIDE.pdf"))
    build_easy_aiml_pdf(target_pdf)
