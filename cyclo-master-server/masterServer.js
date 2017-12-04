const express = require('express');
const path = require("path");
const bodyParser = require("body-parser");
const Git = require("nodegit");
const fs = require('fs');
const rmraf = require('rimraf');
const dns = require('dns');
const request = require('request');
const FormData = require('form-data');
const AdmZip = require('adm-zip');
const md5File = require("md5-file");
const ping = require('ping');
require('console-stamp')(console, { pattern: 'dd/mm/yyyy HH:MM:ss' });

const PORT = 8080;
const SLAVES = ['127.0.0.1:8081', '127.0.0.1:8082', '127.0.0.1:8083'];
const URL = '/analyse';
const ZIPDIR = './slaveZips';
const TMPDIR = './tmp';

if (!fs.existsSync(TMPDIR)) {
  fs.mkdirSync(TMPDIR);
}

var masterServer = express();
masterServer.use(bodyParser.urlencoded({ extended: false }));
masterServer.use(bodyParser.json());

masterServer.get('/', (req, res) => {
  const clientLog = "[" + req.ip + "] ";
  console.log(clientLog + "Connected to form.");
  res.sendFile(path.join(__dirname + '/index.html'));
});

masterServer.post('/analyse', (req, res) => {
  const clientLog = "[" + req.ip + "] ";
  const repoURL = req.body.repoURL;
  const tokens = repoURL.split('/');
  const repoOwner = tokens[tokens.length - 2];
  const repoName = tokens[tokens.length - 1];
  const userHash = hashIP(req.ip).toString();
  const clonePath = path.join(__dirname, TMPDIR, userHash);
  console.log(clientLog + "Requested analysis of " + repoOwner + "/" + repoName);
  rmraf.sync(clonePath);
  var JSFiles = [];

  console.log(clientLog + "Cloning GitHub repository at " + repoURL + " (this may take a while)...");
  var repo = Git.Clone(repoURL, clonePath).catch((err) => {
    console.error(err);
  }).then((repo) => {
    getJSFiles(clonePath, /\.js$/, userHash);
    console.log(clientLog + "Cloning complete! Detected " + JSFiles.length + " JS files for analysis.");
    var slaveIndex = 0;
    for (var i = 0; i < JSFiles.length; i++) {
      if (slaveIndex >= SLAVES.length) {
        slaveIndex = 0;
      } else {
        const hash = md5File.sync(JSFiles[i].localPath);
        const localPath = JSFiles[i].localPath;
        const repoPath = JSFiles[i].repoPath;
        var form = {
          sourceFile: fs.createReadStream(localPath),
          checkSum: hash,
          repoString: repoOwner + '/' + repoName,
          repoPath: repoPath,
          slaveID: slaveIndex,
          userHash: userHash,
        };
        request.post({ url: 'http://' + SLAVES[slaveIndex] + URL, formData: form }, (err, slaveRes, body) => {
          if (err) {
            return console.error(err);
          } else {
            console.log('Upload successful! Server responded with:', body);
          }
        });
        console.log(clientLog + repoPath + " was sent to " + "SLAVE-" + slaveIndex + " for analysis.");
        slaveIndex++;
     }
  }
  res.send("Complete?");
});

getJSFiles = (startPath, filter, userHash) => {
  var files = fs.readdirSync(startPath);
  for (var i = 0; i < files.length; i++) {
    var fileName = path.join(startPath, files[i]);
    var stat = fs.lstatSync(fileName);
    if (stat.isDirectory()) {
      getJSFiles(fileName, filter, userHash);
    } else if (filter.test(fileName)) {
      var pathInRepo = getRepoPath(fileName, userHash);
      var file = { localPath: fileName, repoPath: pathInRepo };
      JSFiles.push(file);
    }
  }
}
});

getRepoPath = (fileName, userHash) => {
  var tokens = fileName.split(path.sep);
  var directoryTokens = [];
  var i = tokens.length - 1;
  while (tokens[i] !== userHash) {
    directoryTokens.push(tokens[i]);
    i--;
  }
  directoryTokens.reverse();
  return directoryTokens.join(path.sep);
}

splitFiles = (files, parts) => {
  var rest = files.length % parts,
  restUsed = rest,
  partLength = Math.floor(files.length / parts),
  result = [];
  for (var i = 0; i < files.length; i += partLength) {
    var end = partLength + i,
    add = false;
    if (rest !== 0 && restUsed) {
      end++;
      restUsed--;
      add = true;
    }
    result.push(files.slice(i, end));
    if (add) {
      i++;
    }
  }
  return result;
}

hashIP = (ip) => {
  return ip.split("").reduce((a,b) => {
    a = ((a<<5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
}

masterServer.listen(PORT, (err) => {
  if (err) {
    return console.log('Master server failed to start.', err);
  }
  console.log(`Master server listening on port ${PORT}.`);
});
