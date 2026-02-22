
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, CalendarIcon } from "lucide-react";
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
// import { Input } from "@/components/ui/input";
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

import { createAssignment } from "./actions";
import { Role } from "@prisma/client";

const formSchema = z.object({
    assignType: z.enum(["USER", "ROLE"]),
    userId: z.string().optional(),
    role: z.enum(Role).optional(),
    planId: z.string().min(1, "Plan is required"),
    startDate: z.date({ error: issue => issue.input === undefined ? "Start date is required" : "Invalid date" }),
    endDate: z.date().optional(),
}).refine((data) => {
    if (data.assignType === "USER" && !data.userId) return false;
    if (data.assignType === "ROLE" && !data.role) return false;
    return true;
}, {
    message: "User or Role is required based on selection",
    path: ["userId"], // This will attach error to userId field, simplistic but works
}).refine((data) => {
    if (data.endDate && data.endDate < data.startDate) return false;
    return true;
}, {
    message: "End date cannot be before start date",
    path: ["endDate"],
});

interface NewAssignmentDialogProps {
    users: { id: string; name: string | null; role: Role }[];
    plans: { id: string; name: string }[];
}

export function NewAssignmentDialog({ users, plans }: NewAssignmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            assignType: "USER",
            planId: "",
            startDate: new Date(),
        },
    });

    // Watch assignType to conditionally render fields
    const assignType = form.watch("assignType");
    const startDate = form.watch("startDate");
    const endDate = form.watch("endDate");

    function onSubmit(values: z.infer<typeof formSchema>) {
        startTransition(async () => {
            try {
                await createAssignment({
                    userId: values.assignType === "USER" ? values.userId || null : null,
                    role: values.assignType === "ROLE" ? values.role || null : null,
                    planId: values.planId,
                    startDate: values.startDate,
                    endDate: values.endDate,
                });
                setOpen(false);
                form.reset({
                    assignType: "USER",
                    planId: "",
                    startDate: new Date(),
                });
            } catch (error) {
                console.error("Failed to create assignment:", error);
                // Could set a form error here if needed
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Assignment
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Assign Compensation Plan</DialogTitle>
                    <DialogDescription>
                        Assign a plan to a specific user or role. Assignments determine which plan is used for calculations during a period.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Assignment Type */}
                    <div className="space-y-2">
                        <Label>Assign To</Label>
                        <RadioGroup
                            defaultValue="USER"
                            onValueChange={(val) => form.setValue("assignType", val as "USER" | "ROLE")}
                            className="flex flex-row space-x-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="USER" id="r1" />
                                <Label htmlFor="r1">Specific User</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="ROLE" id="r2" />
                                <Label htmlFor="r2">Role (All Users)</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* User Selection */}
                    {assignType === "USER" && (
                        <div className="space-y-2">
                            <Label htmlFor="userId">Select User</Label>
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

                    {/* Role Selection */}
                    {assignType === "ROLE" && (
                        <div className="space-y-2">
                            <Label htmlFor="role">Select Role</Label>
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

                    {/* Plan Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="planId">Compensation Plan</Label>
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

                    {/* Start Date */}
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

                    {/* End Date (Optional) */}
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
                                    selected={endDate}
                                    onSelect={(date) => {
                                        form.setValue("endDate", date);
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Assignment
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
