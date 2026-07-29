module.exports = {
    setupFiles: [
      "./src/test/setupTests.ts"
    ],
    transform: {
      '^.+\\.ts?$': [
        'ts-jest',
        {
          isolatedModules: true,
        }
      ],
    },
    testPathIgnorePatterns : [
        "/build/*" 
      ],
    modulePathIgnorePatterns :[
        "<rootDir>/build"
    ]
  };
