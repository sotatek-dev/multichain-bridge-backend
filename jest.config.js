const { pathsToModuleNameMapper } = require('ts-jest');

module.exports = {
  // [...]
  moduleNameMapper: {
    '@config/(.*)': ['<rootDir>/config/$1'],
    '@constants/(.*)': ['<rootDir>/constants/$1'],
    '@models/(.*)': ['<rootDir>/models/$1'],
    '@repo/(.*)': ['<rootDir>/repositories/$1'],
    '@shared/(.*)': ['<rootDir>/shared/$1'],
    '@modules/(.*)': ['<rootDir>/modules/$1'],
    '@interfaces/(.*)': ['<rootDir>/interfaces/$1'],
    '@core/(.*)': ['<rootDir>/core/$1'],
  },
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
