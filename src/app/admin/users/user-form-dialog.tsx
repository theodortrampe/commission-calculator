"use client";

import { useState } from "react";
import { User, Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createUser, updateUser } from "./actions";

export function UserFormDialog({
    user,
    managers,
    children,
}: {
    user?: User & { manager?: User | null };
    managers: User[];
    children: React.ReactNode;
}) {
    const isEdit = !!user;
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [name, setName] = useState(user?.name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [role, setRole] = useState<Role>(user?.role || "REP");
    const [currency, setCurrency] = useState(user?.currency || "USD");
    const [managerId, setManagerId] = useState<string>(user?.managerId || "none");

    const [tempPassword, setTempPassword] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);
        setTempPassword(null);

        try {
            if (isEdit) {
                await updateUser(user.id, {
                    name,
                    role,
                    currency,
                    managerId: managerId === "none" ? null : managerId,
                });
                setOpen(false);
            } else {
                const res = await createUser({
                    name,
                    email,
                    role,
                    currency,
                    managerId: managerId === "none" ? null : managerId,
                });
                setTempPassword(res.tempPassword);
                // Don't close so they can copy the password
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save user");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit User" : "Invite User"}</DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? "Update a user's role, manager, or currency."
                            : "Create a new user. They will be assigned a temporary password."}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {tempPassword && (
                        <div className="p-3 bg-green-50 text-green-800 rounded-md border border-green-200">
                            <strong>Success!</strong> The user has been created.
                            <br />
                            Temporary Password: <code className="font-mono bg-white px-1 ml-1">{tempPassword}</code>
                            <br />
                            <span className="text-xs text-green-700">Please copy and share this securely. They must log in with it.</span>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 text-red-800 rounded-md border border-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            disabled={isLoading || !!tempPassword}
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="col-span-3"
                            disabled={isEdit || isLoading || !!tempPassword}
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">
                            Role
                        </Label>
                        <Select
                            value={role}
                            onValueChange={(v) => setRole(v as Role)}
                            disabled={isLoading || !!tempPassword}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="REP">Sales Rep</SelectItem>
                                <SelectItem value="MANAGER">Manager</SelectItem>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="manager" className="text-right">
                            Manager
                        </Label>
                        <Select
                            value={managerId}
                            onValueChange={setManagerId}
                            disabled={isLoading || !!tempPassword}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Assign a manager" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {managers.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="currency" className="text-right">
                            Currency
                        </Label>
                        <Select
                            value={currency}
                            onValueChange={setCurrency}
                            disabled={isLoading || !!tempPassword}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USD">USD ($)</SelectItem>
                                <SelectItem value="EUR">EUR (€)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    {tempPassword ? (
                        <Button onClick={() => setOpen(false)}>Close</Button>
                    ) : (
                        <Button
                            onClick={handleSave}
                            disabled={isLoading || !name || !email}
                        >
                            {isLoading ? "Saving..." : "Save User"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
