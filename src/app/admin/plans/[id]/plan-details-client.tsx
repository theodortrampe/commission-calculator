
"use client";

import Link from "next/link";
import { ArrowLeft, Zap, TrendingUp, Award } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { CompPlanDetail } from "../actions";
import { VersionEditor } from "./version-editor";

interface PlanDetailsClientProps {
    plan: CompPlanDetail;
}

// Parse accelerator tiers from JSON
function getAcceleratorTiers(accelerators: unknown): { minAttainment: number; maxAttainment: number | null; multiplier: number }[] {
    const accels = accelerators as Record<string, unknown>;
    if (!accels?.tiers || !Array.isArray(accels.tiers)) return [];
    return accels.tiers as { minAttainment: number; maxAttainment: number | null; multiplier: number }[];
}

// Parse kicker bonuses from JSON
function getKickerBonuses(kickers: unknown): { attainmentThreshold: number; bonusPercent: number }[] {
    const kicks = kickers as Record<string, unknown>;
    if (!kicks?.bonuses || !Array.isArray(kicks.bonuses)) return [];
    return kicks.bonuses as { attainmentThreshold: number; bonusPercent: number }[];
}

export function PlanDetailsClient({ plan }: PlanDetailsClientProps) {
    if (!plan) return <div>Plan not found</div>;

    const acceleratorTiers = getAcceleratorTiers(plan.accelerators);
    const kickerBonuses = getKickerBonuses(plan.kickers);
    const rampSteps = plan.steps ?? [];

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/plans">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Plans
                    </Button>
                </Link>
            </div>

            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">{plan.name}</h1>
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="capitalize">
                            {plan.frequency.toLowerCase()}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground max-w-2xl">
                        {plan.description || "No description provided."}
                    </p>
                </div>
                <VersionEditor plan={plan} initialSteps={rampSteps} />
            </div>

            {/* Stats Cards */}
            <div className="grid gap-6 md:grid-cols-3 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{plan._count.assignments}</div>
                        <p className="text-xs text-muted-foreground">
                            Sales reps assigned to this plan
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Base Multiplier</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{plan.baseRateMultiplier}x</div>
                        <p className="text-xs text-muted-foreground">
                            Rate multiplier applied to commissions
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Badge variant={plan.acceleratorsEnabled ? "default" : "outline"}>
                                Accelerators {plan.acceleratorsEnabled ? "On" : "Off"}
                            </Badge>
                            <Badge variant={plan.kickersEnabled ? "default" : "outline"}>
                                Kickers {plan.kickersEnabled ? "On" : "Off"}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Configuration Details */}
            <div className="grid gap-6 md:grid-cols-2 mb-8">
                {/* Accelerator Tiers */}
                {plan.acceleratorsEnabled && (
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" />
                                <CardTitle className="text-sm font-medium">Accelerator Tiers</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {acceleratorTiers.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No tiers configured.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs h-8">Attainment Range</TableHead>
                                            <TableHead className="text-xs h-8 text-right">Multiplier</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {acceleratorTiers.map((tier, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="py-2 text-sm">
                                                    {tier.minAttainment}% – {tier.maxAttainment === null ? "∞" : `${tier.maxAttainment}%`}
                                                </TableCell>
                                                <TableCell className="py-2 text-sm text-right font-mono">
                                                    {tier.multiplier}×
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Kicker Bonuses */}
                {plan.kickersEnabled && (
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-purple-500" />
                                <CardTitle className="text-sm font-medium">Kicker Bonuses</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {kickerBonuses.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No kickers configured.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs h-8">Attainment Threshold</TableHead>
                                            <TableHead className="text-xs h-8 text-right">Bonus (% of OTE)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {kickerBonuses.map((kicker, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="py-2 text-sm">
                                                    ≥ {kicker.attainmentThreshold}%
                                                </TableCell>
                                                <TableCell className="py-2 text-sm text-right font-mono">
                                                    {kicker.bonusPercent}%
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Ramp Schedule Summary */}
            {rampSteps.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                            <CardTitle className="text-sm font-medium">Ramp Schedule</CardTitle>
                            <Badge variant="outline" className="text-xs ml-auto">
                                {rampSteps.length} step{rampSteps.length !== 1 ? "s" : ""}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs h-8">Month</TableHead>
                                    <TableHead className="text-xs h-8">Quota %</TableHead>
                                    <TableHead className="text-xs h-8">Draw (% Variable)</TableHead>
                                    <TableHead className="text-xs h-8">Draw Type</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...rampSteps]
                                    .sort((a, b) => a.monthIndex - b.monthIndex)
                                    .map((step) => (
                                        <TableRow key={step.id}>
                                            <TableCell className="py-2 text-sm">
                                                <Badge variant="secondary" className="font-mono text-xs">
                                                    Month {step.monthIndex}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-2 text-sm font-mono">
                                                {(step.quotaPercentage * 100).toFixed(0)}%
                                            </TableCell>
                                            <TableCell className="py-2 text-sm font-mono">
                                                {step.guaranteedDrawPercent ? `${step.guaranteedDrawPercent}%` : "—"}
                                            </TableCell>
                                            <TableCell className="py-2 text-sm">
                                                <Badge variant="outline" className="text-xs">
                                                    {step.drawType === "RECOVERABLE" ? "Recoverable" : "Non-Recoverable"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
