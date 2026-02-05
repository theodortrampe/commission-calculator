import "dotenv/config";
import { PrismaClient } from "@prisma/client";

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$connect();
        console.log("Connected successfully!");
        const users = await prisma.user.findMany();
        console.log("Users found:", users.length);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
