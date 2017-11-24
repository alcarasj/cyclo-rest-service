const express = require('express');
const path = require("path");
const bodyParser = require("body-parser");
const Git = require("nodegit");
const promisify = require("promisify-node");
const fse = promisify(require("fs-extra"));
const dns = require('dns');

const PORT = 8080;
const REPODIR = './repo';

var masterServer = express();
masterServer.use(bodyParser.urlencoded({ extended: false }));
masterServer.use(bodyParser.json());

masterServer.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});

masterServer.post('/analyse',(req, res) => {
  var repoLink = req.body.repoLink
  //Check for connection to GitHub
  dns.resolve('www.github.com', (err) => {
    if (err) {
       console.log("Unable to make a connection to GitHub.");
    } else {
       console.log("GitHub connection is OK.\nCloning Git repository at " + repoLink + " (this may take awhile)...");
    }
  });
  // Clone the repository into the `./repo` folder, get all JS files and distribute to slave servers.
  fse.remove(REPODIR).then(() => {
    Git.Clone(repoLink, REPODIR)
    .done(() => {
      console.log("Cloning complete.\nRetrieving all JS files in repository for analysis...");








   })
   .catch((err) => console.log(err));
  });
  res.send("Alri.");
});

masterServer.listen(PORT, (err) => {
  if (err) {
    return console.log('Master server failed to start.', err)
  }
  console.log(`Master server listening on port ${PORT}.`)
});
