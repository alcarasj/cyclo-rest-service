const express = require('express');
const path = require("path");
const bodyParser = require("body-parser");
const Git = require("nodegit");
const fs = require('fs');
const rmraf = require('rimraf');
const dns = require('dns');
const request = require('request');

const PORT = 8080;
const SLAVES = ['http://127.0.0.1:8081'];
const SLAVE_ENDPOINT = '/analyse';

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
        console.log("Cloning complete!\nRetrieving JS files for analysis...");
        getJSFiles(clonePath, /\.js$/);

        //Divide up the files to send to slaves
        if (JSFiles.length <= SLAVES.length) {
          //simple for-loop round-robin
        } else {
          var fileChunks = splitFiles(JSFiles, SLAVES.length);
          SLAVES.forEach((slave, index) => {
            var formData = { attachments: fileChunks[index] };
            console.log(formData);
            request.post({url: slave + SLAVE_ENDPOINT, formData: formData}, (err, res, body) => {
              if (err) {
                return console.error('Upload failed:', err);
              }
              console.log('Upload successful! Server responded with:', body);
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
        JSFiles.push(fs.createReadStream(fileName));
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
