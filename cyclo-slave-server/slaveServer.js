const plato = require('plato');
const escomplex = require('escomplex');
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
const SRCDIR = './src';
const OUTDIR = './reports';
const PORT = process.argv[2];

if (!fs.existsSync(TMPDIR)) {
  fs.mkdirSync(TMPDIR);
}

var slaveServer = express();
slaveServer.use(bodyParser.urlencoded({ extended: false }));

slaveServer.post('/analyse', (req, res) => {
    var form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      const localPath = files.sourceFile.path;
      const hash = md5File.sync(localPath);
      const checkSum = fields.checkSum;
      const repoString = '[' + fields.repoString + ']';
      const slaveID = fields.slaveID;
      const userHash = fields.userHash;
      const repoPath = fields.repoPath;
      const fileID = fields.fileID;
      const slaveLog = '[SLAVE-' + slaveID + '] ';
      if (hash === checkSum) {
        console.log(slaveLog + 'Received ' + repoPath + ' for analysis.');
        try {
          const sourceString = fs.readFileSync(localPath).toString();
          const report = escomplex.analyse(sourceString);
          const cyclomaticComplexity = report.aggregate.cyclomatic;
          res.json({ cyclomaticComplexity, repoPath });
        }
        catch (err) {
          console.log(repoPath + " could not be parsed. (" + err + ")");
          res.json({ cyclomaticComplexity: 0, repoPath });
        }
      }
    });
});

platoAnalysis = (files, outputDir, options, fileName) => {
  var callback = (report) => {
    console.log("Analysis of " + fileName + " complete.");
  };

  plato.inspect(files, outputDir, options, callback);
}

slaveServer.listen(PORT, (err) => {
  if (err) {
    return console.log('Slave server failed to start.', err)
  }
  console.log(`Slave server listening on port ${PORT}.`)
});
