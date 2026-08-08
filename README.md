# Fraud-Detection System (Transaction + Graph Anomaly)

Overview
--------

This repository contains a lightweight demo and documentation for a fraud-detection system that combines a per-transaction risk classifier with graph-based anomaly detection to catch collusion and network-level fraud patterns. The approach is informed by methods proven on the Elliptic transaction graph dataset and is designed to reduce fraud loss while keeping false positives low and enabling fast appeal for honest partners.

Problem Statement
-----------------

E-commerce fraud can originate from multiple parties (sellers, delivery partners, and customers) and from collusion between them. Single-transaction rules miss network-level signals (e.g., coordinated self-orders, routing/proxy patterns). The system here scores transactions for risk and augments those scores using graph-based anomaly detection to reveal suspicious subgraphs and actors.

Key Goals
---------

- Detect fraud that single-transaction classifiers miss, including collusion.
- Reduce measured fraud loss on held-out labeled data.
- Shorten investigator time-to-resolution via clear, human-readable evidence.
- Minimize false positives and provide a fast, human-reviewable appeal path.

Design Overview
---------------

1. Transaction Classifier
	- Supervised model trained on labeled transaction features (amount, timestamps, account/party metadata, device/IP signals, return history).
	- Produces a per-transaction probability score and a short explanation (top contributing features).

2. Graph Construction
	- Build a heterogeneous graph connecting transactions, accounts (customers, sellers), delivery partners, payment instruments, and shipping addresses.
	- Edges encode relationships (placed_by, fulfilled_by, ship_to, shares_payment_method).

3. Graph-Based Anomaly Detection
	- Node embeddings (node2vec / GraphSAGE) + community / egonet analysis to surface unusual connectivity.
	- Anomaly scoring via isolation-forest over egonet features, or diffusion-likelihood deviation vs. history.
	- Proven techniques: Elliptic-style label propagation + local subgraph anomaly scores to catch collusion rings.

4. Evidence & Explainability
	- Produce an evidence package per alert: per-transaction classifier explanation, anomalous subgraph (nodes + highlighted edges), and path-based indicators (e.g., frequent self-orders, many refunds to same destination).
	- Visualize the local subgraph for human investigators (UI demo available in the repo).

5. Remediation Workflow
	- Graduated actions: step-up verification → temporary payout hold → investigator review → suspension. At each soft step, provide an immediate appeal path and minimal disruption for low-risk false positives.

Evaluation & Metrics
--------------------

- Primary: Reduction in fraud loss on held-out labeled data (use economic weighting of label types).
- Secondary: Precision@k, recall, AUC for per-transaction vs. combined system.
- Operational: investigator mean time-to-resolution, false-positive action rate, successful appeals rate.

Files in This Repository
------------------------

- Demo app (web UI) is located under the `Project/` folder:
	- [Project/index.html](Project/index.html) — full demo UI and investigator dashboard.
	- [Project/css/styles.css](Project/css/styles.css) — demo styles and layout.
	- [Project/js/app.js](Project/js/app.js) — demo interactivity, simulated biometric flows, and risk widgets.
- Top-level: [README.md](README.md) — this file.

Key Demo Features (extracted from the files)
-------------------------------------------

- Landing card and role-based flows for `Customer` and `Seller`.
- Biometric registration simulation: face capture, fingerprint upload/touch, verification UI.
- Seller dashboard: orders table with risk score, fraud analytics (EDA charts), payouts, returns and review guard rails.
- Customer dashboard: order tracking, wallet and analytics placeholders.
- Transaction Risk Score Engine UI: interactive evaluator, risk matrix, and suggested graduated actions (OTP, step-up biometrics, manual review).
- Exploratory Data Analysis charts (Chart.js) for fraud by region, card type, amount, hour, and fraud types.
- Mock IP detection, registration/login flows, form validation, and simulated security tokens.

Project Structure
-----------------

- `Project/` — demo web app (open `Project/index.html` in a browser or serve the folder).
- `README.md` — this file describing the system and how to run the demo.


Running the Demo Locally
------------------------

1. Open the demo quickly by running a static server in the project root. Example using Python:

```powershell
python -m http.server 8000

# Then open http://localhost:8000
```

2. The demo loads a placeholder graph / evidence JSON (replace with real outputs from the pipeline when available).

How to Reproduce the Pipeline (high level)
-----------------------------------------

1. Feature engineering: aggregate per-transaction features and build the entity graph for the target window.
2. Train a supervised classifier (XGBoost / LightGBM / logistic regression) on labeled transactions.
3. Compute node embeddings for the transaction graph (node2vec, GraphSAGE) and derive egonet features (degree, clustering, reciprocity, shared payment-method counts).
4. Fit an unsupervised anomaly detector (Isolation Forest / Local Outlier Factor) on egonet features and combine its score with the classifier score.
5. Rank alerts, generate evidence packages, and route to human review and the graduated remediation engine.

Deployment & Integration
------------------------

- Batch or streaming ingestion pipelines (Kafka, Kinesis) feed transactions and entity updates.
- Graph store options: Neo4j for interactive investigation or a custom graph built in Spark/NetworkX for batch scoring.
- Model serving: REST endpoint for classifier + graph scoring pipeline for near-real-time alerts.

Human Review & Appeals
----------------------

- Each alert includes: combined risk score, classifier explanation (feature contributions), anomalous subgraph visual, and suggested next action.
- Soft interventions first: challenge-response verification, extra KYC step, temporary payout hold with notification.
- Appeal process: expedited review channel with audit log, ability to provide corrective evidence, and fast reinstatement for false positives.

Next Steps / TODO
-----------------

- Replace demo placeholders with real labeled dataset and evaluation scripts.
- Add end-to-end notebooks: data ingestion → model training → graph scoring → evaluation.

Contributing
------------

Contributions welcome. Open issues or PRs for improvements, add evaluation notebooks, or contribute explainability components for investigators.

License
-------

No license specified. Add a license (for example, MIT) if you intend to publish or share this work.

