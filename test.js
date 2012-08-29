var quakeworld = require('./quakeworld');

quakeworld('qw.playground.ru', 27501, 'status', [31], function (err, data) {
  if (err) console.log('ERROR: ', err);
  else console.log('DATA: ',data); 
});
