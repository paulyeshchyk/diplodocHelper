const ms = parseInt(process.argv[2]) * 1000;
require('timers/promises').setTimeout(ms);