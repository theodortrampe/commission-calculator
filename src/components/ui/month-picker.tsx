"use client";

import * as React from "react";
import { format, subMonths } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface MonthPickerProps {
    value: Date;
    onChange: (date: Date) => void;
    availableMonths?: Date[];
}

export function MonthPicker({ value, onChange, availableMonths }: MonthPickerProps) {
    const [open, setOpen] = React.useState(false);

    // Generate last 12 months as options if no available months provided
    const months = availableMonths ?? Array.from({ length: 12 }, (_, i) => {
        const date = subMonths(new Date(), i);
        return new Date(date.getFullYear(), date.getMonth(), 1);
    });

    const handleSelect = (month: Date) => {
        onChange(month);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !value && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value ? format(value, "MMMM yyyy") : <span>Select month</span>}
                    <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start">
                <div className="max-h-[300px] overflow-y-auto">
                    {months.map((month) => {
                        const isSelected =
                            value.getFullYear() === month.getFullYear() &&
                            value.getMonth() === month.getMonth();
                        return (
                            <button
                                key={month.toISOString()}
                                onClick={() => handleSelect(month)}
                                className={cn(
                                    "w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                                    isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                                )}
                            >
                                {format(month, "MMMM yyyy")}
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
