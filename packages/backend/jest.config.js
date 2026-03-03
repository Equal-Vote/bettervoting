module.exports = {
    setupFiles: [
      "./src/test/setupTests.ts"
    ],
    transform: {
      '^.+\\.ts?$': [
        'ts-jest',
        {}
      ],
    },
    testPathIgnorePatterns : [
        "/build/*" 
      ],
    modulePathIgnorePatterns :[
        "<rootDir>/build"
    ]
  };
