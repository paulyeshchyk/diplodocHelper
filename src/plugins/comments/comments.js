const path = require('path');
const { runGeneration } = require('./comments.injector');

module.exports = { runGeneration };

if (require.main === module) {
  const buildDir = path.resolve(process.argv[2] || './build');
  runGeneration(buildDir);
}