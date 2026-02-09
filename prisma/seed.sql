-- Seed Data for Commission Calculator
-- Run this after database migration: npx prisma db execute --file prisma/seed.sql

-- Clean up existing data
DELETE FROM adjustments;
DELETE FROM payouts;
DELETE FROM orders;
DELETE FROM user_period_data;
DELETE FROM users;
DELETE FROM comp_plans;

-- Create CompPlan
INSERT INTO comp_plans (id, name, frequency, accelerators) VALUES 
('plan-001', 'AE 2024 Accelerator Plan', 'MONTHLY', 
 '{"tiers":[{"minAttainment":0,"maxAttainment":100,"multiplier":1.0},{"minAttainment":100,"maxAttainment":125,"multiplier":1.5},{"minAttainment":125,"maxAttainment":150,"multiplier":2.0},{"minAttainment":150,"maxAttainment":null,"multiplier":2.5}],"description":"1x up to 100%, 1.5x from 100-125%, 2x from 125-150%, 2.5x above 150%"}'
);

-- Create Users
INSERT INTO users (id, email, name, role, passwordHash, createdAt) VALUES 
('admin-001', 'admin@company.com', 'Admin User', 'ADMIN', '$2b$10$UGrvs/lwm.flEIlW3eNkIuy568EbkjLEjAwfPbX2RH3kwsHpbFD1a', datetime('now')),
('rep-001', 'john.doe@company.com', 'John Doe', 'REP', '$2b$10$UGrvs/lwm.flEIlW3eNkIuy568EbkjLEjAwfPbX2RH3kwsHpbFD1a', datetime('now')),
('rep-002', 'jane.smith@company.com', 'Jane Smith', 'REP', '$2b$10$UGrvs/lwm.flEIlW3eNkIuy568EbkjLEjAwfPbX2RH3kwsHpbFD1a', datetime('now'));

-- Create UserPeriodData for current month (February 2026)
INSERT INTO user_period_data (id, userId, month, title, quota, baseSalary, ote, effectiveRate, planId) VALUES 
('period-001', 'rep-001', '2026-02-01', 'Senior Account Executive', 150000, 80000, 160000, 0.5333, 'plan-001'),
('period-002', 'rep-001', '2026-01-01', 'Senior Account Executive', 140000, 80000, 160000, 0.5714, 'plan-001'),
('period-003', 'rep-002', '2026-02-01', 'Account Executive', 100000, 60000, 120000, 0.6, 'plan-001'),
('period-004', 'rep-002', '2026-01-01', 'Account Executive', 90000, 60000, 120000, 0.6667, 'plan-001');

-- Create Orders for John Doe - Current Month
INSERT INTO orders (id, orderNumber, convertedUsd, convertedEur, status, bookingDate, userId) VALUES 
('order-001', 'ORD-2026-001', 45000, 41000, 'APPROVED', '2026-02-03', 'rep-001'),
('order-002', 'ORD-2026-002', 32000, 29000, 'APPROVED', '2026-02-07', 'rep-001'),
('order-003', 'ORD-2026-003', 28000, 25500, 'PENDING', '2026-02-12', 'rep-001'),
('order-004', 'ORD-2026-004', 55000, 50000, 'APPROVED', '2026-02-15', 'rep-001'),
('order-005', 'ORD-2026-005', 18000, 16400, 'PENDING', '2026-02-20', 'rep-001');

-- Create Orders for John Doe - Last Month
INSERT INTO orders (id, orderNumber, convertedUsd, convertedEur, status, bookingDate, userId) VALUES 
('order-006', 'ORD-2026-006', 38000, 34600, 'APPROVED', '2026-01-05', 'rep-001'),
('order-007', 'ORD-2026-007', 42000, 38200, 'APPROVED', '2026-01-10', 'rep-001'),
('order-008', 'ORD-2026-008', 25000, 22750, 'APPROVED', '2026-01-15', 'rep-001'),
('order-009', 'ORD-2026-009', 31000, 28200, 'PENDING', '2026-01-20', 'rep-001'),
('order-010', 'ORD-2026-010', 48000, 43680, 'APPROVED', '2026-01-25', 'rep-001');

-- Create Orders for Jane Smith - Current Month
INSERT INTO orders (id, orderNumber, convertedUsd, convertedEur, status, bookingDate, userId) VALUES 
('order-011', 'ORD-2026-011', 22000, 20020, 'APPROVED', '2026-02-02', 'rep-002'),
('order-012', 'ORD-2026-012', 35000, 31850, 'APPROVED', '2026-02-08', 'rep-002'),
('order-013', 'ORD-2026-013', 18000, 16380, 'PENDING', '2026-02-13', 'rep-002'),
('order-014', 'ORD-2026-014', 41000, 37310, 'APPROVED', '2026-02-18', 'rep-002'),
('order-015', 'ORD-2026-015', 12000, 10920, 'PENDING', '2026-02-22', 'rep-002');

-- Create Orders for Jane Smith - Last Month
INSERT INTO orders (id, orderNumber, convertedUsd, convertedEur, status, bookingDate, userId) VALUES 
('order-016', 'ORD-2026-016', 28000, 25480, 'APPROVED', '2026-01-03', 'rep-002'),
('order-017', 'ORD-2026-017', 19000, 17290, 'APPROVED', '2026-01-09', 'rep-002'),
('order-018', 'ORD-2026-018', 33000, 30030, 'APPROVED', '2026-01-14', 'rep-002'),
('order-019', 'ORD-2026-019', 15000, 13650, 'PENDING', '2026-01-19', 'rep-002'),
('order-020', 'ORD-2026-020', 24000, 21840, 'APPROVED', '2026-01-24', 'rep-002');
