
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

console.log("PrismaClient resolved path:", require.resolve("@prisma/client"));

const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Connecting...");
    try {
        const users = await prisma.user.count();
        console.log("Connected! Users:", users);
    } catch (e: any) {
        console.error("Connection failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
