const express = require('express');
const path = require("path");
const bodyParser = require("body-parser");
const Git = require("nodegit");
const fs = require('fs');
const rmraf = require('rimraf');
const dns = require('dns');

const PORT = 8080;

var masterServer = express();
masterServer.use(bodyParser.urlencoded({ extended: false }));
masterServer.use(bodyParser.json());
var JSFiles = [];

masterServer.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});

masterServer.post('/analyse',(req, res) => {
  var repoURL = req.body.repoLink;
  var tokens = repoURL.split('/');
  var repoName = tokens[tokens.length - 1];
  var clonePath = './repos/' + repoName;
  rmraf.sync(clonePath);

  //Check for connection to GitHub
  dns.resolve('www.github.com', (err) => {
    if (err) {
       console.log("Unable to make a connection to GitHub.");
    } else {
       console.log("GitHub connection is OK.");
       console.log("Cloning Git repository at " + repoURL + "...");

       var repo = Git.Clone(repoURL, clonePath).catch((err) => {
         console.log(err);
       }).then((repo) => {
         console.log("Sup");
         getJSFiles(clonePath, /\.js$/);
       });
       res.send("Alri.");
    }
  });
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
        console.log('JS file found:', files[i]);
        JSFiles.push(fileName);
    }
  }
}

masterServer.listen(PORT, (err) => {
  if (err) {
    return console.log('Master server failed to start.', err)
  }
  console.log(`Master server listening on port ${PORT}.`)
});
