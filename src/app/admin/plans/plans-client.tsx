
"use client";

import { Users } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { CompPlanSummary } from "./actions";
import { NewPlanDialog } from "./new-plan-dialog";

interface PlansClientProps {
    plans: CompPlanSummary[];
}

export function PlansClient({ plans }: PlansClientProps) {
    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Compensation Plans</h1>
                    <p className="text-muted-foreground">
                        Manage commission structures and assignments.
                    </p>
                </div>
                <NewPlanDialog />
            </div>

            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">Plan Name</TableHead>
                            <TableHead>Frequency</TableHead>
                            <TableHead className="text-center">Active Assignments</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {plans.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No compensation plans found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            plans.map((plan) => (
                                <TableRow key={plan.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{plan.name}</span>
                                            {plan.description && (
                                                <span className="text-sm text-muted-foreground truncate max-w-[250px]">
                                                    {plan.description}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {plan.frequency.toLowerCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            <span>{plan._count.assignments}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/admin/plans/${plan.id}`}>
                                            <Button variant="outline" size="sm">
                                                View Details
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
