/**
 * Mock Prisma Client for unit testing
 * Provides typed mocks for all Prisma operations
 */

type MockModel = {
    create: jest.Mock
    findUnique: jest.Mock
    findUniqueOrThrow: jest.Mock
    findFirst: jest.Mock
    findMany: jest.Mock
    update: jest.Mock
    delete: jest.Mock
    deleteMany: jest.Mock
}

type MockPrismaClient = {
    tenant: MockModel
    user: MockModel
    board: MockModel
    task: MockModel
    role: MockModel
    group: MockModel
    refreshToken: MockModel
    $transaction: jest.Mock
}

export const mockPrisma: MockPrismaClient = {
    tenant: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    board: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    task: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    role: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    group: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: MockPrismaClient) => Promise<unknown>) => callback(mockPrisma)),
}

// Mock the prisma import
jest.mock("../../src/db/bootstrap", () => ({
    prisma: mockPrisma,
}))

/**
 * Resets all mock functions
 */
export function resetMocks(): void {
    const models = Object.values(mockPrisma) as (MockModel | jest.Mock)[]
    for (const model of models) {
        if (typeof model === "object" && model !== null) {
            const fns = Object.values(model) as jest.Mock[]
            for (const fn of fns) {
                if (typeof fn === "function" && "mockReset" in fn) {
                    fn.mockReset()
                }
            }
        }
    }
}
