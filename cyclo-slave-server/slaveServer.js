const plato = require('plato');
const express = require('express');
const path = require("path");

const PORT = 8080;

var slaveServer = express();

/*
var files = [
  './test.js',
];

var outputDir = './reports';
var options = {
  title: 'CS4400 Rest Service Development Task'
};

var callback = (report) => {
  console.log("Once analysis is complete, do something.");
};

plato.inspect(files, outputDir, options, callback);
*/

slaveServer.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});

slaveServer.listen(PORT, (err) => {
  if (err) {
    return console.log('Slave server failed to start.', err)
  }
  console.log(`Slave server listening on port ${PORT}.`)
});
