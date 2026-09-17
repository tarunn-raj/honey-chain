# Honey Chain — Project Context

## 1. PROJECT OVERVIEW

Project name: Honey Chain

Honey Chain is a blockchain-based honey traceability and smart beekeeping
management platform being developed for the Smart India Hackathon 2026,
based on the KVIC Honey Mission problem statement.

The system should provide:
- Honey supply-chain traceability
- Beekeeping/hive monitoring
- IoT telemetry from real ESP32 hardware
- A Node.js IoT simulator
- Blockchain-style tamper-evident records
- QR-based consumer verification
- AI-powered features through a separate Python FastAPI service
- Role-based dashboards
- Admin monitoring

This is a 12-hour hackathon project.

Priority:
Working demonstrable features > perfect architecture > unnecessary complexity.

I am a beginner, so explain important technical decisions and manual steps
clearly before I perform them.


# 2. CURRENT TECHNOLOGY STACK

Frontend / Full-stack application:
- Next.js
- App Router
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend:
- Next.js API routes / Route Handlers
- Prisma ORM
- PostgreSQL

Database:
- Neon PostgreSQL

Deployment:
- Vercel for the Next.js application

AI service:
- Separate Python FastAPI service
- Initially runs locally on port 8000
- Eventually deployed separately on Render

Hardware:
- ESP32 DevKit V1
- DHT22 temperature/humidity sensor
- HX711 + load cell for hive weight
- Arduino IDE

Development:
- VS Code
- Git
- GitHub
- GitHub Copilot Agent

IMPORTANT:
I am using GitHub Copilot instead of Claude Code.

Do not instruct me to install or run Claude Code unless I specifically ask about it.


# 3. PROJECT ARCHITECTURE

The overall architecture should be approximately:

                    ┌──────────────────────┐
                    │      Consumer        │
                    │   QR Verification    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     Next.js App      │
                    │  UI + API + Backend  │
                    └──────┬─────────┬─────┘
                           │         │
                 ┌─────────┘         └──────────┐
                 ▼                              ▼
        ┌────────────────┐             ┌────────────────┐
        │ Neon Postgres  │             │ FastAPI AI     │
        │ + Prisma       │             │ Service        │
        └────────────────┘             └────────────────┘
                 ▲
                 │
          ┌──────┴───────┐
          │              │
          │              │
   ┌──────┴─────┐  ┌─────┴────────┐
   │ ESP32      │  │ Node.js      │
   │ Hive Node  │  │ Simulator    │
   └────────────┘  └──────────────┘


# 4. BLOCKCHAIN DESIGN

IMPORTANT:

Honey Chain does NOT use a traditional public blockchain as its primary
ledger.

Use an application-layer permissioned ledger implemented using PostgreSQL.

Core design:
- SHA-256 hash-chained blocks
- Blocks stored in PostgreSQL
- Each block references the hash of the previous block
- Each supply-chain event becomes part of the ledger
- Merkle root calculated per batch
- Optional Polygon Amoy anchoring can be added later if time permits

The blockchain component exists primarily to demonstrate:
- Tamper evidence
- Traceability
- Data integrity
- Immutable-looking audit history
- Verification

DO NOT suggest:
- Hyperledger
- Ethereum mainnet
- Running our own blockchain infrastructure
- Complex blockchain node infrastructure
- Any architecture requiring significant DevOps/infrastructure setup

The hackathon needs a reliable demonstration, not a production-scale
blockchain network.


# 5. SUPPLY CHAIN

The system should represent honey moving through stages approximately like:

HARVEST
   ↓
COLLECTION CENTER
   ↓
LAB TESTING
   ↓
PROCESSING
   ↓
BOTTLING
   ↓
CONSUMER

A batch should have traceable events associated with it.

The dashboard should eventually demonstrate a batch moving through the
supply chain.

Every important transition should be represented in the ledger.


# 6. USER ROLES

The application should support these roles:

- BEEKEEPER
- COLLECTION_CENTER
- LAB
- PROCESSOR
- KVIC_OFFICER
- ADMIN

There is also an anonymous:

- CONSUMER

Consumers should be able to verify honey through a QR code without requiring
a normal authenticated dashboard account.


# 7. AUTHENTICATION

IMPORTANT:

Do NOT use a large authentication library.

For this hackathon use a simple cookie-based role mechanism.

The goal is to demonstrate the different dashboards and workflows quickly.

Keep authentication simple and understandable.

Do not introduce unnecessary authentication infrastructure.


# 8. DATABASE

Use:

- PostgreSQL
- Neon
- Prisma ORM

Environment variable:

DATABASE_URL

