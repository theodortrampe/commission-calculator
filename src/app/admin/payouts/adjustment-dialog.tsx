"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createUserAdjustment } from "./actions";

interface AdjustmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
    userName: string;
    month: Date;
    onSuccess: () => void;
}

export function AdjustmentDialog({
    open,
    onOpenChange,
    userId,
    userName,
    month,
    onSuccess,
}: AdjustmentDialogProps) {
    const [adjustmentType, setAdjustmentType] = useState<"REVENUE" | "FIXED_BONUS">("FIXED_BONUS");
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount === 0) {
            setError("Please enter a valid amount");
            return;
        }
        if (!reason.trim()) {
            setError("Please provide a reason");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const result = await createUserAdjustment(
            userId,
            month,
            numAmount,
            reason.trim(),
            adjustmentType
        );

        setIsSubmitting(false);

        if (result.success) {
            // Reset form
            setAmount("");
            setReason("");
            setAdjustmentType("FIXED_BONUS");
            onOpenChange(false);
            onSuccess();
        } else {
            setError(result.error || "Failed to create adjustment");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Adjustment</DialogTitle>
                    <DialogDescription>
                        Add an adjustment for <strong>{userName}</strong>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="type">Adjustment Type</Label>
                        <Select
                            value={adjustmentType}
                            onValueChange={(value: "REVENUE" | "FIXED_BONUS") => setAdjustmentType(value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="REVENUE">
                                    Revenue Adjustment
                                    <span className="text-xs text-muted-foreground ml-2">
                                        (Flows through commission calculation)
                                    </span>
                                </SelectItem>
                                <SelectItem value="FIXED_BONUS">
                                    Fixed Bonus
                                    <span className="text-xs text-muted-foreground ml-2">
                                        (Added directly to payout)
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="amount">Amount ($)</Label>
                        <Input
                            id="amount"
                            type="number"
                            placeholder={adjustmentType === "REVENUE" ? "e.g., 5000" : "e.g., 500"}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            {adjustmentType === "REVENUE"
                                ? "Additional booking revenue to include in commission calculation"
                                : "Fixed bonus amount to add to final payout"}
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea
                            id="reason"
                            placeholder="Describe why this adjustment is being made..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                    {error && (
                        <p className="text-sm text-red-500">{error}</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            "Add Adjustment"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
