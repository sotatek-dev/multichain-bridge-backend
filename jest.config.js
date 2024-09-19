export default {
  // [...]
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: './src',
  modulePaths: ['<rootDir>'],
  testRegex: 'spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  testTimeout: 60 * 60 * 1000,
};
