const plato = require('plato');
const express = require('express');
const path = require("path");
const fs = require('fs');
const rmraf = require('rimraf');
const multer = require('multer');
const bodyParser = require("body-parser");
const formidable = require('formidable');
const util = require('util');
const md5File = require("md5-file");
const AdmZip = require('adm-zip');
require('console-stamp')(console, { pattern: 'dd/mm/yyyy HH:MM:ss' });

if (process.argv.length <= 2) {
  console.log("Usage: " + __filename + " PORT_NUMBER");
  process.exit(-1);
}

const TMPDIR = './tmp';
const PORT = process.argv[2];

if (!fs.existsSync(TMPDIR)) {
  fs.mkdirSync(TMPDIR);
}

var slaveServer = express();
slaveServer.use(bodyParser.urlencoded({ extended: false }));

slaveServer.post('/analyse', (req, res) => {
    var form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      const hash = md5File.sync(files.JSFilesZip.path);
      //Check if zip file still has integrity using the MD5 checksum supplied with the request
      if (hash === fields.checkSum) {
        const JSFilesZip = new AdmZip(files.JSFilesZip.path);
        const zipName = files.JSFilesZip.name;
        const extractPath = path.join(__dirname, TMPDIR, hash)
        JSFilesZip.extractAllTo(extractPath, true);
        console.log(zipName + " received for analysis. Extracting to " + extractPath);
      }
      res.send("I received the ZIP file suh.")
    });
});

platoAnalysis = () => {
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
}

slaveServer.listen(PORT, (err) => {
  if (err) {
    return console.log('Slave server failed to start.', err)
  }
  console.log(`Slave server listening on port ${PORT}.`)
});
