-- Update users with password hashes
-- admin123 hash
UPDATE users SET passwordHash = '$2b$10$FbYhZKmSUS16vc2fdN/ZfO2D6cZDcQYm1Vwda6avXW0X3IwAt5g2' WHERE email = 'admin@company.com';
-- rep123 hash  
UPDATE users SET passwordHash = '$2b$10$FbYhZKmSUS16vc2fdN/ZfO2D6cZDcQYm1Vwda6avXW0X3IwAt5g2' WHERE email = 'john.doe@company.com';
UPDATE users SET passwordHash = '$2b$10$FbYhZKmSUS16vc2fdN/ZfO2D6cZDcQYm1Vwda6avXW0X3IwAt5g2' WHERE email = 'jane.smith@company.com';
