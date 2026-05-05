"""
VeriMed Seed Script
Run: python seed_data.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import execute_update, execute_query

def run():
    print("=== VeriMed Seed Script ===")

    # ── fake_reports table ──────────────────────────────────────────────
    execute_update("""
    CREATE TABLE IF NOT EXISTS fake_reports (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        batch_id_str  VARCHAR(100),
        location      VARCHAR(255) NOT NULL,
        description   TEXT,
        reporter_name VARCHAR(100) DEFAULT 'Anonymous',
        reported_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_blacklisted TINYINT(1) DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)
    print("fake_reports table: ready")

    # ── Fake medicine reports ────────────────────────────────────────────
    fake_reports = [
        ("BT-FAKE-001", "Raja Bazaar, Rawalpindi",
         "Panadol packaging looked tampered — seals broken on 3 strips. Color of tablets also slightly off.",
         "Adeel Khan", 1),
        ("BT-FAKE-002", "Urdu Bazaar, Lahore",
         "Suspiciously cheap Augmentin 625mg — no batch code visible and expiry date smudged.",
         "Sana Mirza", 1),
        (None, "Saddar Market, Karachi",
         "Unbranded Paracetamol 500mg tablets sold loose, no manufacturer info or batch number.",
         "Ahmed Raza", 1),
        ("BT-FAKE-003", "G-9 Markaz, Islamabad",
         "Brufen 400mg strips missing hologram sticker — retailer claimed it was genuine.",
         "Faisal Iqbal", 0),
        (None, "Cantonment Bazaar, Peshawar",
         "Cough syrup bottle with blurry label and date printed over an older date.",
         "Anonymous", 0),
        ("BT-FAKE-004", "Liaquat Bazaar, Quetta",
         "Counterfeit Flagyl tablets — different colour and texture than usual brand.",
         "Dr. Nadia Awan", 1),
        (None, "Clifton, Karachi",
         "Insulin vials with broken seal sold at 40% below pharmacy price. Highly suspicious.",
         "M. Yousaf", 1),
        ("BT-FAKE-005", "Mall Road, Murree",
         "Herbal supplement claiming FDA approval — no registration number found.",
         "Anonymous", 0),
    ]

    inserted = 0
    for row in fake_reports:
        ok = execute_update(
            """INSERT INTO fake_reports
               (batch_id_str, location, description, reporter_name, is_blacklisted)
               VALUES (%s, %s, %s, %s, %s)""",
            row
        )
        if ok:
            inserted += 1
    print(f"Fake reports inserted: {inserted}/{len(fake_reports)}")

    # ── Summary ─────────────────────────────────────────────────────────
    r = execute_query("SELECT COUNT(*) AS n FROM fake_reports", fetch_one=True)
    print(f"Total fake_reports in DB: {r['n'] if r else 0}")
    print("=== Done ===")

if __name__ == "__main__":
    run()
