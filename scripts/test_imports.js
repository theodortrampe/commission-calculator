
try {
    require('bcryptjs');
    console.log('bcryptjs loaded');
} catch (e) {
    console.error('bcryptjs failed to load:', e.message);
}

try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    console.log('PrismaClient instantiated');
} catch (e) {
    console.error('PrismaClient failed:', e.message);
}
