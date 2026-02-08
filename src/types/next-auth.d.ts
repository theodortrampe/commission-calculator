import "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
    interface User {
        role?: Role | string;
    }

    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            role: string;
            image?: string | null;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: string;
        id?: string;
    }
}
