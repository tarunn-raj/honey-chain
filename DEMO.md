# Honey Chain: five-minute demo script

This path assumes the predictable dataset from `npm run seed:demo` is loaded
and the Next.js app is running at `http://localhost:3000`. Use the seeded
application even if the optional AI service or Polygon Amoy wallet is absent.

## 0:00–0:30 — Problem and product story

**CLICK:**

`/`

**SHOW:**

The Honey Chain landing page, hero counter, honeycomb visual language, problem
stats, and the “From hive to home” workflow. Scroll briefly to the three value
propositions and the live QR card.

**SAY:**

“Honey Chain gives KVIC clusters one traceable story for every harvest. It
connects the beekeeper, the hive, the lab, the supply chain, and the consumer
without asking a customer to trust an opaque label.”

## 0:30–1:20 — Hive and IoT monitoring

**CLICK:**

`/hives` → select `HIVE-08` → open its detail view.

**SHOW:**

The telemetry chart, current readings, status, and active alerts. Point out the
seeded Varroa signature and the recent readings. If needed, use the page’s
diagnosis action to open `/hives/[id]/diagnose`.

**SAY:**

“The same API accepts readings from a real ESP32 or our Node simulator. Honey
Chain turns temperature, humidity, weight, acoustic data, CO2, and battery
signals into a live hive view and actionable alerts.”

## 1:20–2:00 — AI insight and fallback

**CLICK:**

From the hive detail view, open the AI insight or diagnosis control. If using
the dashboard view, open `/dashboard` and show the AI yield outlook and
at-risk-hive cards.

**SHOW:**

The disease, anomaly, colony-health, or yield response. The UI labels fallback
results when the FastAPI service is unavailable.

**SAY:**

“AI is deliberately a separate FastAPI service. The product remains demoable
when that service is offline because the Next.js proxy returns a deterministic
fallback instead of breaking the field workflow.”

## 2:00–2:45 — Supply-chain traceability

**CLICK:**

`/batches` → open `HC-2026-001`.

**SHOW:**

The batch’s floral source, harvest information, lab result, processing stages,
QR assignment, and supply-chain timeline.

**SAY:**

“Every important hand-off becomes an application ledger event: harvest,
collection, laboratory certification, processing, bottling, and QR assignment.
This is the operational traceability record stored in PostgreSQL.”

## 2:45–3:20 — Consumer QR verification

**CLICK:**

Return to `/`, scroll to “Try the live demo,” and scan the displayed QR with a
phone. If scanning is not practical, click **Open verification page** below the
QR.

**SHOW:**

The public `/verify/[batchId]` page: genuine verdict, beekeeper and apiary,
lab assurance, journey, hive conditions, Merkle root, and any available
PolygonScan proof.

**SAY:**

“The consumer does not need an account. One signed QR opens the public story
behind this bottle and makes the authenticity and supply-chain evidence
inspectable.”

## 3:20–4:00 — Application blockchain ledger

**CLICK:**

`/ledger`

**SHOW:**

The SHA-256 chain timeline and green integrity state. Click **Simulate
Tampering** on a batch, show the red broken-chain state, then click **Restore**.

**SAY:**

“Our primary blockchain is the application-layer ledger: each block contains
the previous hash, and each batch has a deterministic Merkle root. The red
state proves that changing stored data is detected immediately.”

If Polygon Amoy is configured, click **Anchor to blockchain** on a valid,
restored batch and show the PolygonScan link. If it is not configured, the
button is intentionally hidden and this step remains entirely local.

## 4:00–4:35 — KVIC cluster operations and map

**CLICK:**

`/admin/clusters` → `/admin/map`

**SHOW:**

Cluster counts, hive totals, alerts, YTD yield, lab pass rate, then the India
map with marker sizes and health colours. Click a cluster marker to zoom to its
apiaries.

**SAY:**

“KVIC officers see the same system at cluster scale: operational aggregates,
geography, alerts, yield, lab performance, and apiary distribution. This is
the deployment story, not just a consumer-facing QR page.”

## 4:35–5:00 — Offline and integration close

**CLICK:**

`/admin/clusters` → **Onboard new cluster** → paste the documented CSV shape,
or open `/admin/integrations` if the offline flow is not needed for the
audience.

**SHOW:**

The validation feedback and the global offline indicator when the browser is
offline. Then show the six clearly labelled integration stubs and the mock SMS
log on `/admin/integrations`.

**SAY:**

“The field workflow is designed for imperfect connectivity: mutations can wait
in the browser outbox and replay after reconnect. External KVIC, FSSAI, ONDC,
e-NAM, DigiLocker, and SMS connections are clearly marked as demo stubs until
their production adapters are configured.”

## Backup paths

### If the AI service is unavailable

Continue with `/dashboard` or the hive detail page. Show the “fallback/demo”
label and say that the typed fallback keeps the product operational while the
separate FastAPI service is unavailable.

### If Polygon Amoy is not configured

Do not pretend an external transaction exists. The anchor button is hidden when
`POLYGON_PRIVATE_KEY` is unset. Show the valid local ledger and Merkle proof on
`/ledger` and the public verification page instead.

### If the browser or network fails

Use the existing local dev server and the preloaded seeded pages. For a
temporary offline demonstration, use `/admin/clusters` to show the offline
indicator and pending outbox behavior, then reconnect and show replay. The
database-backed pages remain the source of truth when connectivity returns.
