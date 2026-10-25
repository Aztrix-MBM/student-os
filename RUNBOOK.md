# Operations Runbook — Student OS

This runbook documents operational procedures for database backups, disaster recovery restore, secret rotation, and payment verification.

---

## 1. Database Operations

### 1.1 Development Backups (SQLite)
Development and local testing environments use SQLite with `PRAGMA foreign_keys=ON`.

* **Create Backup:**
  ```bash
  cd backend
  python scripts/backup_db.py
  ```
  This creates a compressed snapshot in `backend/backups/student_os_YYYYMMDD_HHMMSS.db.gz` after running a `PRAGMA integrity_check`.

* **Restore from SQLite Backup:**
  ```bash
  cd backend
  # 1. Stop local server
  # 2. Decompress archive to student_os.db
  python -c "import gzip, shutil; shutil.copyfileobj(gzip.open('backups/student_os_20261025_040004.db.gz'), open('student_os.db', 'wb'))"
  # 3. Verify integrity
  python -c "import sqlite3; con = sqlite3.connect('student_os.db'); print(con.execute('PRAGMA integrity_check;').fetchall())"
  # 4. Confirm migrations
  alembic current
  ```

### 1.2 Production Backups (Managed PostgreSQL)
Production environments use managed PostgreSQL (Neon, Supabase, or Railway).

* **Automated Provider Backups:**
  - Enable daily automated snapshots with 7-day retention in provider console.
  - Point-in-time recovery (PITR) enabled where available.

* **Manual Production Backup (pg_dump):**
  ```bash
  pg_dump "$DATABASE_URL" -Fc -f "student_os_backup_$(date +%Y%m%d_%H%M%S).dump"
  ```

* **Tested Restore Procedure (PostgreSQL):**
  1. Prepare fresh database target:
     ```bash
     createdb -h "$PGHOST" -U "$PGUSER" student_os_recovery
     ```
  2. Restore custom format dump:
     ```bash
     pg_restore -h "$PGHOST" -U "$PGUSER" -d student_os_recovery -v "student_os_backup_20261025.dump"
     ```
  3. Validate schema migrations:
     ```bash
     DATABASE_URL="postgresql://user:pass@host/student_os_recovery" alembic current
     ```
  4. Run backend health check:
     ```bash
     DATABASE_URL="postgresql://user:pass@host/student_os_recovery" pytest tests/test_health.py
     ```
  5. Switch application connection string `DATABASE_URL` to the restored instance.

---

## 2. Payment Approval Operations

Student OS uses direct UPI with manual banking reference (UTR) verification for the initial pilot phase.

### 2.1 Verification Workflow
1. When a student submits a payment in the web application, a record is created in the `payments` table with `status="pending"`.
2. Inspect your Google Pay, PhonePe, or bank statement for the corresponding 12-digit UTR and credit amount:
   - Monthly Sprint: ₹49
   - Semester Pass: ₹99
3. Confirm the payment timestamp and amount match.

### 2.2 Approving Payment via CLI
Run the approval script from the `backend/` directory:
```bash
python scripts/approve_payment.py <12-digit-utr>
```
Example:
```bash
python scripts/approve_payment.py 428910284719
```
* **Output:**
  ```text
  Approved payment for student@example.com: extended Pro access by 180 days until 2027-04-23T11:30:00+00:00.
  Payment successfully approved.
  ```

### 2.3 Approving Payment via Admin API
Authenticated requests from emails listed in `ADMIN_EMAILS` can trigger:
```http
POST /api/payments/{utr}/approve
Cookie: access_token=...
```

---

## 3. Secret Rotation Procedure

### 3.1 JWT Secret Rotation
If `JWT_SECRET` is compromised or rotated:
1. Update `JWT_SECRET` in production `.env`.
2. Restart backend service.
3. All existing client cookies will immediately fail signature validation with `401 Unauthorized`.
4. Users must log in again to receive new cookies signed with the updated key.

### 3.2 Database Password Rotation
1. Update database user credentials in provider console.
2. Update `DATABASE_URL` in backend `.env`.
3. Restart backend service.
4. Verify `/api/health` returns status `"healthy"`.
