"use client";

import { useTransition } from "react";
import { User } from "@prisma/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserFormDialog } from "./user-form-dialog";
import { toggleUserActive } from "./actions";

type UserWithRelations = User & { manager: User | null };

export function UserTable({
    users,
    managers,
}: {
    users: UserWithRelations[];
    managers: User[];
}) {
    const [isPending, startTransition] = useTransition();

    const handleToggleActive = (userId: string, currentStatus: boolean) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'reactivate'} this user?`)) {
            return;
        }

        startTransition(async () => {
            try {
                await toggleUserActive(userId, !currentStatus);
            } catch (e) {
                alert(e instanceof Error ? e.message : "Failed to update user status.");
            }
        });
    };

    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Manager</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                                No users found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        users.map((user) => (
                            <TableRow key={user.id} className={!user.isActive ? "opacity-50 bg-muted/50" : ""}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {user.manager ? user.manager.name : "—"}
                                </TableCell>
                                <TableCell>{user.currency}</TableCell>
                                <TableCell>
                                    <Badge variant={user.isActive ? "outline" : "destructive"}>
                                        {user.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap space-x-2">
                                    <UserFormDialog user={user} managers={managers}>
                                        <Button variant="outline" size="sm">
                                            Edit
                                        </Button>
                                    </UserFormDialog>
                                    <Button
                                        variant={user.isActive ? "destructive" : "secondary"}
                                        size="sm"
                                        disabled={isPending}
                                        onClick={() => handleToggleActive(user.id, user.isActive)}
                                    >
                                        {user.isActive ? "Deactivate" : "Reactivate"}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
