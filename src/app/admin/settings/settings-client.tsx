"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    CompPlanSettings,
    AcceleratorTier,
    KickerTier,
    updateCompPlanSettings,
} from "./actions";

interface SettingsClientProps {
    settings: CompPlanSettings;
}

export function SettingsClient({ settings }: SettingsClientProps) {
    const [baseRateMultiplier, setBaseRateMultiplier] = useState(settings.baseRateMultiplier ?? 1.0);
    const [quota, setQuota] = useState(settings.quota ?? 0);
    const [acceleratorsEnabled, setAcceleratorsEnabled] = useState(settings.acceleratorsEnabled);
    const [kickersEnabled, setKickersEnabled] = useState(settings.kickersEnabled);
    const [acceleratorTiers, setAcceleratorTiers] = useState<AcceleratorTier[]>(
        settings.accelerators?.tiers ?? [
            { minAttainment: 100, maxAttainment: 125, multiplier: 1.25 },
        ]
    );
    const [kickerTiers, setKickerTiers] = useState<KickerTier[]>(
        settings.kickers?.tiers ?? [
            { attainmentThreshold: 100, kickerPercent: 5 },
        ]
    );
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Accelerator tier handlers
    const handleAddAcceleratorTier = () => {
        const lastTier = acceleratorTiers[acceleratorTiers.length - 1];
        const newMinAttainment = lastTier?.maxAttainment ?? 100;
        setAcceleratorTiers([
            ...acceleratorTiers,
            {
                minAttainment: newMinAttainment,
                maxAttainment: null,
                multiplier: 1.5,
            },
        ]);
    };

    const handleRemoveAcceleratorTier = (index: number) => {
        if (acceleratorTiers.length <= 1) return;
        setAcceleratorTiers(acceleratorTiers.filter((_, i) => i !== index));
    };

    const handleAcceleratorTierChange = (
        index: number,
        field: keyof AcceleratorTier,
        value: number | null
    ) => {
        const newTiers = [...acceleratorTiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setAcceleratorTiers(newTiers);
    };

    // Kicker tier handlers
    const handleAddKickerTier = () => {
        const lastTier = kickerTiers[kickerTiers.length - 1];
        setKickerTiers([
            ...kickerTiers,
            {
                attainmentThreshold: (lastTier?.attainmentThreshold ?? 100) + 25,
                kickerPercent: 5,
            },
        ]);
    };

    const handleRemoveKickerTier = (index: number) => {
        if (kickerTiers.length <= 1) return;
        setKickerTiers(kickerTiers.filter((_, i) => i !== index));
    };

    const handleKickerTierChange = (
        index: number,
        field: keyof KickerTier,
        value: number
    ) => {
        const newTiers = [...kickerTiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setKickerTiers(newTiers);
    };

    const handleSave = () => {
        setMessage(null);
        startTransition(async () => {
            const result = await updateCompPlanSettings({
                id: settings.id,
                baseRateMultiplier,
                quota,
                acceleratorsEnabled,
                kickersEnabled,
                accelerators: { tiers: acceleratorTiers },
                kickers: { tiers: kickerTiers },
            });

            if (result.success) {
                setMessage({ type: "success", text: "Settings saved successfully" });
            } else {
                setMessage({ type: "error", text: result.error ?? "Failed to save settings" });
            }
        });
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Base Rate Multiplier */}
            <Card>
                <CardHeader>
                    <CardTitle>Base Commission Rate</CardTitle>
                    <CardDescription>
                        Multiplier applied to all commission calculations (1.0 = normal rate)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="baseRate">Base Rate Multiplier</Label>
                            <Input
                                id="baseRate"
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={baseRateMultiplier}
                                onChange={(e) => setBaseRateMultiplier(parseFloat(e.target.value) || 1)}
                                className="font-mono"
                            />
                            <p className="text-sm text-muted-foreground">
                                {baseRateMultiplier === 1 && "Normal rate"}
                                {baseRateMultiplier > 1 && `${((baseRateMultiplier - 1) * 100).toFixed(0)}% bonus`}
                                {baseRateMultiplier < 1 && `${((1 - baseRateMultiplier) * 100).toFixed(0)}% reduced`}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quota">Monthly Quota ($)</Label>
                            <Input
                                id="quota"
                                type="number"
                                min="0"
                                step="1000"
                                value={quota}
                                onChange={(e) => setQuota(parseFloat(e.target.value) || 0)}
                                className="font-mono"
                            />
                            <p className="text-sm text-muted-foreground">
                                Standard monthly quota
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Accelerator Tiers */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Accelerator Tiers</CardTitle>
                            <CardDescription>
                                Commission multipliers for revenue over quota
                            </CardDescription>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={acceleratorsEnabled}
                                onChange={(e) => setAcceleratorsEnabled(e.target.checked)}
                                className="w-4 h-4 rounded"
                            />
                            <span className="text-sm font-medium">Enabled</span>
                        </label>
                    </div>
                </CardHeader>
                <CardContent className={acceleratorsEnabled ? "" : "opacity-50 pointer-events-none"}>
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
                            <div className="col-span-3">Min %</div>
                            <div className="col-span-3">Max %</div>
                            <div className="col-span-3">Multiplier</div>
                            <div className="col-span-3"></div>
                        </div>

                        {/* Tier Rows */}
                        {acceleratorTiers.map((tier, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-3">
                                    <Input
                                        type="number"
                                        min="0"
                                        value={tier.minAttainment}
                                        onChange={(e) =>
                                            handleAcceleratorTierChange(index, "minAttainment", parseInt(e.target.value) || 0)
                                        }
                                        className="font-mono"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="∞"
                                        value={tier.maxAttainment ?? ""}
                                        onChange={(e) =>
                                            handleAcceleratorTierChange(
                                                index,
                                                "maxAttainment",
                                                e.target.value ? parseInt(e.target.value) : null
                                            )
                                        }
                                        className="font-mono"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        value={tier.multiplier}
                                        onChange={(e) =>
                                            handleAcceleratorTierChange(index, "multiplier", parseFloat(e.target.value) || 1)
                                        }
                                        className="font-mono"
                                    />
                                </div>
                                <div className="col-span-3 flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">
                                        {tier.multiplier}x
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveAcceleratorTier(index)}
                                        disabled={acceleratorTiers.length <= 1}
                                        className="h-8 w-8"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        <Button variant="outline" onClick={handleAddAcceleratorTier} className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Tier
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Kicker Tiers */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Kicker Bonuses</CardTitle>
                            <CardDescription>
                                Fixed % of OTE earned at attainment milestones
                            </CardDescription>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={kickersEnabled}
                                onChange={(e) => setKickersEnabled(e.target.checked)}
                                className="w-4 h-4 rounded"
                            />
                            <span className="text-sm font-medium">Enabled</span>
                        </label>
                    </div>
                </CardHeader>
                <CardContent className={kickersEnabled ? "" : "opacity-50 pointer-events-none"}>
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
                            <div className="col-span-5">Attainment Threshold %</div>
                            <div className="col-span-4">Kicker % of OTE</div>
                            <div className="col-span-3"></div>
                        </div>

                        {/* Kicker Rows */}
                        {kickerTiers.map((tier, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-5">
                                    <Input
                                        type="number"
                                        min="0"
                                        value={tier.attainmentThreshold}
                                        onChange={(e) =>
                                            handleKickerTierChange(index, "attainmentThreshold", parseInt(e.target.value) || 0)
                                        }
                                        className="font-mono"
                                    />
                                </div>
                                <div className="col-span-4">
                                    <Input
                                        type="number"
                                        step="0.5"
                                        min="0.1"
                                        value={tier.kickerPercent}
                                        onChange={(e) =>
                                            handleKickerTierChange(index, "kickerPercent", parseFloat(e.target.value) || 1)
                                        }
                                        className="font-mono"
                                    />
                                </div>
                                <div className="col-span-3 flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">
                                        {tier.kickerPercent}%
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveKickerTier(index)}
                                        disabled={kickerTiers.length <= 1}
                                        className="h-8 w-8"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        <Button variant="outline" onClick={handleAddKickerTier} className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Kicker
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Message */}
            {message && (
                <div
                    className={`p-4 rounded-md text-sm ${message.type === "success"
                        ? "bg-muted text-foreground"
                        : "bg-destructive/10 text-destructive"
                        }`}
                >
                    {message.text}
                </div>
            )}

            {/* Save Button */}
            <Button onClick={handleSave} disabled={isPending} className="w-full">
                {isPending ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                    </>
                )}
            </Button>
        </div>
    );
}
