module.exports = {
  // [...]
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: './',
  modulePaths: ['<rootDir>'],
  testRegex: 'spec.ts$',
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  testTimeout: 60 * 60 * 1000,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.(mt|t|cj|j)s$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  setupFiles: ['./test-setup.js'],
};
