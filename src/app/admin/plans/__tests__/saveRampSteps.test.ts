// Mock Prisma before importing the module under test
const mockDeleteMany = jest.fn();
const mockCreate = jest.fn();
const mockTransaction = jest.fn();

jest.mock("@/lib/prisma", () => ({
    prisma: {
        $transaction: mockTransaction,
        rampStep: {
            deleteMany: mockDeleteMany,
            create: mockCreate,
        },
    },
}));

jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
}));

// Import after mocks are set up
import { saveRampSteps } from "../actions";

describe("saveRampSteps", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // By default, $transaction resolves
        mockTransaction.mockResolvedValue(undefined);
        // Mock return values for the individual operations
        mockDeleteMany.mockReturnValue({ count: 0 });
        mockCreate.mockReturnValue({ id: "new-step" });
    });

    it("calls $transaction with deleteMany and create operations", async () => {
        const steps = [
            {
                monthIndex: 1,
                quotaPercentage: 0.5,
                guaranteedDrawPercent: 80,
                drawType: "NON_RECOVERABLE" as const,
                disableAccelerators: true,
                disableKickers: true,
            },
            {
                monthIndex: 2,
                quotaPercentage: 0.75,
                guaranteedDrawPercent: null,
                drawType: "RECOVERABLE" as const,
                disableAccelerators: false,
                disableKickers: false,
            },
        ];

        const result = await saveRampSteps("plan-123", steps);

        expect(result).toEqual({ success: true });
        expect(mockTransaction).toHaveBeenCalledTimes(1);

        // Transaction should receive an array with deleteMany + N creates
        const transactionArgs = mockTransaction.mock.calls[0][0];
        expect(transactionArgs).toHaveLength(3); // 1 deleteMany + 2 creates
    });

    it("passes correct planId to deleteMany", async () => {
        await saveRampSteps("plan-abc", []);

        expect(mockDeleteMany).toHaveBeenCalledWith({
            where: { planId: "plan-abc" },
        });
    });

    it("passes correct data to each create call", async () => {
        const steps = [
            {
                monthIndex: 1,
                quotaPercentage: 0.5,
                guaranteedDrawPercent: 80,
                drawType: "NON_RECOVERABLE" as const,
                disableAccelerators: true,
                disableKickers: false,
            },
        ];

        await saveRampSteps("plan-xyz", steps);

        expect(mockCreate).toHaveBeenCalledWith({
            data: {
                planId: "plan-xyz",
                monthIndex: 1,
                quotaPercentage: 0.5,
                guaranteedDrawPercent: 80,
                drawType: "NON_RECOVERABLE",
                disableAccelerators: true,
                disableKickers: false,
            },
        });
    });

    it("handles empty steps array (just deleteMany)", async () => {
        const result = await saveRampSteps("plan-empty", []);

        expect(result).toEqual({ success: true });
        expect(mockTransaction).toHaveBeenCalledTimes(1);

        const transactionArgs = mockTransaction.mock.calls[0][0];
        expect(transactionArgs).toHaveLength(1); // Only deleteMany
    });

    it("returns error when Prisma throws", async () => {
        mockTransaction.mockRejectedValue(new Error("DB connection failed"));

        const result = await saveRampSteps("plan-fail", [
            {
                monthIndex: 1,
                quotaPercentage: 0.5,
                guaranteedDrawPercent: null,
                drawType: "NON_RECOVERABLE" as const,
                disableAccelerators: true,
                disableKickers: true,
            },
        ]);

        expect(result).toEqual({
            success: false,
            error: "Failed to save ramp steps",
        });
    });

    it("calls revalidatePath on success", async () => {
        const { revalidatePath } = require("next/cache");

        await saveRampSteps("plan-123", []);

        expect(revalidatePath).toHaveBeenCalledWith("/admin/plans/[id]", "page");
    });

    it("does not call revalidatePath on failure", async () => {
        const { revalidatePath } = require("next/cache");
        revalidatePath.mockClear();
        mockTransaction.mockRejectedValue(new Error("fail"));

        await saveRampSteps("plan-fail", []);

        expect(revalidatePath).not.toHaveBeenCalled();
    });
});
