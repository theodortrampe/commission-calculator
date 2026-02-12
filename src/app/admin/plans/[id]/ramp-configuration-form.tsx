"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Loader2, Plus, Trash2, Save, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { saveRampSteps } from "../actions";

interface RampStepFormValue {
    quotaPercentage: number;
    guaranteedDraw: number;
    drawType: "NON_RECOVERABLE" | "RECOVERABLE";
    disableAccelerators: boolean;
    disableKickers: boolean;
}

interface FormValues {
    steps: RampStepFormValue[];
    globalDisableAccelerators: boolean;
    globalDisableKickers: boolean;
}

interface RampStep {
    id: string;
    monthIndex: number;
    quotaPercentage: number;
    guaranteedDraw: any; // Allow Decimal from Prisma
    drawType: "NON_RECOVERABLE" | "RECOVERABLE";
    disableAccelerators: boolean;
    disableKickers: boolean;
}

interface RampConfigurationFormProps {
    versionId: string;
    initialSteps: RampStep[];
    onSaved?: () => void;
}

export function RampConfigurationForm({ versionId, initialSteps, onSaved }: RampConfigurationFormProps) {
    const [isPending, startTransition] = useTransition();
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Sort initial steps by monthIndex
    const sortedSteps = [...initialSteps].sort((a, b) => a.monthIndex - b.monthIndex);

    // Determine global toggle defaults from existing steps
    const defaultGlobalDisableAccelerators = sortedSteps.length > 0
        ? sortedSteps.every(s => s.disableAccelerators)
        : true;
    const defaultGlobalDisableKickers = sortedSteps.length > 0
        ? sortedSteps.every(s => s.disableKickers)
        : true;

    const form = useForm<FormValues>({
        defaultValues: {
            steps: sortedSteps.map(s => ({
                quotaPercentage: s.quotaPercentage * 100, // Convert from 0.5 to 50 for display
                guaranteedDraw: s.guaranteedDraw ? Number(s.guaranteedDraw) : 0,
                drawType: s.drawType,
                disableAccelerators: s.disableAccelerators,
                disableKickers: s.disableKickers,
            })),
            globalDisableAccelerators: defaultGlobalDisableAccelerators,
            globalDisableKickers: defaultGlobalDisableKickers,
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "steps",
    });

    const watchSteps = form.watch("steps");
    const watchGlobalDisableAccel = form.watch("globalDisableAccelerators");
    const watchGlobalDisableKickers = form.watch("globalDisableKickers");

    const addStep = () => {
        append({
            quotaPercentage: 50,
            guaranteedDraw: 0,
            drawType: "NON_RECOVERABLE",
            disableAccelerators: watchGlobalDisableAccel,
            disableKickers: watchGlobalDisableKickers,
        });
    };

    const onSubmit = (values: FormValues) => {
        setSaveSuccess(false);
        startTransition(async () => {
            const steps = values.steps.map((step, index) => ({
                monthIndex: index + 1,
                quotaPercentage: step.quotaPercentage / 100, // Convert back to decimal (50 → 0.5)
                guaranteedDraw: step.guaranteedDraw || null,
                drawType: step.drawType as "NON_RECOVERABLE" | "RECOVERABLE",
                disableAccelerators: values.globalDisableAccelerators,
                disableKickers: values.globalDisableKickers,
            }));

            const result = await saveRampSteps(versionId, steps);

            if (result.success) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
                onSaved?.();
            } else {
                alert(result.error || "Failed to save ramp steps");
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Ramp Schedule</CardTitle>
                        <CardDescription>
                            Configure quota ramp-up steps for new hires. Each step defines quota reduction and optional guaranteed draws.
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                        {fields.length} step{fields.length !== 1 ? "s" : ""}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Global Toggles */}
                    <div className="space-y-3">
                        <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <Label className="text-sm">Disable Accelerators during ramp</Label>
                                <p className="text-[0.75rem] text-muted-foreground">
                                    Prevents overage multipliers from applying during onboarding months.
                                </p>
                            </div>
                            <Switch
                                checked={watchGlobalDisableAccel}
                                onCheckedChange={(checked) => form.setValue("globalDisableAccelerators", checked)}
                            />
                        </div>
                        <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <Label className="text-sm">Disable Kickers during ramp</Label>
                                <p className="text-[0.75rem] text-muted-foreground">
                                    Prevents milestone bonuses from applying during onboarding months.
                                </p>
                            </div>
                            <Switch
                                checked={watchGlobalDisableKickers}
                                onCheckedChange={(checked) => form.setValue("globalDisableKickers", checked)}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Steps */}
                    <div className="space-y-4">
                        {fields.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                                <p className="text-sm">No ramp steps configured.</p>
                                <p className="text-xs mt-1">Add steps to create an onboarding ramp schedule.</p>
                            </div>
                        )}

                        {fields.map((field, index) => {
                            const quotaValue = watchSteps[index]?.quotaPercentage ?? 50;

                            return (
                                <div
                                    key={field.id}
                                    className="relative rounded-lg border p-4 bg-muted/20"
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                            <Badge variant="secondary" className="font-mono text-xs">
                                                Month {index + 1}
                                            </Badge>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => remove(index)}
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        {/* Quota % with Slider */}
                                        <div className="space-y-2">
                                            <Label className="text-xs">Quota %</Label>
                                            <div className="flex items-center gap-3">
                                                <Slider
                                                    value={[quotaValue]}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    onValueChange={(value) => {
                                                        form.setValue(`steps.${index}.quotaPercentage`, value[0]);
                                                    }}
                                                    className="flex-1"
                                                />
                                                <div className="w-16">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        className="h-8 text-xs font-mono text-center"
                                                        {...form.register(`steps.${index}.quotaPercentage`, { valueAsNumber: true })}
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                                Effective quota: {quotaValue}% of base
                                            </p>
                                        </div>

                                        {/* Guaranteed Draw */}
                                        <div className="space-y-2">
                                            <Label className="text-xs">Guaranteed Draw ($)</Label>
                                            <div className="relative">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step={100}
                                                    className="h-8 text-xs font-mono pl-6"
                                                    {...form.register(`steps.${index}.guaranteedDraw`, { valueAsNumber: true })}
                                                />
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                                Minimum payout guarantee for this month
                                            </p>
                                        </div>

                                        {/* Draw Type */}
                                        <div className="space-y-2">
                                            <Label className="text-xs">Draw Type</Label>
                                            <Select
                                                value={watchSteps[index]?.drawType ?? "NON_RECOVERABLE"}
                                                onValueChange={(value) => {
                                                    form.setValue(`steps.${index}.drawType`, value as "NON_RECOVERABLE" | "RECOVERABLE");
                                                }}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="NON_RECOVERABLE">Non-Recoverable</SelectItem>
                                                    <SelectItem value="RECOVERABLE">Recoverable</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[10px] text-muted-foreground">
                                                {watchSteps[index]?.drawType === "RECOVERABLE"
                                                    ? "Draw amount will be deducted from future payouts"
                                                    : "Draw amount is a guaranteed floor, not deducted"
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Add Step + Save */}
                    <div className="flex items-center justify-between pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addStep}
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Step
                        </Button>
                        <div className="flex items-center gap-2">
                            {saveSuccess && (
                                <span className="text-xs text-emerald-600 font-medium">
                                    ✓ Saved
                                </span>
                            )}
                            <Button type="submit" size="sm" disabled={isPending}>
                                {isPending ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-3.5 w-3.5 mr-1" />
                                        Save Ramp Schedule
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
