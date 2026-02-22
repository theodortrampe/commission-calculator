import { getUsers, getManagers } from "./actions";
import { UserTable } from "./user-table";
import { UserFormDialog } from "./user-form-dialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default async function UsersPage() {
    const users = await getUsers();
    const managers = await getManagers();

    return (
        <div className="container mx-auto py-8 max-w-6xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Directory</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage roles, assign managers, and invite new users.
                    </p>
                </div>
                <UserFormDialog managers={managers}>
                    <Button>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite User
                    </Button>
                </UserFormDialog>
            </div>

            <UserTable users={users} managers={managers} />
        </div>
    );
}
