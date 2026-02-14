
"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { Users, User, Trash2, Calendar, Shield, Lock, CalendarOff, AlertTriangle } from "lucide-react";

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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { AssignmentWithDetails, deleteAssignment, endAssignment } from "./actions";
import { NewAssignmentDialog } from "./new-assignment-dialog";
import { EditAssignmentDialog } from "./edit-assignment-dialog";
import { Role } from "@prisma/client";

interface AssignmentsClientProps {
    assignments: AssignmentWithDetails[];
    users: { id: string; name: string | null; role: Role }[];
    plans: { id: string; name: string }[];
}

export function AssignmentsClient({ assignments, users, plans }: AssignmentsClientProps) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this assignment?")) {
            startTransition(async () => {
                await deleteAssignment(id);
            });
        }
    };

    const handleEnd = (id: string) => {
        if (confirm("End this assignment at the end of the current month?")) {
            startTransition(async () => {
                await endAssignment(id);
            });
        }
    };

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Plan Assignments</h1>
                    <p className="text-muted-foreground">
                        Assign compensation plans to users or roles.
                    </p>
                </div>
                <NewAssignmentDialog users={users} plans={plans} />
            </div>

            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">Assignee</TableHead>
                            <TableHead>Compensation Plan</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assignments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No assignments found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            assignments.map((assignment) => {
                                const now = new Date();
                                const startDate = new Date(assignment.startDate);
                                const endDate = assignment.endDate ? new Date(assignment.endDate) : null;

                                let status = "Active";
                                let statusColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";

                                if (startDate > now) {
                                    status = "Future";
                                    statusColor = "bg-blue-500/10 text-blue-600 border-blue-500/20";
                                } else if (endDate && endDate < now) {
                                    status = "Expired";
                                    statusColor = "bg-gray-500/10 text-gray-600 border-gray-500/20";
                                }

                                return (
                                    <TableRow key={assignment.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {assignment.user ? (
                                                    <>
                                                        <User className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium">{assignment.user.name}</span>
                                                    </>
                                                ) : assignment.role ? (
                                                    <>
                                                        <Shield className="h-4 w-4 text-purple-500" />
                                                        <span className="font-medium">All {assignment.role}s</span>
                                                    </>
                                                ) : (
                                                    <span className="text-muted-foreground">Unknown</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-normal">
                                                {assignment.plan.name}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                <Calendar className="mr-2 h-4 w-4" />
                                                {format(startDate, "MMM d, yyyy")}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {endDate ? (
                                                <div className="flex items-center text-sm text-muted-foreground">
                                                    <Calendar className="mr-2 h-4 w-4" />
                                                    {format(endDate, "MMM d, yyyy")}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Badge variant="outline" className={statusColor}>
                                                    {status}
                                                </Badge>
                                                {assignment.isOverlapping && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Overlapping with another assignment for this user</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {assignment.isLocked ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="inline-flex items-center gap-1.5 text-amber-600 cursor-default">
                                                                <Lock className="h-4 w-4" />
                                                                <span className="text-xs font-medium">Locked</span>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Payouts have been published for this period</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <div className="flex justify-end gap-1">
                                                    <EditAssignmentDialog
                                                        assignment={assignment}
                                                        users={users}
                                                        plans={plans}
                                                    />
                                                    {!assignment.endDate && status === "Active" && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleEnd(assignment.id)}
                                                                        disabled={isPending}
                                                                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                                    >
                                                                        <CalendarOff className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>End assignment at end of this month</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(assignment.id)}
                                                        disabled={isPending}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
