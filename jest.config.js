export default {
  // [...]
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: './src',
  modulePaths: ['<rootDir>'],
  testRegex: 'spec.ts$',
  transform: {},
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  testTimeout: 60 * 60 * 1000,
};
