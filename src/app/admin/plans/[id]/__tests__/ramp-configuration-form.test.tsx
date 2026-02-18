import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import {
    RampConfigurationForm,
    RampConfigurationFormInline,
} from "../ramp-configuration-form";

// Mock saveRampSteps server action
jest.mock("../../actions", () => ({
    saveRampSteps: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock shadcn UI components
jest.mock("@/components/ui/card", () => ({
    Card: ({ children }: any) => <div data-testid="card">{children}</div>,
    CardContent: ({ children }: any) => <div>{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
    CardDescription: ({ children }: any) => <p>{children}</p>,
}));
jest.mock("@/components/ui/badge", () => ({
    Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}));
jest.mock("@/components/ui/button", () => ({
    Button: ({ children, onClick, type, disabled, ...props }: any) => (
        <button onClick={onClick} type={type} disabled={disabled} {...props}>
            {children}
        </button>
    ),
}));
jest.mock("@/components/ui/input", () => {
    const React = require("react");
    return {
        Input: React.forwardRef(({ ...props }: any, ref: any) => (
            <input ref={ref} {...props} />
        )),
    };
});
jest.mock("@/components/ui/label", () => ({
    Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));
jest.mock("@/components/ui/switch", () => ({
    Switch: ({ checked, onCheckedChange, ...props }: any) => (
        <button
            role="switch"
            aria-checked={checked}
            onClick={() => onCheckedChange?.(!checked)}
            data-testid="switch"
            {...props}
        >
            {checked ? "On" : "Off"}
        </button>
    ),
}));
jest.mock("@/components/ui/slider", () => ({
    Slider: ({ value, onValueChange, ...props }: any) => (
        <input
            type="range"
            value={value?.[0]}
            onChange={(e) => onValueChange?.([Number(e.target.value)])}
            data-testid="slider"
            {...props}
        />
    ),
}));
jest.mock("@/components/ui/select", () => ({
    Select: ({ children, value, onValueChange }: any) => (
        <div data-testid="select">{children}</div>
    ),
    SelectContent: ({ children }: any) => <div>{children}</div>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
    SelectTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    SelectValue: () => <span />,
}));
jest.mock("@/components/ui/separator", () => ({
    Separator: () => <hr />,
}));
jest.mock("lucide-react", () => ({
    Loader2: () => <span />,
    Plus: () => <span />,
    Trash2: () => <span />,
    Save: () => <span />,
    GripVertical: () => <span />,
}));

const mockSteps = [
    {
        id: "step-1",
        monthIndex: 1,
        quotaPercentage: 0.5,
        guaranteedDrawPercent: 80,
        drawType: "NON_RECOVERABLE" as const,
        disableAccelerators: true,
        disableKickers: true,
    },
    {
        id: "step-2",
        monthIndex: 2,
        quotaPercentage: 0.75,
        guaranteedDrawPercent: 50,
        drawType: "NON_RECOVERABLE" as const,
        disableAccelerators: true,
        disableKickers: true,
    },
];

describe("RampConfigurationForm", () => {
    it("renders empty state when no steps", () => {
        render(
            <RampConfigurationForm planId="plan-1" initialSteps={[]} />
        );

        expect(screen.getByText("No ramp steps configured.")).toBeInTheDocument();
        expect(screen.getByText("Ramp Schedule")).toBeInTheDocument();
    });

    it("renders steps with correct month badges", () => {
        render(
            <RampConfigurationForm planId="plan-1" initialSteps={mockSteps} />
        );

        expect(screen.getByText("Month 1")).toBeInTheDocument();
        expect(screen.getByText("Month 2")).toBeInTheDocument();
    });

    it("shows step count badge", () => {
        render(
            <RampConfigurationForm planId="plan-1" initialSteps={mockSteps} />
        );

        expect(screen.getByText("2 steps")).toBeInTheDocument();
    });

    it("renders singular step count", () => {
        render(
            <RampConfigurationForm planId="plan-1" initialSteps={[mockSteps[0]]} />
        );

        expect(screen.getByText("1 step")).toBeInTheDocument();
    });

    it("adds a step when Add Step is clicked", () => {
        render(
            <RampConfigurationForm planId="plan-1" initialSteps={[]} />
        );

        expect(screen.queryByText("Month 1")).not.toBeInTheDocument();

        fireEvent.click(screen.getByText("Add Step"));

        expect(screen.getByText("Month 1")).toBeInTheDocument();
    });

    it("removes a step when trash icon is clicked", () => {
        render(
            <RampConfigurationForm planId="plan-1" initialSteps={[mockSteps[0]]} />
        );

        expect(screen.getByText("Month 1")).toBeInTheDocument();

        // Find the remove button (trash icon wrapped in a button)
        const removeButtons = screen.getAllByRole("button");
        const trashButton = removeButtons.find(
            (btn) => btn.className?.includes("hover:text-red-500") || btn.textContent === ""
        );
        if (trashButton) {
            fireEvent.click(trashButton);
            expect(screen.queryByText("Month 1")).not.toBeInTheDocument();
        }
    });

    it("renders global toggle switches", () => {
        render(
            <RampConfigurationForm planId="plan-1" initialSteps={mockSteps} />
        );

        expect(screen.getByText("Disable Accelerators during ramp")).toBeInTheDocument();
        expect(screen.getByText("Disable Kickers during ramp")).toBeInTheDocument();
    });

    it("renders Save Ramp Schedule button", () => {
        render(
            <RampConfigurationForm planId="plan-1" initialSteps={mockSteps} />
        );

        expect(screen.getByText("Save Ramp Schedule")).toBeInTheDocument();
    });
});

describe("RampConfigurationFormInline", () => {
    it("renders inline variant without card wrapper", () => {
        render(
            <RampConfigurationFormInline planId="plan-1" initialSteps={mockSteps} />
        );

        expect(screen.getByText("Ramp Schedule")).toBeInTheDocument();
        expect(screen.getByText("Month 1")).toBeInTheDocument();
        expect(screen.getByText("Month 2")).toBeInTheDocument();
        // Should NOT have the card wrapper's step count badge
        expect(screen.queryByText("2 steps")).not.toBeInTheDocument();
    });
});
