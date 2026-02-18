import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { AuditLogSheet } from "../audit-log-sheet";
import { CommissionResult } from "@/lib/utils/commissionLogic";

// Mock shadcn UI components
jest.mock("@/components/ui/sheet", () => ({
    Sheet: ({ children, open }: any) => open ? <div data-testid="sheet">{children}</div> : null,
    SheetContent: ({ children }: any) => <div data-testid="sheet-content">{children}</div>,
    SheetHeader: ({ children }: any) => <div>{children}</div>,
    SheetTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    SheetDescription: ({ children }: any) => <p>{children}</p>,
}));
jest.mock("@/components/ui/badge", () => ({
    Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}));
jest.mock("@/components/ui/separator", () => ({
    Separator: (props: any) => <hr {...props} />,
}));
jest.mock("lucide-react", () => ({
    X: () => <span />,
    Calculator: () => <span />,
    Calendar: () => <span />,
    TrendingUp: () => <span />,
    ArrowRight: () => <span />,
}));
jest.mock("date-fns", () => ({
    format: (date: Date, fmt: string) => "Jan 2026",
}));

const mockUser = {
    id: "user-1",
    name: "Jane Doe",
    email: "jane@example.com",
    role: "REP" as const,
    passwordHash: null,
    organizationId: "org-1",
    createdAt: new Date(),
    managerId: null,
    image: null,
    emailVerified: null,
};

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

function makeItem(overrides: any = {}) {
    return {
        user: mockUser,
        commission: makeCommission(),
        existingPayout: null,
        adjustments: [],
        revenueAdjustmentTotal: 0,
        fixedBonusTotal: 0,
        revenueAdjustmentImpact: 0,
        ...overrides,
    };
}

describe("AuditLogSheet", () => {
    const defaultProps = {
        open: true,
        onOpenChange: jest.fn(),
    };

    it("returns null when item is null", () => {
        const { container } = render(
            <AuditLogSheet item={null} {...defaultProps} />
        );
        expect(container.innerHTML).toBe("");
    });

    it("returns null when commission is null", () => {
        const { container } = render(
            <AuditLogSheet item={makeItem({ commission: null })} {...defaultProps} />
        );
        expect(container.innerHTML).toBe("");
    });

    it("renders standard badge when no ramp/proration", () => {
        render(<AuditLogSheet item={makeItem()} {...defaultProps} />);

        expect(screen.getByText("Standard")).toBeInTheDocument();
        expect(screen.getByText(/Audit: Jane Doe/)).toBeInTheDocument();
        expect(screen.getByText("Quota Calculation")).toBeInTheDocument();
        expect(screen.getByText("Revenue")).toBeInTheDocument();
    });

    it("renders ramp info when ramped", () => {
        const item = makeItem({
            commission: makeCommission({
                ramp: {
                    isActive: true,
                    monthIndex: 3,
                    originalQuota: 100000,
                    rampedQuotaPreProration: 75000,
                    guaranteedDrawPercent: 50,
                    guaranteedDrawAmount: 20000,
                    drawTopUp: 0,
                },
                periodData: {
                    quota: 75000,
                    effectiveRate: 0.6,
                    planName: "Standard Plan",
                    ote: 160000,
                    baseSalary: 80000,
                },
            }),
        });

        render(<AuditLogSheet item={item} {...defaultProps} />);

        expect(screen.getByText(/Ramp Month 3/)).toBeInTheDocument();
        expect(screen.getByText("Guaranteed Draw")).toBeInTheDocument();
        expect(screen.getByText(/Commission exceeded guarantee/)).toBeInTheDocument();
    });

    it("renders draw top-up when active", () => {
        const item = makeItem({
            commission: makeCommission({
                ramp: {
                    isActive: true,
                    monthIndex: 1,
                    originalQuota: 100000,
                    rampedQuotaPreProration: 50000,
                    guaranteedDrawPercent: 80,
                    guaranteedDrawAmount: 40000,
                    drawTopUp: 10000,
                },
            }),
        });

        render(<AuditLogSheet item={item} {...defaultProps} />);

        expect(screen.getByText("Guaranteed Draw")).toBeInTheDocument();
        expect(screen.getByText(/Draw Top-Up Applied/)).toBeInTheDocument();
    });

    it("renders proration info when prorated", () => {
        const item = makeItem({
            commission: makeCommission({
                proration: {
                    activeDays: 20,
                    totalDays: 30,
                    factor: 0.6667,
                },
            }),
        });

        render(<AuditLogSheet item={item} {...defaultProps} />);

        expect(screen.getByText(/Prorated.*20\/30 days/)).toBeInTheDocument();
    });

    it("renders overage section when overage revenue > 0", () => {
        const item = makeItem({
            commission: makeCommission({
                breakdown: {
                    baseRevenue: 100000,
                    baseCommission: 60000,
                    overageRevenue: 20000,
                    overageCommission: 18000,
                    acceleratorMultiplier: 1.5,
                    tierApplied: "100-125% tier (1.5x)",
                    baseRateMultiplier: 1.0,
                    kickerAmount: 0,
                    kickersApplied: [],
                },
            }),
        });

        render(<AuditLogSheet item={item} {...defaultProps} />);

        expect(screen.getByText("Overage Revenue")).toBeInTheDocument();
        expect(screen.getByText("Overage Commission")).toBeInTheDocument();
        expect(screen.getByText("Tier Applied")).toBeInTheDocument();
    });

    it("renders kicker section when kicker amount > 0", () => {
        const item = makeItem({
            commission: makeCommission({
                breakdown: {
                    baseRevenue: 100000,
                    baseCommission: 60000,
                    overageRevenue: 0,
                    overageCommission: 0,
                    acceleratorMultiplier: 1.0,
                    tierApplied: "No accelerator (1x)",
                    baseRateMultiplier: 1.0,
                    kickerAmount: 8000,
                    kickersApplied: ["5% at 100%"],
                },
            }),
        });

        render(<AuditLogSheet item={item} {...defaultProps} />);

        expect(screen.getByText("Kicker Bonus")).toBeInTheDocument();
        expect(screen.getByText("Kickers Applied")).toBeInTheDocument();
    });

    it("renders fixed bonus adjustments when present", () => {
        const item = makeItem({ fixedBonusTotal: 5000 });

        render(<AuditLogSheet item={item} {...defaultProps} />);

        expect(screen.getByText("Fixed Bonus Adjustments")).toBeInTheDocument();
        expect(screen.getByText("Adjusted Payout")).toBeInTheDocument();
    });

    it("does not render when sheet is closed", () => {
        const { container } = render(
            <AuditLogSheet item={makeItem()} open={false} onOpenChange={jest.fn()} />
        );
        expect(screen.queryByText("Audit: Jane Doe")).not.toBeInTheDocument();
    });
});
