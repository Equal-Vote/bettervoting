module.exports = {
    transform: {
        '^.+\\.[tj]sx?$': [
            'ts-jest',
            {
                tsconfig: './tsconfig.test.json',
            },
        ],
    },
    moduleNameMapper: {
        '^~/(.*)$': '<rootDir>/src/$1',
    },
    testPathIgnorePatterns: ['/node_modules/', '/build/'],
    testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};