The database should contain the data required for:
- Users
- Hives
- Honey batches
- Supply-chain events
- Blockchain blocks
- IoT telemetry
- Laboratory information/results
- QR/verification information
- Any other entities genuinely required by the application

Keep the schema practical for the hackathon.

Avoid unnecessary tables and over-engineering.


# 9. ENVIRONMENT VARIABLES

Local `.env` currently contains:

DATABASE_URL="..."
QR_SECRET="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
IOT_DEVICE_KEY="..."
AI_SERVICE_URL="http://localhost:8000"

IMPORTANT SECURITY RULES:

- Never expose DATABASE_URL in frontend code.
- Never expose QR_SECRET in frontend code.
- Never expose IOT_DEVICE_KEY in frontend code.
- Never put secrets in variables beginning with NEXT_PUBLIC_.
- Never commit `.env` to GitHub.
- Never print secret values in responses.
- If an environment variable needs to be changed, explain exactly where.


# 10. NEXT_PUBLIC_APP_URL

For local development:

NEXT_PUBLIC_APP_URL="http://localhost:3000"

Production Vercel URL:

https://honey-chain-steel.vercel.app

The local `.env` should continue using localhost.

The Vercel production environment should use:

NEXT_PUBLIC_APP_URL=https://honey-chain-steel.vercel.app

IMPORTANT:
The ESP32 cannot use localhost.

When firmware communicates with the deployed API, it must use the live
Vercel URL.


# 11. IOT ARCHITECTURE

There are two IoT sources:

1. Real ESP32 hardware
2. Node.js simulator

Both MUST send data to the same API endpoint.

Endpoint:

/api/iot/telemetry

The purpose of the simulator is to provide a reliable backup when physical
hardware is unavailable.

The real ESP32 should post JSON over HTTPS.

The Node.js simulator should use the identical endpoint and compatible
payload format.


# 12. ESP32 HARDWARE

Minimum hardware:

- ESP32 DevKit V1
- DHT22
- HX711
- 20kg load cell
- Breadboard
- Jumper wires
- Data-capable Micro-USB cable

DHT22:

VCC  → ESP32 3V3
DATA → ESP32 GPIO 4
GND  → ESP32 GND

HX711:

VCC → ESP32 3V3
GND → ESP32 GND
DT  → ESP32 GPIO 16
SCK → ESP32 GPIO 17

Load cell:

Red   → E+
Black → E-
Green → A-
White → A+

IMPORTANT:
Load-cell wire colors can vary by manufacturer. If there is a conflict,
check the actual sensor datasheet.


# 13. IOT TELEMETRY DATA

Expected payload structure:

{
  "hiveCode": "HIVE-07",
  "deviceKey": "<IOT_DEVICE_KEY>",
  "readings": [
    {
      "recordedAt": "2026-09-17T10:00:00Z",
      "tempC": 34.2,
      "humidity": 58.1,
      "weightKg": 22.4,
      "soundHz": 0,
      "soundDb": 0,
      "co2Ppm": 0,
      "batteryPct": 87
    }
  ]
}

The API should validate the incoming data.

The device key should be checked against the server-side
IOT_DEVICE_KEY.


# 14. ESP32 BEHAVIOUR

ESP32 should:

- Connect to WiFi
- Read DHT22 temperature
- Read DHT22 humidity
- Read HX711 weight
- Collect readings
- Send readings to `/api/iot/telemetry`
- Use HTTPS
- Obtain accurate timestamps using NTP
- Buffer readings if WiFi temporarily disconnects
- Flush buffered readings after reconnecting
- Print useful information to Serial Monitor at 115200 baud

Normal posting interval:
- 60 seconds

Demo mode:
- 5 seconds

The firmware should contain a DEMO_MODE option.


# 15. IOT DEMONSTRATION

The dashboard should display live-ish hive telemetry.

The demo should allow a judge to interact with the hardware.

For example:

- Breathe on DHT22 → temperature/humidity changes
- Press load cell → hive weight changes

The dashboard should reflect the incoming data.

The goal is to make the IoT component visually demonstrable rather than
just showing code.


# 16. QR TRACEABILITY

The system should generate QR codes associated with honey batches.

Scanning a QR code should take a consumer to a public verification page.

The verification page should show relevant traceability information such as:

- Batch ID
- Beekeeper
- Hive/source information
- Harvest information
- Collection information
- Lab information/results
- Processing information
- Bottling information
- Supply-chain history
- Blockchain verification/tamper status

The consumer should not need an authenticated account.

IMPORTANT:
QR URLs must use the deployed Vercel URL when generated for the live demo.


# 17. TAMPER DEMONSTRATION

A major demonstration feature is blockchain tamper detection.

