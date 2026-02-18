import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { CommissionMathExplainer } from "../commission-math-explainer";
import { CommissionResult } from "@/lib/utils/commissionLogic";

// Mock the UI components to avoid importing radix/shadcn internals
jest.mock("@/components/ui/card", () => ({
    Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
    CardContent: ({ children }: any) => <div>{children}</div>,
    CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
}));
jest.mock("@/components/ui/badge", () => ({
    Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}));
jest.mock("@/components/ui/alert", () => ({
    Alert: ({ children, ...props }: any) => <div data-testid="alert" {...props}>{children}</div>,
    AlertDescription: ({ children, ...props }: any) => <p {...props}>{children}</p>,
}));
jest.mock("@/components/ui/accordion", () => ({
    Accordion: ({ children }: any) => <div data-testid="accordion">{children}</div>,
    AccordionContent: ({ children }: any) => <div>{children}</div>,
    AccordionItem: ({ children }: any) => <div>{children}</div>,
    AccordionTrigger: ({ children }: any) => <button>{children}</button>,
}));
jest.mock("lucide-react", () => ({
    Info: () => <span data-testid="icon-info" />,
    TrendingUp: () => <span data-testid="icon-trending-up" />,
    Calendar: () => <span data-testid="icon-calendar" />,
    Zap: () => <span data-testid="icon-zap" />,
}));

function makeCommission(overrides: Partial<CommissionResult> = {}): CommissionResult {
    return {
        totalRevenue: 80000,
        attainmentPercent: 80,
        commissionEarned: 48000,
        breakdown: {
            baseRevenue: 80000,
            baseCommission: 48000,
            overageRevenue: 0,
            overageCommission: 0,
            acceleratorMultiplier: 1.0,
            tierApplied: "No accelerator (1x)",
            baseRateMultiplier: 1.0,
            kickerAmount: 0,
            kickersApplied: [],
        },
        periodData: {
            quota: 100000,
            effectiveRate: 0.6,
            planName: "Standard Plan",
            ote: 160000,
            baseSalary: 80000,
        },
        ...overrides,
    };
}

describe("CommissionMathExplainer", () => {
    it("renders standard quota (no ramp, no proration)", () => {
        render(<CommissionMathExplainer commission={makeCommission()} />);

        expect(screen.getByText("Effective Quota")).toBeInTheDocument();
        expect(screen.getByText("$100,000")).toBeInTheDocument();
        expect(screen.getByText(/Full quota with no ramp or proration adjustments/)).toBeInTheDocument();
        // No ramp or proration badges
        expect(screen.queryByText(/Ramp Month/)).not.toBeInTheDocument();
    });

    it("shows ramp badge and alert when ramped", () => {
        const commission = makeCommission({
            ramp: {
                isActive: true,
                monthIndex: 2,
                originalQuota: 100000,
                rampedQuotaPreProration: 50000,
                guaranteedDrawPercent: 0,
                guaranteedDrawAmount: 0,
                drawTopUp: 0,
            },
            periodData: {
                quota: 50000,
                effectiveRate: 0.6,
                planName: "Standard Plan",
                ote: 160000,
                baseSalary: 80000,
            },
        });

        render(<CommissionMathExplainer commission={commission} />);

        expect(screen.getByText(/Ramp Month 2/)).toBeInTheDocument();
        expect(screen.getByText(/Ramp Period Active/)).toBeInTheDocument();
    });

    it("shows proration badge when prorated", () => {
        const commission = makeCommission({
            proration: {
                activeDays: 20,
                totalDays: 30,
                factor: 0.6667,
            },
            periodData: {
                quota: 66670,
                effectiveRate: 0.6,
                planName: "Standard Plan",
                ote: 160000,
                baseSalary: 80000,
            },
        });

        render(<CommissionMathExplainer commission={commission} />);

        expect(screen.getByText(/20 of 30 days/)).toBeInTheDocument();
        // Should show the math accordion since prorated
        expect(screen.getByText(/How was this calculated/)).toBeInTheDocument();
    });

    it("shows both ramp and proration badges when both active", () => {
        const commission = makeCommission({
            ramp: {
                isActive: true,
                monthIndex: 1,
                originalQuota: 100000,
                rampedQuotaPreProration: 50000,
                guaranteedDrawPercent: 0,
                guaranteedDrawAmount: 0,
                drawTopUp: 0,
            },
            proration: {
                activeDays: 15,
                totalDays: 30,
                factor: 0.5,
            },
            periodData: {
                quota: 25000,
                effectiveRate: 0.6,
                planName: "Standard Plan",
                ote: 160000,
                baseSalary: 80000,
            },
        });

        render(<CommissionMathExplainer commission={commission} />);

        expect(screen.getByText(/Ramp Month 1/)).toBeInTheDocument();
        expect(screen.getByText(/15 of 30 days/)).toBeInTheDocument();
        expect(screen.getByText(/How was this calculated/)).toBeInTheDocument();
    });

    it("shows draw top-up earnings breakdown when draw is active", () => {
        const commission = makeCommission({
            commissionEarned: 30000,
            ramp: {
                isActive: true,
                monthIndex: 1,
                originalQuota: 100000,
                rampedQuotaPreProration: 50000,
                guaranteedDrawPercent: 80,
                guaranteedDrawAmount: 40000,
                drawTopUp: 10000,
            },
        });

        render(<CommissionMathExplainer commission={commission} />);

        expect(screen.getByText("Earnings Breakdown")).toBeInTheDocument();
        expect(screen.getByText("Guaranteed Draw Active")).toBeInTheDocument();
        expect(screen.getByText(/draw top-up has been applied/)).toBeInTheDocument();
    });

    it("hides draw section when no draw top-up", () => {
        const commission = makeCommission({
            ramp: {
                isActive: true,
                monthIndex: 1,
                originalQuota: 100000,
                rampedQuotaPreProration: 50000,
                guaranteedDrawPercent: 0,
                guaranteedDrawAmount: 0,
                drawTopUp: 0,
            },
        });

        render(<CommissionMathExplainer commission={commission} />);

        expect(screen.queryByText("Earnings Breakdown")).not.toBeInTheDocument();
        expect(screen.queryByText("Guaranteed Draw Active")).not.toBeInTheDocument();
    });

    it("renders compensation details correctly", () => {
        render(<CommissionMathExplainer commission={makeCommission()} />);

        expect(screen.getByText("Effective Commission Rate")).toBeInTheDocument();
        expect(screen.getByText("60.00%")).toBeInTheDocument();
        expect(screen.getByText("Standard Plan")).toBeInTheDocument();
    });
});
