const express = require('express');
const path = require("path");
const bodyParser = require("body-parser");
const Git = require("nodegit");
const fs = require('fs');
const rmraf = require('rimraf');
const dns = require('dns');

const PORT = 8080;
const SLAVES = [ '127.0.0.1:8081', '127.0.0.1:8082', '127.0.0.1:8083'];

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
           console.log(fileChunks);
         }

       });
       res.send("Alri.");
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
          console.log('JS file found:', fileName);
          JSFiles.push(fileName);
      }
    }
  }
});

splitFiles = (files, parts) => {
    var rest = files.length % parts, // how much to divide
        restUsed = rest, // to keep track of the division over the elements
        partLength = Math.floor(files.length / parts),
        result = [];
    for (var i = 0; i < files.length; i += partLength) {
        var end = partLength + i,
            add = false;
        if (rest !== 0 && restUsed) { // should add one element for the division
            end++;
            restUsed--; // we've used one division element now
            add = true;
        }
        result.push(files.slice(i, end)); // part of the array
        if (add) {
            i++; // also increment i in the case we added an extra element for division
        }
    }
    return result;
}

masterServer.listen(PORT, (err) => {
  if (err) {
    return console.log('Master server failed to start.', err)
  }
  console.log(`Master server listening on port ${PORT}.`)
});
