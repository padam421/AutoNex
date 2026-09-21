"""
===============================================================================
PROJECT-KAVACH: PURE AI/ML & PREDICTIVE MODELS TECHNICAL GUIDE
Author: Padam Kishore & Team
Description: Generates a focused, dense, paragraph-format 4-5 page PDF
             explaining Random Forest, XGBoost, RAG/Gemini, Classifiers,
             and Advanced ML/DL Models in deep technical detail.
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
    Two-pass canvas to dynamically compute and stamp total page count (Page X of Y)
    along with clean technical headers and footers.
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
        self.saveState()
        
        # Running Top Header
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0F172A"))
        self.drawString(36, letter[1] - 28, "PROJECT-KAVACH")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#475569"))
        self.drawString(125, letter[1] - 28, "|   AI/ML Models, Classifiers, XGBoost, Random Forest & RAG Technical Guide")
        
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#2563EB"))
        self.drawRightString(letter[0] - 36, letter[1] - 28, "AI/ML ARCHITECTURE & SPECIFICATION")
        
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(36, letter[1] - 32, letter[0] - 36, letter[1] - 32)
        
        # Running Bottom Footer
        self.line(36, 36, letter[0] - 36, 36)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 24, "PROJECT-KAVACH | MACHINE LEARNING & PREDICTIVE DISPATCH SYSTEMS")
        
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#0F172A"))
        self.drawRightString(letter[0] - 36, 24, page_str)
        
        self.restoreState()


def build_aiml_models_pdf(output_path):
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

    # Color Palette
    c_primary = colors.HexColor("#0F172A")    # Slate 900
    c_blue = colors.HexColor("#1E40AF")       # Blue 800
    c_blue_light = colors.HexColor("#2563EB") # Blue 600
    c_teal = colors.HexColor("#0D9488")       # Teal 600
    c_dark = colors.HexColor("#1E293B")       # Slate 800
    c_slate = colors.HexColor("#334155")      # Slate 700
    c_light_bg = colors.HexColor("#F8FAFC")
    c_border = colors.HexColor("#E2E8F0")

    # Typography
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=c_primary,
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=c_blue_light,
        spaceAfter=6
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        textColor=c_blue,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=c_teal,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.3,
        leading=11.8,
        textColor=c_dark,
        spaceAfter=5
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11.2,
        textColor=colors.HexColor("#0F172A")
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.8,
        leading=9.5,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.8,
        textColor=c_dark
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold',
        textColor=c_primary
    )

    story = []

    # Title Block
    story.append(Paragraph("PROJECT-KAVACH: Comprehensive AI & Machine Learning Technical Guide", title_style))
    story.append(Paragraph("Detailed Engineering Analysis of Machine Learning Classifiers, XGBoost, Random Forest, RAG Architecture & Deep Learning Models", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_blue, spaceBefore=2, spaceAfter=8))

    # Meta Ribbon
    meta_data = [
        [Paragraph("<b>Authors:</b> Padam Kishore & Team", table_cell_style),
         Paragraph("<b>Core Models:</b> Random Forest, XGBoost, Gemini 1.5 RAG", table_cell_style),
         Paragraph("<b>Task:</b> Track Safety & Dynamic Precedence", table_cell_style),
         Paragraph("<b>Accuracy:</b> 88.38% (Defect) / 97.09% (Dispatch)", table_cell_style)]
    ]
    t_meta = Table(meta_data, colWidths=[120, 150, 150, 120])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 6))

    # -------------------------------------------------------------------------
    # PART 1: AI & ML ARCHITECTURE OVERVIEW IN PROJECT KAVACH
    # -------------------------------------------------------------------------
    story.append(Paragraph("1. Fundamental Role of AI & Machine Learning in Project Kavach", h1_style))
    story.append(Paragraph(
        "Project Kavach deploys Artificial Intelligence and Machine Learning as the core decision-making brain of an autonomous railway cyber-physical system. "
        "Traditional railway traffic dispatching relies heavily on fixed, conservative human heuristics where section controllers halt trailing trains "
        "whenever an unexpected delay or track degradation occurs. In contrast, our AI/ML architecture shifts railway management from reactive manual intervention "
        "to proactive, data-driven optimization. The system bifurcates machine learning tasks into two distinct computational domains: "
        "<b>Multi-Class Safety Classification</b> (evaluating whether tracks are safe or structurally compromised) and "
        "<b>Dynamic Dispatch & Delay Optimization</b> (predicting optimal train speeds, safe headway windows, and overtake maneuvers). "
        "By continuously analyzing 16 distinct domain features ingested from trackside IoT sensors, locomotive telemetry, and satellite weather services, "
        "our machine learning models evaluate risk and calculate optimal dispatch policies within 3 to 5 milliseconds per telemetry packet.",
        body_style
    ))
    story.append(Paragraph(
        "To guarantee safety-critical reliability, the architecture decouples safety classification from throughput optimization. "
        "A dispatch optimization model is never allowed to elevate speed or command an overtake unless the track safety classifier has explicitly verified "
        "that the underlying permanent way is defect-free. Furthermore, numerical probability scores generated by classical machine learning algorithms "
        "are paired with a Retrieval-Augmented Generation (RAG) legal arbiter, ensuring that every AI-directed throttle change or pneumatic brake application "
        "is legally grounded in official statutory safety manuals, including RDSO, IRPWTM, LWR, and G&SR standards.",
        body_style
    ))

    # -------------------------------------------------------------------------
    # PART 2: RANDOM FOREST CLASSIFICATION MODELS
    # -------------------------------------------------------------------------
    story.append(Paragraph("2. Random Forest Classification Models (Architecture, Implementation & Mechanics)", h1_style))
    story.append(Paragraph(
        "In our production implementation (trained via <code>colab_step4_model_training.py</code> and serialized in the <code>models/</code> directory), "
        "<b>Random Forest</b> serves as the foundational supervised learning algorithm for both track defect classification and dispatch optimization. "
        "Random Forest is an ensemble learning method based on bootstrap aggregating (bagging) of unpruned decision trees. "
        "Instead of relying on a single decision tree—which is notoriously prone to overfitting high-variance sensor noise—Random Forest constructs an ensemble "
        "of <code>n_estimators=100</code> randomized decision trees during training. Each tree is trained on a distinct bootstrap sample drawn with replacement "
        "from the 50,000-sample training dataset. Furthermore, at each node split, the algorithm evaluates only a random subset of input features "
        "<code>max_features = sqrt(n_features)</code>, effectively de-correlating the individual trees and minimizing generalization error.",
        body_style
    ))

    story.append(Paragraph("<b>A. Model 1: Track Structural Defect Classifier (<code>model_defect.joblib</code>)</b>", h2_style))
    story.append(Paragraph(
        "Model 1 is trained to evaluate track structural integrity by processing 16 normalized input features, with particular emphasis on high-frequency "
        "accelerometer vibration RMS, vibration kurtosis, ultrasonic flaw detection (USFD) crack depth, wayside rail temperature, dynamic axle load, "
        "and laser profiler gauge alignment. The model maps these multi-sensor telemetry packets into four mutually exclusive risk tiers: "
        "<b>Class 0 (Safe)</b>, corresponding to nominal track conditions where full operational speeds (130-160 km/h) are certified; "
        "<b>Class 1 (Monitor)</b>, indicating minor ballast consolidation loss or elevated sleeper vibrations requiring maintenance logging; "
        "<b>Class 2 (Warning)</b>, triggered when rail steel temperatures reach 55°C-60°C (thermal buckling risk) or dynamic axle weights exceed 25.0 tonnes; "
        "and <b>Class 3 (Critical Track Defect)</b>, representing acute transverse fatigue cracks (>5mm flaw depth) or gauge widening beyond 1679.5 mm, "
        "mandating immediate automatic emergency braking (EBD enforcement) to prevent catastrophic derailment. "
        "Model 1 achieves an overall test classification accuracy of <b>88.38%</b>, with a critical safety constraint: <b>0% false negatives on Class 3 defects</b>, "
        "ensuring that dangerous track anomalies are never erroneously classified as safe.",
        body_style
    ))

    story.append(Paragraph("<b>B. Model 2: Scenario Dispatch Optimizer (<code>model_dispatch.joblib</code>)</b>", h2_style))
    story.append(Paragraph(
        "Model 2 functions as the tactical dispatching controller. It ingests the spatial relationship between leading and trailing trains along with "
        "track limits and braking distance calculations. The model evaluates whether an overtake or speed elevation is mathematically viable without violating "
        "headway safety margins. It outputs one of three operational dispatch commands: "
        "<b>Class 0 (Safety Hold)</b>, enforced whenever track health is compromised or inter-train headway falls below the calculated emergency stopping distance; "
        "<b>Class 1 (Scenario 1: Superfast Speed Elevation)</b>, authorized when the forward block section is entirely clear, elevating trailing train speed "
        "to the maximum permissible limit (+20 to +45 km/h) to recover accumulated timetable delays; and "
        "<b>Class 2 (Scenario 2: Multi-Station Leapfrogging)</b>, which commands the station interlocking to divert a slower preceding local train into an upcoming "
        "loop line, clearing the high-speed mainline for the trailing express rake. Model 2 achieves an extraordinary classification accuracy of <b>97.09%</b> "
        "(Precision: 0.97, Recall: 0.97, F1-Score: 0.97 across all classes), providing dependable, sub-second dispatch recommendations.",
        body_style
    ))

    # Table comparing the two models
    models_table_data = [
        [Paragraph("<b>Model Name</b>", table_header_style), Paragraph("<b>Artifact File</b>", table_header_style), Paragraph("<b>Input Features</b>", table_header_style), Paragraph("<b>Target Classes</b>", table_header_style), Paragraph("<b>Test Accuracy</b>", table_header_style), Paragraph("<b>Latency</b>", table_header_style)],
        [
            Paragraph("<b>Track Defect Classifier</b>", table_cell_bold),
            Paragraph("<code>model_defect.joblib</code><br/>(7.58 MB)", table_cell_style),
            Paragraph("16 Features (Sensors, Vibration, USFD, Rail Temp, Axle Load, Gauge)", table_cell_style),
            Paragraph("4 Classes:<br/>Safe, Monitor, Warning, Critical Defect", table_cell_style),
            Paragraph("<b>88.38%</b><br/>(0% FN on Critical)", table_cell_style),
            Paragraph("< 3.5 ms", table_cell_style)
        ],
        [
            Paragraph("<b>Dispatch Optimizer</b>", table_cell_bold),
            Paragraph("<code>model_dispatch.joblib</code><br/>(3.75 MB)", table_cell_style),
            Paragraph("16 Features (Speeds, Distances, EBD, Safe Headway, TSHI, Margins)", table_cell_style),
            Paragraph("3 Classes:<br/>Safety Hold, Speed Up, Leapfrog", table_cell_style),
            Paragraph("<b>97.09%</b><br/>(Precision: 0.97)", table_cell_style),
            Paragraph("< 2.8 ms", table_cell_style)
        ]
    ]
    t_models = Table(models_table_data, colWidths=[90, 80, 150, 110, 65, 45])
    t_models.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_blue),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light_bg]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_models)

    # -------------------------------------------------------------------------
    # PART 3: XGBOOST & GRADIENT BOOSTING FRAMEWORKS
    # -------------------------------------------------------------------------
    story.append(Paragraph("3. XGBoost & Gradient Boosting Frameworks: Mechanics, Sub-Types & Implementation", h1_style))
    story.append(Paragraph(
        "While Random Forest relies on parallel bagging, <b>XGBoost (Extreme Gradient Boosting)</b> represents an advanced boosting paradigm "
        "that constructs decision trees sequentially. In gradient boosting, each new tree is fit to the negative gradient (residuals) of the loss function "
        "evaluated on the preceding ensemble's predictions. Rather than voting independently, trees in XGBoost work collectively to iteratively minimize loss: "
        "<code>y_pred^(t) = y_pred^(t-1) + eta * f_t(x)</code>, where <code>eta</code> is the shrinkage learning rate (typically set between 0.01 and 0.1) "
        "and <code>f_t(x)</code> is the newly fitted regression tree. "
        "XGBoost improves upon conventional gradient boosting by implementing a second-order Taylor series expansion of the loss function, optimizing both the "
        "first-order gradient (<code>g_i</code>) and the second-order Hessian (<code>h_i</code>). This enables exact mathematical derivation of optimal split points "
        "and tree leaf weights: <code>w_j* = - sum(g_i) / (sum(h_i) + lambda)</code>, where <code>lambda</code> is the L2 ridge regularization penalty. "
        "Furthermore, XGBoost incorporates L1 lasso regularization (<code>alpha</code>) directly into its objective function, pruning uninformative tree branches "
        "and establishing robust sparsity in railway feature spaces.",
        body_style
    ))

    story.append(Paragraph("<b>A. Variations and Sub-Types of XGBoost in Railway Dispatch Systems:</b>", h2_style))
    story.append(Paragraph(
        "In our project's extended predictive architecture, XGBoost is categorized and deployed across multiple specialized variations: "
        "<br/>"
        "<b>1. XGBoost Classifier (<code>XGBClassifier</code>):</b> Applied to multi-class precedence selection. By employing multi-class cross-entropy loss "
        "(<code>multi:softprob</code>), <code>XGBClassifier</code> outputs a well-calibrated probability distribution across dispatch maneuvers. "
        "Because it minimizes residuals sequentially, it captures subtle, hard-to-classify edge cases—such as borderline leapfrog margins where a superfast "
        "train trails by exactly 5.2 minutes—with sharper decision boundaries than standard bagging ensembles. "
        "<br/>"
        "<b>2. XGBoost Regressor (<code>XGBRegressor</code>):</b> While classifiers select discrete actions, continuous delay forecasting requires numerical estimation. "
        "Using mean squared error (<code>reg:squarederror</code>) or Huber robust loss (which resists extreme delay outliers), <code>XGBRegressor</code> predicts "
        "the exact continuous delay duration (in minutes) that a train will experience at downstream stations based on distance, section gradient, and weather. "
        "<br/>"
        "<b>3. DART (Dropout Additive Regression Trees):</b> A booster variation within XGBoost that introduces dropout into the boosting process. "
        "In standard boosting, early trees often dominate the predictions, causing subsequent trees to overfit to a small fraction of samples. DART randomly "
        "drops a fraction of trees during each boosting round, preventing over-reliance on primary features (such as current speed) and forcing the model to "
        "learn secondary interactions (such as OHE catenary voltage stability and rail temperature fluctuations). "
        "<br/>"
        "<b>4. LightGBM & CatBoost Integration:</b> In production railway systems with millions of historical timetable logs, two closely related gradient boosting "
        "libraries complement XGBoost. <b>LightGBM</b> utilizes histogram-based feature binning and leaf-wise (best-first) tree growth, reducing memory consumption "
        "and training up to 15 times faster than traditional algorithms on massive datasets. <b>CatBoost (Categorical Boosting)</b> implements ordered target encoding "
        "to natively process categorical features (such as 8,990 unique station codes, train types, and zone IDs) without requiring high-cardinality one-hot encoding, "
        "completely eliminating the curse of dimensionality during timetable training.",
        body_style
    ))

    story.append(Paragraph("<b>B. Practical Implementation & Hyperparameter Tuning Strategy for XGBoost:</b>", h2_style))
    story.append(Paragraph(
        "To implement XGBoost effectively within Project Kavach, the 16 scaled domain features extracted in <code>colab_step2_data_cleaning.py</code> "
        "are formatted into an optimized <code>xgb.DMatrix</code>. Hyperparameter optimization is conducted using stratified 5-fold cross-validation: "
        "the learning rate is set to <code>eta = 0.05</code> to ensure smooth convergence; tree depth is constrained to <code>max_depth = 6</code> to prevent deep tree overfitting; "
        "subsample ratio is set to <code>subsample = 0.85</code> and column subsampling to <code>colsample_bytree = 0.8</code> to induce stochastic bagging diversity; "
        "and early stopping is configured with <code>early_stopping_rounds = 15</code> on a validation set. "
        "Once trained, the XGBoost booster can be serialized to a compact JSON or binary format, or converted to an ONNX (Open Neural Network Exchange) runtime graph, "
        "enabling high-throughput inference with sub-2-millisecond execution times suitable for microservice integration.",
        body_style
    ))

    # -------------------------------------------------------------------------
    # PART 4: RAG & LARGE LANGUAGE MODELS (GEMINI 1.5)
    # -------------------------------------------------------------------------
    story.append(Paragraph("4. Retrieval-Augmented Generation (RAG) & Large Language Models (Gemini 1.5)", h1_style))
    story.append(Paragraph(
        "A critical technical limitation of pure numerical machine learning classifiers (such as Random Forest and XGBoost) is their inability to explain "
        "their decisions in legal and statutory terminology. In mission-critical railway operations certified under <b>SIL-4 (Safety Integrity Level 4)</b> standards, "
        "a section controller or locomotive driver cannot act solely on an opaque probability score. Operating staff require explicit, legally enforceable "
        "justifications citing official Indian Railways rulebooks. To bridge this divide, Project Kavach implements a <b>24/7 Autonomous Closed-Loop RAG Engine</b> "
        "in <code>rag_engine/app.py</code>, integrating <b>Google Gemini 1.5 Flash</b> with a statutory knowledge retrieval store.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Architectural Workflow of the RAG Pipeline:</b> "
        "<br/>"
        "<b>1. Knowledge Base Embeddings & Vector Store:</b> Official Indian Railways statutory safety manuals are digitized, chunked, and indexed into a searchable vector database. "
        "These include: <i>RDSO/SPN/196/2020 & IRPWTM Para 268</i> (fatigue crack limits and mandatory ultrasonic testing protocols); "
        "<i>IRPWTM Track Standards</i> (Broad Gauge nominal 1676.0 mm width and +3.5 mm dynamic expansion thresholds); "
        "<i>Manual of Long Welded Rails (LWR) Para 6.2</i> (thermal buckling patrolling at rail temp >= 55°C and mandatory 30 km/h speed capping at >= 60°C); "
        "<i>General & Subsidiary Rules (G&SR) Rule 3.78</i> (fog signaling restrictions and cab-signaled speed elevation limits); and "
        "<i>Operating Manual Para 5.12</i> (overtake precedence rules for premium vs freight rakes). "
        "<br/>"
        "<b>2. Dynamic Contextual Retrieval:</b> When an anomaly or dispatch opportunity is detected, the engine extracts the active risk level and fault signatures "
        "(e.g., <code>CRITICAL_FATIGUE_CRACK USFD_CRACK_12.5MM GAUGE_1680MM</code>) and executes a semantic similarity search across the vector store, retrieving the exact statutory clauses governing the incident. "
        "<br/>"
        "<b>3. Grounded Gemini Arbitration:</b> The retrieved statutory clauses, live locomotive telemetry (speed, mass, calculated EBD), and track sensor audit metrics are injected into a structured SIL-4 system prompt. "
        "Google Gemini 1.5 Flash processes this composite context and synthesizes an authoritative, 3-point actionable directive: "
        "(1) <i>Cab Signaling Directive</i> (commanding automatic pneumatic service brake application or authorizing target speed elevation); "
        "(2) <i>Interlocking Enforcement</i> (locking junction signals to RED or switching trailing trains to bypass loop lines); and "
        "(3) <i>Geotagged P-Way Dispatch Order</i> (transmitting immediate emergency repair work orders with exact kilometer chainage coordinates to the nearest sectional engineer). "
        "If external cloud connectivity experiences latency or failure, the service automatically falls back to a high-fidelity deterministic SIL-4 rule compiler, guaranteeing uninterrupted fail-safe execution.",
        body_style
    ))

    # -------------------------------------------------------------------------
    # PART 5: COMPARATIVE ANALYSIS OF CLASSIFICATION MODELS
    # -------------------------------------------------------------------------
    story.append(Paragraph("5. Comparative Evaluation of Classification Models in Railway Safety Systems", h1_style))
    story.append(Paragraph(
        "Selecting the appropriate machine learning classification paradigm requires balancing predictive accuracy, training speed, inference latency, "
        "and explainability. Below is a rigorous comparative analysis of the primary classification models evaluated for Project Kavach:",
        body_style
    ))

    classifiers_table_data = [
        [Paragraph("<b>Model Family</b>", table_header_style), Paragraph("<b>Mathematical Mechanism</b>", table_header_style), Paragraph("<b>Key Advantages</b>", table_header_style), Paragraph("<b>Limitations in Rail Systems</b>", table_header_style), Paragraph("<b>Verdict / Project Role</b>", table_header_style)],
        [
            Paragraph("<b>Random Forest<br/>(Selected)</b>", table_cell_bold),
            Paragraph("Bootstrap aggregating of 100 decorrelated decision trees with randomized feature splits.", table_cell_style),
            Paragraph("Zero overfitting on sensor noise; handles non-linear interactions; sub-4ms inference latency; feature importance metrics.", table_cell_style),
            Paragraph("Larger serialized file footprint (.joblib ~7.5MB) compared to linear models.", table_cell_style),
            Paragraph("<b>Primary Classifier:</b> Deployed in production for defect classification and dispatch optimization.", table_cell_style)
        ],
        [
            Paragraph("<b>XGBoost /<br/>Gradient Boosting</b>", table_cell_bold),
            Paragraph("Sequential gradient descent in function space using second-order Taylor loss expansion.", table_cell_style),
            Paragraph("Exceptional accuracy; sharper decision boundaries on edge cases; native L1/L2 regularization; compact tree representation.", table_cell_style),
            Paragraph("Requires sensitive hyperparameter tuning (learning rate, tree depth, gamma) to avoid overfitting small datasets.", table_cell_style),
            Paragraph("<b>High-Precision Booster:</b> Optimal for regression delay forecasting and complex precedence modeling.", table_cell_style)
        ],
        [
            Paragraph("<b>Single Decision Tree<br/>(CART / C4.5)</b>", table_cell_bold),
            Paragraph("Recursive binary partitioning using Gini impurity or Shannon entropy minimization.", table_cell_style),
            Paragraph("Completely transparent; simple if-else logic; sub-millisecond execution; easily audited by rail safety inspectors.", table_cell_style),
            Paragraph("Extreme variance; small perturbations in sensor readings cause drastic tree restructuring; poor generalization.", table_cell_style),
            Paragraph("<b>Baseline Only:</b> Insufficiently robust for noisy IoT sensor telemetry in real railway corridors.", table_cell_style)
        ],
        [
            Paragraph("<b>Support Vector<br/>Machines (SVM)</b>", table_cell_bold),
            Paragraph("Hyperplane margin maximization in kernelized feature space: min 1/2 ||w||^2 s.t. constraints.", table_cell_style),
            Paragraph("Highly effective in high-dimensional feature spaces; guaranteed global optimum with convex quadratic programming.", table_cell_style),
            Paragraph("O(N^3) training complexity; poor scaling on 50,000+ streaming rows; opaque decision boundaries; slow RBF inference.", table_cell_style),
            Paragraph("<b>Not Recommended:</b> Computational overhead violates sub-second real-time streaming constraints.", table_cell_style)
        ],
        [
            Paragraph("<b>Multi-Layer Perceptron<br/>(Deep Neural Net)</b>", table_cell_bold),
            Paragraph("Feed-forward artificial neural network with non-linear activation functions (ReLU, GELU).", table_cell_style),
            Paragraph("Universal function approximator; capable of modeling arbitrary non-linear multi-sensor stress dynamics.", table_cell_style),
            Paragraph("Black-box nature; complete lack of statutory explainability; requires extensive GPU acceleration; susceptible to vanishing gradients.", table_cell_style),
            Paragraph("<b>Secondary Research:</b> Reserved for complex vibration spectrogram feature extraction rather than tabular dispatching.", table_cell_style)
        ]
    ]
    t_class = Table(classifiers_table_data, colWidths=[80, 110, 130, 120, 100])
    t_class.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_blue),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_light_bg]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_class)

    # -------------------------------------------------------------------------
    # PART 6: ADVANCED NEXT-GEN & PRODUCTION MODELS FOR NATIONAL SCALE
    # -------------------------------------------------------------------------
    story.append(Paragraph("6. Advanced Deep Learning & Optimization Models for National Production Deployment", h1_style))
    story.append(Paragraph(
        "To scale Project Kavach across the entire Indian Railways network—encompassing over 13,500 passenger trains, 9,000 freight rakes, and 68,000 route kilometers—"
        "the architecture can be augmented with cutting-edge deep learning, graph modeling, and operations research solvers:",
        body_style
    ))

    story.append(Paragraph("<b>A. Temporal Fusion Transformers (TFT) & Recurrent Architectures (LSTM / GRU) for Delay Forecasting</b>", h2_style))
    story.append(Paragraph(
        "Train delay dynamics are non-stationary sequential time series characterized by multi-horizon dependencies, cyclical seasonality (e.g. morning and evening commuter peaks), "
        "and static entity attributes (locomotive power rating, rake length, train category). <b>Temporal Fusion Transformers (TFT)</b> represent the state-of-the-art in multi-horizon forecasting. "
        "TFT utilizes variable selection networks to dynamically weight informative inputs, gated residual networks (GRN) to filter out uninformative features, and self-attention mechanisms "
        "to capture long-range temporal correlations across preceding stations. Unlike standard regressors, TFT outputs prediction intervals (e.g. 10th, 50th, and 90th percentiles), "
        "enabling section controllers to understand the uncertainty bounds of a projected 25-minute delay 4 to 8 hours before a train reaches a junction. "
        "For lower-latency edge applications inside locomotive cabs, lightweight <b>Bidirectional Gated Recurrent Units (Bi-GRU)</b> process sequential accelerometer vibration windows "
        "to detect micro-derailment wheel vibrations in real time.",
        body_style
    ))

    story.append(Paragraph("<b>B. Spatio-Temporal Graph Neural Networks (ST-GNN) for Network Bottleneck Modeling</b>", h2_style))
    story.append(Paragraph(
        "A national railway network is naturally structured as a non-Euclidean graph <code>G = (V, E, W)</code>, where the vertices <code>V</code> represent 8,990 stations and junctions, "
        "the edges <code>E</code> represent physical track sections, and the edge weights <code>W</code> represent track distance and carrying capacity. "
        "Traditional tabular models treat trains as isolated entities, failing to account for the spatial ripple effects that propagate across intersecting rail corridors. "
        "<b>Spatio-Temporal Graph Neural Networks (ST-GNN)</b> combine Spatial Graph Convolutional Networks (GCN) with Temporal Convolutional Networks (TCN). "
        "The spatial GCN aggregates feature representations across neighboring topological junction nodes via the graph Laplacian: <code>H^(l+1) = sigma( D^(-1/2) A D^(-1/2) H^(l) W^(l) )</code>, "
        "while temporal convolutions capture the velocity of shockwave propagation. If a signal failure or track fracture occurs at Kanpur Central, an ST-GNN models how the resulting "
        "bottleneck will disperse across the Northern, North Central, and Eastern Railway divisions over the subsequent 6 hours, identifying optimal diversion routes before deadlocks materialize.",
        body_style
    ))

    story.append(Paragraph("<b>C. Mixed-Integer Linear Programming (MILP) for Provably Optimal Rescheduling</b>", h2_style))
    story.append(Paragraph(
        "Machine learning models excel at pattern recognition and probabilistic classification, but safety-critical timetable rescheduling requires mathematical adherence "
        "to non-negotiable physical constraints (e.g., exactly one train occupying a single-track block section at any timestamp, minimum platform occupancy intervals, and headway safety margins). "
        "To achieve provably optimal global schedules, machine learning classifiers are paired with <b>Mixed-Integer Linear Programming (MILP)</b> solvers (such as <b>Google OR-Tools</b>, <b>Gurobi</b>, or <b>IBM CPLEX</b>). "
        "In this hybrid architecture, the machine learning model acts as a heuristic warm-starter, rapidly pruning the combinatorial search space of feasible overtake locations. "
        "The MILP solver then optimizes an objective function minimizing total passenger-delay minutes and traction energy consumption subject to hard interlocking constraints: "
        "<code>min sum( c_i * delay_i + e_i * energy_i ) s.t. t_(i,s) - t_(j,s) >= headway_min</code>. This mathematical synergy delivers guaranteed conflict-free schedules in seconds.",
        body_style
    ))

    story.append(Paragraph("<b>D. Multi-Agent Reinforcement Learning (MARL - PPO / DQN) for Autonomous Dispatching</b>", h2_style))
    story.append(Paragraph(
        "In an enterprise autonomous dispatching system, the railway network is modeled as a decentralized multi-agent Markov Decision Process (MAMDP). "
        "Each train locomotive and each station interlocking controller is instantiated as an independent reinforcement learning agent operating under a shared policy framework (such as <b>Ray RLlib</b>). "
        "Using <b>Proximal Policy Optimization (PPO)</b> with centralized training and decentralized execution (CTDE), agents observe localized environment states (current velocity, distance to forward signal, track friction), "
        "communicate over a simulated vehicle-to-infrastructure (V2I) radio channel, and take actions (accelerate, coast, brake, request loop line clearance). "
        "The reward function penalizes schedule deviations, excessive pneumatic braking, and headway buffer violations. Over millions of simulated training epochs, "
        "the multi-agent policy discovers emergent, highly sophisticated cooperative maneuvers—such as dynamic coasting to catch green waves and synchronized staggered arrivals—that surpass human controller capabilities.",
        body_style
    ))

    story.append(Paragraph("<b>E. Explainable AI (XAI) with SHAP and LIME for Human-in-the-Loop Trust</b>", h2_style))
    story.append(Paragraph(
        "For AI dispatch systems to achieve regulatory certification by the Commissioner of Railway Safety (CRS) and adoption by locomotive pilots, model predictions must be fully explainable. "
        "Project Kavach incorporates <b>SHAP (SHapley Additive exPlanations)</b>, a cooperative game-theoretic framework that calculates the exact marginal contribution of each input feature to a model's prediction: "
        "<code>phi_i = sum ( [ |S|! ( |F| - |S| - 1 )! / |F|! ] * [ f(S union {i}) - f(S) ] )</code>. "
        "When Model 2 commands a leapfrog dispatch, SHAP generates an instant visual attribution waterfall plot explaining to the station master: "
        "<i>'Leapfrog authorized primarily due to: Safe Headway Margin (+4.2 mins contribution), Track Structural Health Index 98% (+3.1 mins contribution), and High Speed Differential (+2.8 mins contribution).'</i> "
        "By rendering complex ensemble mechanics completely transparent, XAI eliminates algorithmic opacity and guarantees accountability.",
        body_style
    ))

    # Concluding Technical Summary Box
    summary_box_text = (
        "<b>Technical Summary of AI/ML Integration:</b><br/>"
        "Project Kavach demonstrates a production-grade machine learning architecture for railway operations. "
        "By combining <b>Dual Random Forest Classifiers</b> (achieving 88.38% defect detection accuracy and 97.09% dispatch optimization accuracy), "
        "advanced <b>XGBoost Gradient Boosting</b> variations for multi-class ranking and continuous delay regression, "
        "and a <b>Gemini 1.5 Flash RAG Engine</b> grounded in official Indian Railways statutory rulebooks, the system delivers sub-5-millisecond "
        "autonomous safety enforcement and dynamic delay recovery. Future enterprise scaling incorporates Temporal Fusion Transformers, "
        "Spatio-Temporal Graph Neural Networks, and Mixed-Integer Linear Programming, establishing a foundation for a fully autonomous, "
        "SIL-4 certified national railway operating system."
    )
    t_sbox = Table([[Paragraph(summary_box_text, callout_style)]], colWidths=[540])
    t_sbox.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#2563EB")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 9),
        ('RIGHTPADDING', (0,0), (-1,-1), 9),
    ]))
    story.append(Spacer(1, 4))
    story.append(t_sbox)

    # Build Document via NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] Pure AI/ML Models PDF Document built successfully at: {output_path}")

if __name__ == "__main__":
    target_pdf = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "PROJECT_KAVACH_AIML_MODELS_GUIDE.pdf"))
    build_aiml_models_pdf(target_pdf)
    # Also overwrite the master guide to ensure it has the exact focused content
    master_pdf = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "PROJECT_KAVACH_AIML_MASTER_GUIDE.pdf"))
    build_aiml_models_pdf(master_pdf)
