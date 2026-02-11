-- ==============================
-- DATABASE: tuition_tracker
-- ==============================

CREATE DATABASE IF NOT EXISTS tuition_tracker;
USE tuition_tracker;

-- ==============================
-- TABLE: tuitions
-- ==============================
CREATE TABLE tuitions (
    tuition_id INT AUTO_INCREMENT PRIMARY KEY,
    tuition_name VARCHAR(100) NOT NULL UNIQUE,
    show_earning TINYINT(1) DEFAULT 1
);

-- ==============================
-- TABLE: months
-- ==============================
CREATE TABLE months (
    month_id INT AUTO_INCREMENT PRIMARY KEY,
    tuition_id INT NOT NULL,
    month_name VARCHAR(50) NOT NULL,
    class_count INT NOT NULL,
    earning DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (tuition_id)
        REFERENCES tuitions(tuition_id)
        ON DELETE CASCADE
);

-- ==============================
-- TABLE: class_dates
-- ==============================
CREATE TABLE class_dates (
    class_id INT AUTO_INCREMENT PRIMARY KEY,
    month_id INT NOT NULL,
    class_date DATE NOT NULL,
    FOREIGN KEY (month_id)
        REFERENCES months(month_id)
        ON DELETE CASCADE
);
