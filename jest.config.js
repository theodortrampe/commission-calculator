/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    projects: [
        // Node environment (server actions, utilities)
        {
            displayName: "node",
            preset: "ts-jest",
            testEnvironment: "node",
            roots: ["<rootDir>/src"],
            testMatch: ["**/__tests__/**/*.test.ts"],
            moduleNameMapper: {
                "^@/(.*)$": "<rootDir>/src/$1",
            },
        },
        // jsdom environment (React component tests)
        {
            displayName: "jsdom",
            preset: "ts-jest",
            testEnvironment: "jest-environment-jsdom",
            roots: ["<rootDir>/src"],
            testMatch: ["**/__tests__/**/*.test.tsx"],
            moduleNameMapper: {
                "^@/(.*)$": "<rootDir>/src/$1",
            },
            setupFilesAfterEnv: ["@testing-library/jest-dom"],
            transform: {
                "^.+\\.tsx?$": [
                    "ts-jest",
                    {
                        tsconfig: "tsconfig.json",
                        jsx: "react-jsx",
                    },
                ],
            },
        },
    ],
    collectCoverageFrom: ["src/**/*.ts", "src/**/*.tsx", "!src/**/*.d.ts"],
};
