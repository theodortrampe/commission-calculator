"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, Plus, Trash2, Settings2, Zap, TrendingUp, Infinity } from "lucide-react";
import { CompPlan, RampStep } from "@prisma/client";

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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { updateCompPlan, saveRampSteps } from "../actions";
import { RampConfigurationFormInline } from "./ramp-configuration-form";

// ── Accelerator tier schema ──
const acceleratorTierSchema = z.object({
    minAttainment: z.coerce.number<number>().min(0),
    maxAttainment: z.coerce.number<number>().min(0).nullable(),
    uncapped: z.boolean(),
    multiplier: z.coerce.number<number>().min(0).step(0.1),
});

// ── Kicker bonus schema ──
const kickerBonusSchema = z.object({
    attainmentThreshold: z.coerce.number<number>().min(0),
    bonusPercent: z.coerce.number<number>().min(0),
});

const formSchema = z.object({
    baseRateMultiplier: z.coerce.number<number>().min(0),
    acceleratorsEnabled: z.boolean(),
    kickersEnabled: z.boolean(),
    acceleratorTiers: z.array(acceleratorTierSchema),
    kickerBonuses: z.array(kickerBonusSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface PlanConfigDialogProps {
    plan: CompPlan;
    initialSteps: RampStep[];
}

// Parse existing accelerators JSON into tier rows
function parseAcceleratorTiers(accelerators: any): FormValues["acceleratorTiers"] {
    if (!accelerators || !accelerators.tiers || !Array.isArray(accelerators.tiers)) {
        return [{ minAttainment: 0, maxAttainment: 100, uncapped: false, multiplier: 1.0 }];
    }
    return accelerators.tiers.map((t: any) => ({
        minAttainment: t.minAttainment ?? 0,
        maxAttainment: t.maxAttainment ?? null,
        uncapped: t.maxAttainment === null || t.maxAttainment === undefined,
        multiplier: t.multiplier ?? 1.0,
    }));
}

// Parse existing kickers JSON into bonus rows
function parseKickerBonuses(kickers: any): FormValues["kickerBonuses"] {
    if (!kickers || !kickers.bonuses || !Array.isArray(kickers.bonuses)) {
        return [];
    }
    return kickers.bonuses.map((k: any) => ({
        attainmentThreshold: k.attainmentThreshold ?? 0,
        bonusPercent: k.bonusPercent ?? 0,
    }));
}

type TabId = "general" | "accelerators" | "ramp";

export function VersionEditor({ plan, initialSteps }: PlanConfigDialogProps) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>("general");
    const [isPending, startTransition] = useTransition();
    const [rampSaveSuccess, setRampSaveSuccess] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            baseRateMultiplier: plan.baseRateMultiplier,
            acceleratorsEnabled: plan.acceleratorsEnabled,
            kickersEnabled: plan.kickersEnabled,
            acceleratorTiers: parseAcceleratorTiers(plan.accelerators),
            kickerBonuses: parseKickerBonuses(plan.kickers),
        },
    });

    const {
        fields: tierFields,
        append: appendTier,
        remove: removeTier,
    } = useFieldArray({ control: form.control, name: "acceleratorTiers" });

    const {
        fields: kickerFields,
        append: appendKicker,
        remove: removeKicker,
    } = useFieldArray({ control: form.control, name: "kickerBonuses" });

    const watchAccelEnabled = form.watch("acceleratorsEnabled");
    const watchKickersEnabled = form.watch("kickersEnabled");

    function onSubmit(values: FormValues) {
        // Build accelerators JSON from tiers
        const acceleratorsJson = {
            tiers: values.acceleratorTiers.map((t) => ({
                minAttainment: t.minAttainment,
                maxAttainment: t.uncapped ? null : t.maxAttainment,
                multiplier: t.multiplier,
            })),
        };

        // Build kickers JSON from bonuses
        const kickersJson = {
            bonuses: values.kickerBonuses.map((k) => ({
                attainmentThreshold: k.attainmentThreshold,
                bonusPercent: k.bonusPercent,
            })),
        };

        startTransition(async () => {
            await updateCompPlan(plan.id, {
                baseRateMultiplier: values.baseRateMultiplier,
                acceleratorsEnabled: values.acceleratorsEnabled,
                kickersEnabled: values.kickersEnabled,
                accelerators: acceleratorsJson,
                kickers: kickersJson,
            });
            setOpen(false);
        });
    }

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        { id: "general", label: "General", icon: <Settings2 className="h-3.5 w-3.5" /> },
        { id: "accelerators", label: "Accelerators & Kickers", icon: <Zap className="h-3.5 w-3.5" /> },
        { id: "ramp", label: "Ramp Schedule", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    ];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Settings2 className="mr-2 h-4 w-4" />
                    Configure Logic
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configure Plan Logic</DialogTitle>
                    <DialogDescription>
                        Adjust multipliers, accelerators, kickers, and ramp schedule for &quot;{plan.name}&quot;.
                    </DialogDescription>
                </DialogHeader>

                {/* Tab Navigation */}
                <div className="flex gap-1 border-b pb-0 mb-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${activeTab === tab.id
                                    ? "bg-background border border-b-0 border-border text-foreground -mb-px"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ═══════ General Tab ═══════ */}
                {activeTab === "general" && (
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Base Rate Multiplier</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    {...form.register("baseRateMultiplier")}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Scales the effective commission rate. 1.0 = standard rate.
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Configuration
                            </Button>
                        </DialogFooter>
                    </form>
                )}

                {/* ═══════ Accelerators & Kickers Tab ═══════ */}
                {activeTab === "accelerators" && (
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* ── Accelerators Section ── */}
                        <div className="space-y-4">
                            <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <Label>Enable Accelerators</Label>
                                    <div className="text-[0.8rem] text-muted-foreground">
                                        Apply multipliers based on quota attainment tiers.
                                    </div>
                                </div>
                                <Switch
                                    checked={watchAccelEnabled}
                                    onCheckedChange={(checked) => form.setValue("acceleratorsEnabled", checked)}
                                />
                            </div>

                            {watchAccelEnabled && (
                                <div className="space-y-3 pl-1">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">Accelerator Tiers</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => appendTier({
                                                minAttainment: tierFields.length > 0 ? (form.getValues(`acceleratorTiers.${tierFields.length - 1}.maxAttainment`) ?? 150) : 0,
                                                maxAttainment: null,
                                                uncapped: true,
                                                multiplier: 1.0,
                                            })}
                                        >
                                            <Plus className="h-3.5 w-3.5 mr-1" />
                                            Add Tier
                                        </Button>
                                    </div>

                                    {tierFields.length === 0 && (
                                        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                                            <p className="text-sm">No tiers configured. Add a tier to define accelerator brackets.</p>
                                        </div>
                                    )}

                                    {/* Column headers */}
                                    {tierFields.length > 0 && (
                                        <div className="grid grid-cols-[1fr_1fr_1fr_40px] gap-3 px-1">
                                            <Label className="text-xs text-muted-foreground">Min Attainment %</Label>
                                            <Label className="text-xs text-muted-foreground">Max Attainment %</Label>
                                            <Label className="text-xs text-muted-foreground">Multiplier</Label>
                                            <div />
                                        </div>
                                    )}

                                    {tierFields.map((field, index) => {
                                        const isUncapped = form.watch(`acceleratorTiers.${index}.uncapped`);
                                        return (
                                            <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_40px] gap-3 items-center">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="h-9 text-sm"
                                                    {...form.register(`acceleratorTiers.${index}.minAttainment`, { valueAsNumber: true })}
                                                />
                                                <div className="flex items-center gap-2">
                                                    {isUncapped ? (
                                                        <div className="flex items-center gap-1.5 h-9 px-3 rounded-md border bg-muted/50 text-sm text-muted-foreground flex-1">
                                                            <Infinity className="h-3.5 w-3.5" />
                                                            <span>Uncapped</span>
                                                        </div>
                                                    ) : (
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            className="h-9 text-sm"
                                                            {...form.register(`acceleratorTiers.${index}.maxAttainment`, { valueAsNumber: true })}
                                                        />
                                                    )}
                                                    <Switch
                                                        checked={isUncapped}
                                                        onCheckedChange={(checked) => {
                                                            form.setValue(`acceleratorTiers.${index}.uncapped`, checked);
                                                            if (checked) form.setValue(`acceleratorTiers.${index}.maxAttainment`, null);
                                                        }}
                                                        className="scale-75"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        step="0.1"
                                                        min={0}
                                                        className="h-9 text-sm pr-7"
                                                        {...form.register(`acceleratorTiers.${index}.multiplier`, { valueAsNumber: true })}
                                                    />
                                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">×</span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeTier(index)}
                                                    className="h-9 w-9 p-0 text-muted-foreground hover:text-red-500"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* ── Kickers Section ── */}
                        <div className="space-y-4">
                            <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <Label>Enable Kickers</Label>
                                    <div className="text-[0.8rem] text-muted-foreground">
                                        Award bonus payouts at specific attainment milestones.
                                    </div>
                                </div>
                                <Switch
                                    checked={watchKickersEnabled}
                                    onCheckedChange={(checked) => form.setValue("kickersEnabled", checked)}
                                />
                            </div>

                            {watchKickersEnabled && (
                                <div className="space-y-3 pl-1">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">Kicker Bonuses</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => appendKicker({ attainmentThreshold: 100, bonusPercent: 5 })}
                                        >
                                            <Plus className="h-3.5 w-3.5 mr-1" />
                                            Add Kicker
                                        </Button>
                                    </div>

                                    {kickerFields.length === 0 && (
                                        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                                            <p className="text-sm">No kickers configured. Add a kicker to define bonus thresholds.</p>
                                        </div>
                                    )}

                                    {kickerFields.length > 0 && (
                                        <div className="grid grid-cols-[1fr_1fr_40px] gap-3 px-1">
                                            <Label className="text-xs text-muted-foreground">Attainment Threshold %</Label>
                                            <Label className="text-xs text-muted-foreground">Bonus (% of OTE)</Label>
                                            <div />
                                        </div>
                                    )}

                                    {kickerFields.map((field, index) => (
                                        <div key={field.id} className="grid grid-cols-[1fr_1fr_40px] gap-3 items-center">
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="h-9 text-sm pr-7"
                                                    {...form.register(`kickerBonuses.${index}.attainmentThreshold`, { valueAsNumber: true })}
                                                />
                                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    step="0.5"
                                                    min={0}
                                                    className="h-9 text-sm pr-7"
                                                    {...form.register(`kickerBonuses.${index}.bonusPercent`, { valueAsNumber: true })}
                                                />
                                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeKicker(index)}
                                                className="h-9 w-9 p-0 text-muted-foreground hover:text-red-500"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Configuration
                            </Button>
                        </DialogFooter>
                    </form>
                )}

                {/* ═══════ Ramp Schedule Tab ═══════ */}
                {activeTab === "ramp" && (
                    <RampConfigurationFormInline
                        planId={plan.id}
                        initialSteps={initialSteps}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
