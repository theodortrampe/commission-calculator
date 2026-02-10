"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save } from "lucide-react";
import { CompPlanVersion } from "@prisma/client";

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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { updateCompPlanVersion } from "../actions";

const formSchema = z.object({
    baseRateMultiplier: z.coerce.number().min(0),
    acceleratorsEnabled: z.boolean(),
    kickersEnabled: z.boolean(),
    accelerators: z.string().optional(), // Try to parse as JSON on submit
    kickers: z.string().optional(),
});

interface VersionEditorProps {
    version: CompPlanVersion;
}

export function VersionEditor({ version }: VersionEditorProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            baseRateMultiplier: version.baseRateMultiplier,
            acceleratorsEnabled: version.acceleratorsEnabled,
            kickersEnabled: version.kickersEnabled,
            accelerators: version.accelerators ? JSON.stringify(version.accelerators, null, 2) : "{}",
            kickers: version.kickers ? JSON.stringify(version.kickers, null, 2) : "{}",
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        // Validate JSON
        let acceleratorsJson;
        let kickersJson;
        try {
            acceleratorsJson = values.accelerators ? JSON.parse(values.accelerators) : {};
        } catch (e) {
            form.setError("accelerators", { message: "Invalid JSON" });
            return;
        }

        try {
            kickersJson = values.kickers ? JSON.parse(values.kickers) : {};
        } catch (e) {
            form.setError("kickers", { message: "Invalid JSON" });
            return;
        }

        startTransition(async () => {
            await updateCompPlanVersion(version.id, {
                baseRateMultiplier: values.baseRateMultiplier,
                acceleratorsEnabled: values.acceleratorsEnabled,
                kickersEnabled: values.kickersEnabled,
                accelerators: acceleratorsJson,
                kickers: kickersJson,
            });
            setOpen(false);
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    Configure Logic
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configure Plan Logic (v{version.versionNumber})</DialogTitle>
                    <DialogDescription>
                        Adjust multipliers, accelerators, and kickers for this version.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Base Rate Multiplier</Label>
                            <Input
                                type="number"
                                step="0.1"
                                {...form.register("baseRateMultiplier")}
                            />
                        </div>
                    </div>

                    <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label>Enable Accelerators</Label>
                            <div className="text-[0.8rem] text-muted-foreground">
                                Apply multipliers based on quota attainment.
                            </div>
                        </div>
                        <Switch
                            checked={form.watch("acceleratorsEnabled")}
                            onCheckedChange={(checked) => form.setValue("acceleratorsEnabled", checked)}
                        />
                    </div>

                    {form.watch("acceleratorsEnabled") && (
                        <div className="space-y-2">
                            <Label>Accelerators JSON Config</Label>
                            <Textarea
                                className="font-mono text-xs min-h-[150px]"
                                {...form.register("accelerators")}
                            />
                            {form.formState.errors.accelerators && (
                                <p className="text-sm font-medium text-destructive text-red-500">
                                    {form.formState.errors.accelerators.message}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label>Enable Kickers</Label>
                            <div className="text-[0.8rem] text-muted-foreground">
                                Apply bonuses for specific product lines or conditions.
                            </div>
                        </div>
                        <Switch
                            checked={form.watch("kickersEnabled")}
                            onCheckedChange={(checked) => form.setValue("kickersEnabled", checked)}
                        />
                    </div>

                    {form.watch("kickersEnabled") && (
                        <div className="space-y-2">
                            <Label>Kickers JSON Config</Label>
                            <Textarea
                                className="font-mono text-xs min-h-[150px]"
                                {...form.register("kickers")}
                            />
                            {form.formState.errors.kickers && (
                                <p className="text-sm font-medium text-destructive text-red-500">
                                    {form.formState.errors.kickers.message}
                                </p>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Configuration
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
