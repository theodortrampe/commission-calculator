
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables explicitly from root .env
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env file:', result.error);
}

console.log('DATABASE_URL:', process.env.DATABASE_URL);

try {
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');

    console.log('Libraries loaded successfully');

    const prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
    });

    async function main() {
        const email = 'admin@company.com';
        const password = 'admin123';

        console.log(`Resetting password for ${email}...`);

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(`Generated hash: ${hashedPassword}`);

        try {
            // Update user
            const user = await prisma.user.update({
                where: { email },
                data: { passwordHash: hashedPassword },
            });
            console.log(`✅ Password updated successfully for user: ${user.email}`);

            // Verify immediately
            const verify = await bcrypt.compare(password, user.passwordHash);
            console.log(`🔐 Verification check: ${verify ? 'PASSED' : 'FAILED'}`);

        } catch (e) {
            console.error('❌ Error updating password:', e);
        } finally {
            await prisma.$disconnect();
        }
    }

    main().catch(e => {
        console.error('Unhandled error in main:', e);
        process.exit(1);
    });

} catch (e) {
    console.error('Failed to load libraries or initialize PrismaClient:', e);
    process.exit(1);
}
