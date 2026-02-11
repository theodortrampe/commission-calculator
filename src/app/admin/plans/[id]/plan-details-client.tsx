
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Copy, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { CompPlanDetail } from "../actions";
import { VersionsList } from "./versions-list";
import { VersionEditor } from "./version-editor";
import { RampConfigurationForm } from "./ramp-configuration-form";

interface PlanDetailsClientProps {
    plan: CompPlanDetail;
}

export function PlanDetailsClient({ plan }: PlanDetailsClientProps) {
    if (!plan) return <div>Plan not found</div>;

    const currentVersion = plan.versions[0]; // Assuming sorted by effectiveDate desc

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
                        <span className="text-muted-foreground text-sm">
                            Created {new Date().toLocaleDateString()}
                        </span>
                    </div>
                    <p className="text-muted-foreground max-w-2xl">
                        {plan.description || "No description provided."}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate Plan
                    </Button>
                    {currentVersion && currentVersion.isDraft && (
                        <VersionEditor version={currentVersion} />
                    )}
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Version
                    </Button>
                </div>
            </div>

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
                        <CardTitle className="text-sm font-medium">Current Version</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">v{currentVersion?.versionNumber || "-"}</div>
                        <p className="text-xs text-muted-foreground">
                            Effective since {currentVersion ? new Date(currentVersion.effectiveFrom).toLocaleDateString() : "N/A"}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Versions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{plan.versions.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Historical versions
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">Version History</h2>
                <VersionsList plan={plan} />
            </div>

            {/* Ramp Schedule Configuration */}
            {currentVersion && (
                <div className="mt-8">
                    <RampConfigurationForm
                        versionId={currentVersion.id}
                        initialSteps={(currentVersion as any).steps ?? []}
                    />
                </div>
            )}
        </div>
    );
}
