/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
const config = {
    clearMocks: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageProvider: 'v8',
    preset: 'ts-jest',
    testMatch: ['**/*.test.ts', '**/*.test.js'], // временно: и TS, и старые JS-заглушки
    moduleFileExtensions: ['ts', 'js', 'json'],
     testPathIgnorePatterns: [
         '/node_modules/',
         '<rootDir>/docs/',
     ],    
};


module.exports = config;
