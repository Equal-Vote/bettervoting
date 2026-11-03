module.exports = {
    setupFiles: [
      "./src/test/setupTests.ts"
    ],
    transform: {
      '^.+\\.[tj]sx?$': [
        'ts-jest',
        {
          isolatedModules: true,
        }
      ],
    },
    transformIgnorePatterns: [
      'node_modules/(?!(sanitize-html|htmlparser2|domhandler|domutils|domelementtype|entities|dom-serializer)/)'
    ],
    testPathIgnorePatterns : [
        "/build/*" 
      ],
    modulePathIgnorePatterns :[
        "<rootDir>/build"
    ]
  };
