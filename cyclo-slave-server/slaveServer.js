const plato = require('plato');
const express = require('express');
const path = require("path");
const multer = require('multer');
const bodyParser = require("body-parser");

const PORT = 8081;

var slaveServer = express();
slaveServer.use(bodyParser.urlencoded({ extended: false }));
slaveServer.use(bodyParser.json());

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

slaveServer.post('/analyse', (req, res) => {
  console.log(req.body);
  res.send('Story bud?');
});

slaveServer.listen(PORT, (err) => {
  if (err) {
    return console.log('Slave server failed to start.', err)
  }
  console.log(`Slave server listening on port ${PORT}.`)
});
