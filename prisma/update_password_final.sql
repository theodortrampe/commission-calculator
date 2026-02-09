
-- Update users with verified password hash for 'admin123'
UPDATE users SET passwordHash = '$2b$10$UGrvs/lwm.flEIlW3eNkIuy568EbkjLEjAwfPbX2RH3kwsHpbFD1a' WHERE email = 'admin@company.com';
UPDATE users SET passwordHash = '$2b$10$UGrvs/lwm.flEIlW3eNkIuy568EbkjLEjAwfPbX2RH3kwsHpbFD1a' WHERE email = 'john.doe@company.com';
UPDATE users SET passwordHash = '$2b$10$UGrvs/lwm.flEIlW3eNkIuy568EbkjLEjAwfPbX2RH3kwsHpbFD1a' WHERE email = 'jane.smith@company.com';
