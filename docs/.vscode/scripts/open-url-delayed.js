const url = process.argv[2];
const delay = parseInt(process.argv[3]) || 0;
setTimeout(() => {
  const { spawn } = require('child_process');
  let cmd;
  if (process.platform === 'win32') cmd = 'start';
  else if (process.platform === 'darwin') cmd = 'open';
  else cmd = 'xdg-open';
  const child = spawn(cmd, [url], { detached: true, stdio: 'ignore' });
  child.unref();
  process.exit(0);
}, delay);