The application should be able to demonstrate:

1. Valid chain
2. Someone modifies a stored block/data
3. Hash verification detects the modification
4. UI displays a clear "CHAIN BROKEN" / tampering indication

The tamper demo should be simple and reliable.

Avoid complicated cryptographic systems that are unnecessary for the
hackathon.


# 18. MERKLE ROOT

Each honey batch should have a Merkle root representing the relevant
records/events for that batch.

The implementation should be understandable and deterministic.

The Merkle root should be available for verification/display where useful.

Do not over-engineer the Merkle tree.


# 19. OPTIONAL POLYGON ANCHORING

Polygon Amoy anchoring is OPTIONAL.

Only implement it after the main application is working.

Priority order:

1. Local hash chain
2. Database persistence
3. Tamper detection
4. Merkle root
5. QR verification
6. Supply-chain workflow
7. IoT
8. AI
9. Admin/map
10. Optional Polygon anchoring

If time becomes limited, skip Polygon anchoring rather than risking the
core application.


# 20. AI SERVICE

AI is implemented as a separate Python FastAPI service.

Local development:

http://localhost:8000

Expected structure:

ai-service/

The service should eventually be deployable independently on Render.

The Next.js application communicates with the FastAPI service using
AI_SERVICE_URL.


# 21. DEVELOPMENT PRIORITY

Build in this order.

Do NOT randomly jump between features.

P1:
Scaffold / folders / shadcn

P2:
Database schema + seed

P3:
Blockchain ledger core

P4:
Tamper demonstration

P5:
Supply-chain APIs + dashboards

P6:
QR + consumer verification page

P7-IOT:
IoT API + Node simulator

P8:
AI service

P9:
Admin + map

P10:
Landing page + UI polish

P12:
README + demo script

The critical demonstration features are:

- P3 Ledger
- P4 Tamper detection
- P6 QR verification

If time is running out, prioritize these over optional features.


# 22. HACKATHON CONSTRAINTS

This is a 12-hour hackathon build.

Therefore:

- Prefer simple working solutions.
- Avoid unnecessary abstractions.
- Avoid unnecessary dependencies.
- Avoid complex infrastructure.
- Avoid production-grade architecture that cannot be completed.
- Do not rewrite working code without a reason.
- Do not introduce technologies outside the agreed stack without asking.
- Keep the project understandable to a beginner.
- Focus on demonstrable functionality.


# 23. GITHUB COPILOT INSTRUCTIONS

I am using GitHub Copilot Agent in VS Code.

Before making major changes:

1. Inspect the existing project.
2. Understand the current file structure.
3. Reuse existing code where appropriate.
4. Do not overwrite working functionality unnecessarily.
5. Explain the plan briefly.
6. Then implement the requested task.

When implementing a task that affects multiple files:

- Tell me which files you will modify.
- Make the changes.
- Tell me what was changed.
- Tell me exactly what commands I need to run manually.
- Tell me how to test the feature.

When a command requires my manual action, clearly label it:

MANUAL STEP

Then provide numbered instructions.

Example:

MANUAL STEP:
1. Open PowerShell.
2. Run:
   `npx prisma db push`
3. Wait for it to finish.
4. Tell me the output if there is an error.


# 24. BEGINNER-FRIENDLY RULE

I am a beginner.

Do not assume I know:
- Why a command is required
- Where a file is located
- Where an environment variable goes
- How to configure a service
- How to deploy something
- How to install a package
- How to connect hardware
- How to run database migrations

When something must be done manually, explain it as a numbered list.

Do not give vague instructions such as:

"Configure the database."

Instead say exactly what I need to click/type/run.


# 25. FILE OUTPUT RULE

When creating or substantially rewriting a file, provide the complete file
content when practical.

The first line of generated source files should contain the file path as a
comment where the language supports comments.

Examples:

TypeScript:
// src/app/page.tsx

Python:
# ai-service/main.py

Arduino:
// firmware/hive_node/hive_node.ino

Do not omit important parts of a file with phrases such as:

"...rest of the code..."

The code should be complete and usable.


# 26. CODE QUALITY RULES

Prefer:

- Clear variable names
- Small understandable functions
- Simple architecture
- Type safety
- Basic error handling
- Input validation
- Reusable components where useful

Avoid:

- Over-engineering
- Unnecessary design patterns
- Unnecessary libraries
- Complex abstractions
- Premature optimization


# 27. SECURITY RULES

Never:

- Hard-code database passwords
- Hard-code API secrets into frontend code
- Commit `.env`
- Expose DATABASE_URL
- Expose QR_SECRET
- Expose IOT_DEVICE_KEY
- Put private credentials inside NEXT_PUBLIC_* variables
- Tell me to paste secrets into chat

