
"use client";

import { format } from "date-fns";
import { Check, Clock, AlertTriangle } from "lucide-react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CompPlanDetail } from "../actions";

interface VersionsListProps {
    plan: CompPlanDetail;
}

export function VersionsList({ plan }: VersionsListProps) {
    if (!plan) return null;

    const now = new Date();

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Ver.</TableHead>
                        <TableHead>Effective From</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Base Multiplier</TableHead>
                        <TableHead className="text-center">Accelerators</TableHead>
                        <TableHead className="text-center">Kickers</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {plan.versions.map((version) => {
                        const effectiveDate = new Date(version.effectiveFrom);
                        const isActive = effectiveDate <= now;
                        // Assuming versions are ordered by date DESC, the first one <= now is "Current"
                        // But logic might be more complex if we have future versions scheduled.
                        // For simplicity, let's just show effective date.

                        return (
                            <TableRow key={version.id}>
                                <TableCell className="font-medium">v{version.versionNumber}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        {format(effectiveDate, "MMM d, yyyy")}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {version.isDraft ? (
                                        <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">
                                            Draft
                                        </Badge>
                                    ) : isActive ? (
                                        <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                                            Active
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-blue-600 border-blue-500/30 bg-blue-500/10">
                                            Scheduled
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {version.baseRateMultiplier}x
                                </TableCell>
                                <TableCell className="text-center">
                                    {version.acceleratorsEnabled ? (
                                        <Check className="h-4 w-4 mx-auto text-emerald-600" />
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    {version.kickersEnabled ? (
                                        <Check className="h-4 w-4 mx-auto text-emerald-600" />
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
