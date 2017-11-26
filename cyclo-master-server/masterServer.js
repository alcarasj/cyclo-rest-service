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

const PORT = 8080;
const SLAVES = ['127.0.0.1:8081'];
const URL = '/analyse';
const ZIPDIR = './slaveZips';

if (!fs.existsSync(ZIPDIR)) {
    fs.mkdirSync(ZIPDIR);
}

var masterServer = express();
masterServer.use(bodyParser.urlencoded({ extended: false }));
masterServer.use(bodyParser.json());

masterServer.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});

masterServer.post('/analyse', (req, res) => {
  var repoURL = req.body.repoLink;
  var tokens = repoURL.split('/');
  var repoName = tokens[tokens.length - 1];
  var clonePath = './repos/' + repoName;
  rmraf.sync(clonePath);
  var JSFiles = [];

  //Check for connection to GitHub
  dns.resolve('www.github.com', (err) => {
    if (err) {
      console.log("Unable to make a connection to GitHub.");
    } else {
      console.log("GitHub connection is OK.\nCloning Git repository at " + repoURL + " (this may take a while)...");
      var repo = Git.Clone(repoURL, clonePath).catch((err) => {
        console.log(err);
      }).then((repo) => {
        getJSFiles(clonePath, /\.js$/);
        console.log("Cloning complete!\nDetected " + JSFiles.length + " JS files for analysis.");
        //Divide up the files to send to slaves
        if (JSFiles.length <= SLAVES.length) {
          //simple for-loop round-robin TODO
        } else {
          console.log("Dividing JS files amongst slaves...");
          var fileChunks = splitFiles(JSFiles, SLAVES.length);
          SLAVES.forEach((slaveIP, i) => {
            var slaveZip = new AdmZip();
            fileChunks[i].forEach((file) => {
              slaveZip.addLocalFile(file);
            });
            const pathToSlaveZip = ZIPDIR + "/" + repoName + "-SLAVE-" + i + ".zip";
            slaveZip.writeZip(pathToSlaveZip);
            const hash = md5File.sync(pathToSlaveZip);
            var form = new FormData();
            form.append('forAnalysis', path.join(__dirname, pathToSlaveZip));
            form.append('checksum', hash);
            console.log(fileChunks[i].length + " JS files will be sent to SLAVE-" + i + " at " + slaveIP + "\nMD5 Hash: " + hash);
            form.submit('https://' + slaveIP + URL, (err, slaveRes) => {
              //do something
              res.send('Nigga');
            });
          });
        }
      });
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

masterServer.listen(PORT, (err) => {
  if (err) {
    return console.log('Master server failed to start.', err);
  }
  console.log(`Master server listening on port ${PORT}.`);
});