Use environment variables for secrets.


# 28. GIT WORKFLOW

The project is hosted on GitHub.

Repository:

https://github.com/tarunn-raj/honey-chain.git

Branch:

main

After completing a stable task, I should normally save the work with:

git add .
git commit -m "describe what was done"
git push

Do not automatically reset or delete working code.

Before destructive Git commands such as:

git reset --hard

explain exactly what they will do and ask me before proceeding.


# 29. TESTING WORKFLOW

After implementing a feature:

1. Run the required development command.
2. Check for errors.
3. Test the feature locally.
4. Fix errors before moving to the next major feature.
5. Commit the working state to Git.

For the Next.js application:

npm run dev

For a production build:

npm run build


# 30. DATABASE WORKFLOW

After the Prisma schema is created or changed, tell me exactly which
database commands are required.

For the initial schema:

npx prisma generate
npx prisma db push
npx prisma db seed

For inspecting data:

npx prisma studio

Do not assume the database contains data.

Verify that seed data exists before building features that depend on it.


# 31. DEPLOYMENT

Next.js application:

- GitHub
- Vercel

Every push to the GitHub repository should trigger a Vercel deployment.

Production URL:

https://honey-chain-steel.vercel.app

AI service:

- Python FastAPI
- Render

When the AI service is deployed, update:

AI_SERVICE_URL

in both:

- local `.env`
- Vercel environment variables

Then redeploy the Next.js application.


# 32. IMPORTANT ARCHITECTURAL DECISIONS

These decisions are intentional and should not be changed casually:

1. Next.js for the main application.
2. PostgreSQL/Neon for persistent data.
3. Prisma for database access.
4. Application-layer permissioned blockchain ledger.
5. SHA-256 hash chaining.
6. Merkle root per batch.
7. Optional Polygon Amoy anchoring.
8. ESP32 for real IoT.
9. Node.js simulator using the same telemetry endpoint.
10. Separate Python FastAPI AI service.
11. Vercel for Next.js deployment.
12. Render for the AI service.
13. Simple cookie-based role authentication.


# 33. DO NOT DO THESE THINGS

Do NOT:

- Replace PostgreSQL with MongoDB without asking.
- Replace Next.js with another frontend framework.
- Replace Prisma without a strong reason.
- Introduce Hyperledger.
- Use Ethereum mainnet.
- Require blockchain infrastructure setup.
- Add unnecessary cloud infrastructure.
- Add a complicated authentication provider.
- Build a completely separate backend unless required.
- Create unnecessary microservices.
- Rewrite the entire project when modifying one feature.
- Remove existing working features without asking.
- Use localhost URLs in production QR codes.
- Put secrets into frontend environment variables.


# 34. WHEN SOMETHING IS BROKEN

If an implementation fails:

1. Read the exact error.
2. Identify the actual cause.
3. Fix the smallest necessary part.
4. Do not immediately rewrite the whole feature.
5. Explain what caused the problem.
6. Tell me how to verify the fix.

If I provide an error message, use that exact error as the starting point.


# 35. COPILOT AGENT BEHAVIOUR

Before starting a major implementation, inspect the repository.

Do not assume that a file exists.

Do not assume that a package is installed.

Do not assume that an environment variable exists.

Do not assume that the database is populated.

Check the current project state first.

When a requirement is ambiguous, ask me rather than inventing a major
architectural decision.

For small implementation details, choose the simplest solution consistent
with this document.


# 36. CURRENT PROJECT GOAL

The final demo should tell this story:

A beekeeper manages a hive.

The hive produces honey.

IoT sensors monitor the hive.

Honey is harvested and enters a supply chain.

The honey moves through collection, laboratory testing, processing and
bottling.

Each important event is recorded in the Honey Chain ledger.

The blockchain/hash-chain mechanism makes tampering detectable.

A consumer scans a QR code on the bottle.

The consumer sees the honey's traceability history and can verify that the
record has not been tampered with.

The system also provides AI-powered smart beekeeping functionality.

The entire experience should be visually clear and easy for a hackathon
judge to understand.


# 37. FIRST ACTION FOR COPILOT

When this file is first introduced to the project:

1. Read this PROJECT_CONTEXT.md completely.
2. Inspect the existing repository.
3. Determine what has already been implemented.
4. Do NOT start building everything automatically.
5. Summarize:
   - current project state
   - existing files
   - installed technologies/packages
   - missing components
   - any obvious configuration issues
6. Then wait for my next instruction.

Do not modify files merely because you discovered something that could be
improved.

The user will explicitly tell you which phase/task to implement next.