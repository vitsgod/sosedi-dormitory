# Execution ledger — docs/superpowers/plans/2026-10-30-dormitory.md

Approved specification and inline execution. Empty workspace; using current folder without another worktree.
Pre-flight: Tasks 2–5 consume SessionUser from Task 1; Task 4 consumes booking/request events; Task 5 consumes all services; interfaces consistent.
Ruling: Use available bundled pnpm CLI because npm is not on PATH; commands in documentation remain standard npm scripts and pnpm equivalents.
Ruling: PostgreSQL 18 binaries found in Program Files; create an isolated development cluster in .local on a separate localhost port, without touching existing university lab databases.
Design: Соседи / Общежитие № 4. Cool off-white ground, dark navy ink, cobalt action and booking bars, restrained orange notices. Main task: find a laundry slot or send a maintenance request. Signature: five machine rows with real booking intervals, not generic KPI cards.
Task 1: complete. PostgreSQL schema/migrations, salted scrypt, hashed sessions, role and approval checks. Unit and integration checks pass.
Task 2: complete. Transactional workspace lock + PostgreSQL exclusion constraint, 24h/Moscow/cleanup rules, three-machine concurrency cap, expiry/start/cancellation. Concurrent integration tests pass.
Task 3: complete. Specialty queues, atomic claiming, private complaints and attachments, announcements and role administration. Integration and real browser workflow pass.
Task 4: complete. Worker + request-time catch-up, idempotent notifications and file/demo cleanup. Tests include restarts and 205-file cleanup.
Task 5: complete. Public home and three responsive cabinets, isolated demo spaces and role switching, local Manrope and building SVG. Browser checks performed at 390px and desktop; production build passes.
Task 6: complete for local delivery. README, Compose, startup helper, production server and worker. Docker/online hosting unverified and explicitly documented in docs/verification.md.
Final review: independent reviewer found two Important and two notification defects. All four reproduced as failing tests, fixed, and full suite 26/26 passed. No deferred reported minors remain.
Verification: Next production build PASS; TypeScript PASS; unit+PostgreSQL integration 26/26 PASS; HTTP smoke PASS; responsive home inspector 0 FAIL.
Execution note: initial package installation and isolated network context prevented running the first tests until the toolchain was ready. Full feature checks were then run against the real PostgreSQL database; no claim of a complete initial RED/GREEN cycle for every module is made. The final four review fixes have witnessed RED/GREEN evidence.
Delivery: current feature branch retained locally; no remote push or publication. PostgreSQL uses separate .local/postgres on 127.0.0.1:55439. Web and worker are retained to let the user view the result.
