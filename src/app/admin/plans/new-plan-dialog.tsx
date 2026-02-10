
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus } from "lucide-react";

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { createCompPlan } from "./actions";
import { PayoutFreq } from "@prisma/client";

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    description: z.string().optional().or(z.literal("")),
    frequency: z.enum([PayoutFreq.MONTHLY, PayoutFreq.QUARTERLY]),
});

export function NewPlanDialog() {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
            frequency: PayoutFreq.MONTHLY,
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        startTransition(async () => {
            const planId = await createCompPlan({
                name: values.name,
                description: values.description || "",
                frequency: values.frequency,
            });
            setOpen(false);
            form.reset();
            // Redirect to plan details to configure
            window.location.href = `/admin/plans/${planId}`;
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Plan
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Compensation Plan</DialogTitle>
                    <DialogDescription>
                        Define a new compensation plan. You can configure accelerators and rates in the next step.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Plan Name</label>
                        <Input
                            id="name"
                            placeholder="e.g. AE 2024 Accelerator Plan"
                            {...form.register("name")}
                        />
                        {form.formState.errors.name && (
                            <p className="text-sm font-medium text-destructive text-red-500">{form.formState.errors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="frequency" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Payout Frequency</label>
                        <Select
                            onValueChange={(val) => form.setValue("frequency", val as PayoutFreq)}
                            defaultValue={form.getValues("frequency")}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={PayoutFreq.MONTHLY}>Monthly</SelectItem>
                                <SelectItem value={PayoutFreq.QUARTERLY}>Quarterly</SelectItem>
                            </SelectContent>
                        </Select>
                        {form.formState.errors.frequency && (
                            <p className="text-sm font-medium text-destructive text-red-500">{form.formState.errors.frequency.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Description</label>
                        <Textarea
                            id="description"
                            placeholder="Optional description..."
                            className="resize-none"
                            {...form.register("description")}
                        />
                        {form.formState.errors.description && (
                            <p className="text-sm font-medium text-destructive text-red-500">{form.formState.errors.description.message}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Plan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
