var dgram = require('dgram');

var UDP_TIMEOUT = 3000,
    CHARSET = {
      0: 46, // .
      1: 35, // #
      2: 35,
      3: 35,
      4: 35,
      5: 46,
      6: 35,
      7: 35,
      8: 35,
      9: 35,
    //10: 32,
      11: 35,
      12: 32, // SPACE
      13: 62, // >
      14: 46,
      15: 46,
      16: 91, // [
      17: 93, // ]
      18: 48, // 0
      19: 49, // 1
      20: 50, // 2
      21: 51, // 3
      22: 52, // 4
      23: 53, // 5
      24: 54, // 6
      25: 55, // 7
      26: 56, // 8
      27: 57, // 9
      28: 46,
      29: 32,
      30: 32,
      31: 32,
      127: 32,
      128: 40, // (
      129: 61, // =
      130: 41, // )
      131: 35,
      132: 35,
      133: 46,
      134: 35,
      135: 35,
      136: 35,
      137: 35,
    //138: 32,
      139: 35,
      140: 32,
      141: 62,
      142: 46,
      143: 46,
    };

var quakeworld = function (address, port, command, args, callback) {
  var data = command;
  if (args) data += ' ' + args.join(' ');

  switch (command) {
    case 'status':
      if (!args) data += ' 0\0';
    break;
  }

  cmd[command].call(this, address, port, data, callback);
};

var cmd = {};

// Takes a status flag as argument, the flag is a bitmap 
// and describes which server information to return.
// 1: Server information (More detailed server information)
// 2: Player information (List of player names including their: id, frags, time, ping, skin and colors)
// 4: Spectator information (Include spectators in the player list)
// 8: Spectator frags (Shows spectator's frag count as S)
// 16: Team information (Include team name in player information)
cmd.status = function (address, port, data, callback) {
  udp_command(address, port, data, function (err, data) {
      if (err) return callback(err);

      var tmp,
          serverinfo,
          players;

      data = quake_chars(data).slice(6, data.length - 2)
                              .toString()
                              .split(/\n/);

      // Server info
      tmp = data.splice(0, 1)[0]
                .split(/\\/);

      serverinfo = {};

      for (i = 0; i < tmp.length - 1; i += 2) {
        // Make the value a Number if it's numeric.
        serverinfo[tmp[i]] = (isNaN(tmp[i + 1])) ? tmp[i + 1] : parseInt(tmp[i + 1], 10);
      }

      // Players
      players = data.map(function (p) {
        // TODO: Test wtf happens when you have " in your name
        var m = p.match(/^(\-?\d+)\s(\-?[S\d]+)\s(\-?\d+)\s(\-?\d+)\s"(.+?)"\s"(.*?)"\s(\d+)\s(\d+)\s"(.*?)"$/);
        // TODO: Figure out which property is what :D
        return {
          id: parseInt(m[1], 10),
          frags: (m[2] === 'S') ? 'S' : parseInt(m[2], 10),
          time: parseInt(m[3], 10),
          ping: parseInt(m[4], 10),
          name: m[5],
          skin: m[6],
          topcolor: parseInt(m[7], 10),
          bottomcolor: parseInt(m[8], 10),
          team: m[9]
        };
      });

      serverinfo.players = players;
      return callback(null, serverinfo);
    });
};

// Ping time in ms
cmd.ping = function (address, port, data, callback) {
  var sendTime = new Date().getTime();

  udp_command(address, port, data, function (err, data) {
    if (err) return callback(err);
    return callback(new Date().getTime() - sendTime);
  });
}

// TODO: Eh.. only returns "m"?
cmd.log = function (address, port, data, callback) {
  udp_command(address, port, data, function (err, data) {
    if (err) return callback(err);
    return callback(null, data.toString());
  });
};

// TODO: Complete this..
cmd.lastscores = function (address, port, data, callback) {
  udp_command(address, port, data, function (err, data) {
    if (err) return callback(err);

    data = quake_chars(data).slice(5, data.length - 2)
                            .toString()
                            .split(/\n/);

    return callback(data);
  });
};

var quake_chars = function (data) {
  for(i = 0; i < data.length; i++) {
    // Nothing wrong with the normal ASCII characters
    if (data[i] > 31 && data[i] < 127) {
      continue;
    }

    // Replace secondary color (red) characters with their normal counterpart.
    // 144 - 159 = same as 16 - 31
    // 160 - 175 = SPACE - /
    // 176 - 185 =  1 - 9
    // 186 - 192 = : - @
    // 193 - 218 = A - Z
    // 219 - 224 = [ - `
    // 225 - 250 = a - z
    // 251 - 254 = | - ~ 
    else if (data[i] > 143 && data[i] < 255) {
      data[i] = data[i] - 128;
    }

    // Match the character towards the hash map
    if (CHARSET.hasOwnProperty(data[i])) {
      data[i] = CHARSET[data[i]];
    }
  }

  return data;
};

var udp_command = function (address, port, data, callback) {
  var buf = new Buffer(4 + data.length),
      client = dgram.createSocket('udp4');

  buf[0] = buf[1] = buf[2] = buf[3] = 255;
  buf.write(data, 4);

  client.send(buf, 0, buf.length, port, address, function () {
    var timeoutId = setTimeout(function () { 
      callback({ error: 'timeout' }); 
      client.removeAllListeners();
    }, UDP_TIMEOUT);

    client.once('message', function (msg, rinfo) {  
      clearTimeout(timeoutId);
      callback(null, msg);  
    });

    client.once('error', function (err) { 
      clearTimeout(timeoutId);    
      callback(err); 
    });
  });
};

module.exports = quakeworld;
