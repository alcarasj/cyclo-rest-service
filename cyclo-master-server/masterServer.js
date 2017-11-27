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
  var repoURL = req.body.repoURL;
  var tokens = repoURL.split('/');
  var repoOwner = tokens[tokens.length - 2];
  var repoName = tokens[tokens.length - 1];
  var userHash = hashIP(req.ip).toString();
  var clonePath = path.join(__dirname, TMPDIR, userHash);
  console.log(clientLog + "Requested analysis of " + repoOwner + "/" + repoName);
  rmraf.sync(clonePath);
  var JSFiles = [];

  console.log(clientLog + "Cloning GitHub repository at " + repoURL + " (this may take a while)...");
  var repo = Git.Clone(repoURL, clonePath).catch((err) => {
    console.error(err);
  }).then((repo) => {
    getJSFiles(clonePath, /\.js$/);
    console.log(clientLog + "Cloning complete! Detected " + JSFiles.length + " JS files for analysis.");
    if (JSFiles.length <= SLAVES.length) {
      //Simple for-loop round-robin to slaves, no need for zips
    } else {
      //Split files into chunks, zip them up, and send as POST multipart/form-data to slaves
      console.log(clientLog + "Dividing JS files amongst slaves...");
      var fileChunks = splitFiles(JSFiles, SLAVES.length);
      SLAVES.forEach((slaveIP, i) => {
        /* SLAVE HEALTH-CHECK
        ping.sys.probe(slaveIP, (isAlive) => {
          var slaveCheck = isAlive ? 'SLAVE-' + i + ' is alive.' : 'SLAVE-' + i + ' is dead.';
          console.log(slaveCheck);
        });
        */
        //Make a zip file for each slave's chunk
        var slaveZip = new AdmZip();
        fileChunks[i].forEach((file) => {
          slaveZip.addLocalFile(file);
        });
        const slaveZipName = repoName + "-SLAVE-" + i + ".zip";
        const pathToSlaveZip = path.join(__dirname, TMPDIR, userHash, ZIPDIR, slaveZipName);
        slaveZip.writeZip(pathToSlaveZip);
        //Send an MD5 checksum with the zip file to preserve integrity
        const hash = md5File.sync(pathToSlaveZip);
        var form = new FormData();
        form.append('JSFilesZip', fs.createReadStream(path.join(pathToSlaveZip)));
        form.append('checkSum', hash);
        form.append('repoName', repoName);
        console.log(clientLog + fileChunks[i].length + " JS files will be sent to SLAVE-" + i + " at " + slaveIP + "\nMD5 Hash: " + hash);
        //Send the POST request to slave
        form.submit('http://' + slaveIP + URL, (err, slaveRes) => {
          if (err) {
            console.error(err);
          } else {
            console.log(clientLog + slaveZipName + " successfully sent to SLAVE-" + i + " for analysis.");
          }
        });
      });
      res.send("Complete?");
    }
  });

  getJSFiles = (startPath, filter) => {
    var files = fs.readdirSync(startPath);
    for (var i = 0; i < files.length; i++) {
      var fileName = path.join(startPath, files[i]);
      var stat = fs.lstatSync(fileName);
      if (stat.isDirectory()) {
        getJSFiles(fileName, filter);
      }
      else if (filter.test(fileName)) {
        JSFiles.push(fileName);
      }
    }
  }
});

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
