-- ===============================
-- SQLite Database Schema
-- Tuition Tracker
-- ===============================

PRAGMA foreign_keys = ON;

-- ===============================
-- TABLE: tuitions
-- ===============================
CREATE TABLE IF NOT EXISTS tuitions (
    tuition_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tuition_name TEXT NOT NULL UNIQUE,
    show_earning INTEGER DEFAULT 1
);

-- ===============================
-- TABLE: months
-- ===============================
CREATE TABLE IF NOT EXISTS months (
    month_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tuition_id INTEGER NOT NULL,
    month_name TEXT NOT NULL,
    class_count INTEGER NOT NULL,
    earning REAL DEFAULT 0,
    FOREIGN KEY (tuition_id)
        REFERENCES tuitions(tuition_id)
        ON DELETE CASCADE
);

-- ===============================
-- TABLE: class_dates
-- ===============================
CREATE TABLE IF NOT EXISTS class_dates (
    class_id INTEGER PRIMARY KEY AUTOINCREMENT,
    month_id INTEGER NOT NULL,
    class_date TEXT NOT NULL,
    FOREIGN KEY (month_id)
        REFERENCES months(month_id)
        ON DELETE CASCADE
);

-- ===============================
-- VIEW: total earning per tuition
-- ===============================
CREATE VIEW IF NOT EXISTS total_earning_per_tuition AS
SELECT
    t.tuition_id,
    t.tuition_name,
    IFNULL(SUM(m.earning), 0) AS total_earning
FROM tuitions t
LEFT JOIN months m
ON t.tuition_id = m.tuition_id
GROUP BY t.tuition_id, t.tuition_name;
