const [containerName, port, imageName] = process.argv.slice(2);
const { execSync } = require('child_process');
try {
  try { execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' }); } catch (e) { }
  execSync(`docker run --rm -d -p ${port}:${port} --name ${containerName} ${imageName}`, { stdio: 'inherit' });
} catch (err) {
  process.exit(1);
}