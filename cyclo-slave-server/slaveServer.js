const plato = require('plato');
const express = require('express');
const path = require("path");
const multer = require('multer');
const bodyParser = require("body-parser");
const formidable = require('formidable');
const util = require('util');

if (process.argv.length <= 2) {
  console.log("Usage: " + __filename + " PORT_NUMBER");
  process.exit(-1);
}

const PORT = process.argv[2];

var slaveServer = express();
slaveServer.use(bodyParser.urlencoded({ extended: false }));

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
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
      console.log(util.inspect({fields: fields, files: files}));
      res.send(util.inspect({fields: fields, files: files}));
    });
});

slaveServer.listen(PORT, (err) => {
  if (err) {
    return console.log('Slave server failed to start.', err)
  }
  console.log(`Slave server listening on port ${PORT}.`)
});
