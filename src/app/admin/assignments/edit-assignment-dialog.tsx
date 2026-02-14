
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Pencil, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { AssignmentWithDetails, updateAssignment } from "./actions";
import { Role } from "@prisma/client";

const formSchema = z.object({
    assignType: z.enum(["USER", "ROLE"]),
    userId: z.string().optional(),
    role: z.enum(Role).optional(),
    planId: z.string().min(1, "Plan is required"),
    startDate: z.date({ error: issue => issue.input === undefined ? "Start date is required" : "Invalid date" }),
    endDate: z.date().optional().nullable(),
}).refine((data) => {
    if (data.assignType === "USER" && !data.userId) return false;
    if (data.assignType === "ROLE" && !data.role) return false;
    return true;
}, {
    message: "User or Role is required based on selection",
    path: ["userId"],
}).refine((data) => {
    if (data.endDate && data.endDate < data.startDate) return false;
    return true;
}, {
    message: "End date cannot be before start date",
    path: ["endDate"],
});

interface EditAssignmentDialogProps {
    assignment: AssignmentWithDetails;
    users: { id: string; name: string | null; role: Role }[];
    plans: { id: string; name: string }[];
}

export function EditAssignmentDialog({ assignment, users, plans }: EditAssignmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            assignType: assignment.user ? "USER" : "ROLE",
            userId: assignment.user?.id || "",
            role: assignment.role || Role.REP,
            planId: assignment.plan.id,
            startDate: new Date(assignment.startDate),
            endDate: assignment.endDate ? new Date(assignment.endDate) : null,
        },
    });

    const assignType = form.watch("assignType");
    const startDate = form.watch("startDate");
    const endDate = form.watch("endDate");

    function onSubmit(values: z.infer<typeof formSchema>) {
        startTransition(async () => {
            try {
                await updateAssignment(assignment.id, {
                    userId: values.assignType === "USER" ? values.userId || null : null,
                    role: values.assignType === "ROLE" ? values.role || null : null,
                    planId: values.planId,
                    startDate: values.startDate,
                    endDate: values.endDate,
                });
                setOpen(false);
            } catch (error) {
                console.error("Failed to update assignment:", error);
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit assignment</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Assignment</DialogTitle>
                    <DialogDescription>
                        Update the details for this compensation plan assignment.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Assign To</Label>
                        <RadioGroup
                            defaultValue={form.getValues("assignType")}
                            onValueChange={(val) => form.setValue("assignType", val as "USER" | "ROLE")}
                            className="flex flex-row space-x-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="USER" id="edit-r1" />
                                <Label htmlFor="edit-r1">Specific User</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="ROLE" id="edit-r2" />
                                <Label htmlFor="edit-r2">Role (All Users)</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {assignType === "USER" && (
                        <div className="space-y-2">
                            <Label htmlFor="edit-userId">Select User</Label>
                            <Select
                                onValueChange={(val) => form.setValue("userId", val)}
                                defaultValue={form.getValues("userId")}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select user..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.name} ({user.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.userId && (
                                <p className="text-sm font-medium text-destructive text-red-500">
                                    {form.formState.errors.userId.message}
                                </p>
                            )}
                        </div>
                    )}

                    {assignType === "ROLE" && (
                        <div className="space-y-2">
                            <Label htmlFor="edit-role">Select Role</Label>
                            <Select
                                onValueChange={(val) => form.setValue("role", val as Role)}
                                defaultValue={form.getValues("role")}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={Role.REP}>Sales Rep</SelectItem>
                                    <SelectItem value={Role.MANAGER}>Manager</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.formState.errors.role && (
                                <p className="text-sm font-medium text-destructive text-red-500">
                                    {form.formState.errors.role.message}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="edit-planId">Compensation Plan</Label>
                        <Select
                            onValueChange={(val) => form.setValue("planId", val)}
                            defaultValue={form.getValues("planId")}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select plan..." />
                            </SelectTrigger>
                            <SelectContent>
                                {plans.map((plan) => (
                                    <SelectItem key={plan.id} value={plan.id}>
                                        {plan.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {form.formState.errors.planId && (
                            <p className="text-sm font-medium text-destructive text-red-500">
                                {form.formState.errors.planId.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2 flex flex-col">
                        <Label>Start Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] pl-3 text-left font-normal",
                                        !startDate && "text-muted-foreground"
                                    )}
                                >
                                    {startDate ? (
                                        format(startDate, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={startDate}
                                    onSelect={(date) => {
                                        if (date) form.setValue("startDate", date);
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        {form.formState.errors.startDate && (
                            <p className="text-sm font-medium text-destructive text-red-500">
                                {form.formState.errors.startDate.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2 flex flex-col">
                        <Label>End Date (Optional)</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] pl-3 text-left font-normal",
                                        !endDate && "text-muted-foreground"
                                    )}
                                >
                                    {endDate ? (
                                        format(endDate, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={endDate || undefined}
                                    onSelect={(date) => {
                                        form.setValue("endDate", date || null);
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        {form.formState.errors.endDate && (
                            <p className="text-sm font-medium text-destructive text-red-500">
                                {form.formState.errors.endDate.message}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
