const cliProgress = require('cli-progress');
const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
bar.start(100, 0);
bar.update(20)
console.log('ok')
bar.update(30)
console.log('ok')

bar.update(40)
bar.update(50)
console.log('ok')
bar.update(70)
bar.update(80)
console.log('ok')
bar.update(90)
console.log('ok')
bar.update(100)
bar.stop()