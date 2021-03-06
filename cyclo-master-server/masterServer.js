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
const Stopwatch = require('timer-stopwatch');
const md5File = require("md5-file");
const ping = require('ping');
const jade = require('jade');
const isGithubUrl = require('is-github-url');
const sha1 = require('sha1');
require('console-stamp')(console, { pattern: 'dd/mm/yyyy HH:MM:ss' });

const PORT = 8080;
const SLAVES = ['127.0.0.1:8081', '127.0.0.1:8082', '127.0.0.1:8083', '127.0.0.1:8084', '127.0.0.1:8085'];
const URL = '/analyse';
const ZIPDIR = './slaveZips';
const TMPDIR = './tmp';

if (!fs.existsSync(TMPDIR)) {
  fs.mkdirSync(TMPDIR);
}

var masterServer = express();
masterServer.use(bodyParser.urlencoded({ extended: false }));
masterServer.use(bodyParser.json());
masterServer.set('view engine', 'jade');


masterServer.get('/', (req, res) => {
  const clientLog = "[" + req.ip + "] ";
  console.log(clientLog + "Connected to form.");
  var message = "";
  res.render('index');
});

masterServer.get('/analyse', (req, res) => {
  var timer = new Stopwatch();
  timer.start();
  const clientLog = "[" + req.ip + "] ";
  if (req.query.repoURL[req.query.repoURL.length - 1] === '/') {
      req.query.repoURL = req.query.repoURL.slice(0, -1);
  }
  var repoURL = req.query.repoURL;
  const tokens = repoURL.split('/');
  const repoOwner = tokens[tokens.length - 2];
  const repoName = tokens[tokens.length - 1];
  const userHash = sha1(req.ip);
  if (fs.existsSync(path.join(__dirname, TMPDIR, userHash ))) {
    return res.status(400).send("An analysis process is currently ongoing for your IP address. Please try again in a moment.")
  }
  const clonePath = path.join(__dirname, TMPDIR, userHash);
  if (isGithubUrl(repoURL)) {
    console.log(clientLog + "Requested analysis of " + repoURL);
    rmraf.sync(clonePath);
    var JSFiles = [];
    var slaveReports = [];
    console.log(clientLog + "Cloning GitHub repository at " + repoURL + " (this may take a while)...");
    var repo = Git.Clone(repoURL, clonePath).catch((err) => {
      console.error(err);
    }).then((repo) => {
      const timeStamp = new Date().toLocaleString();
      getJSFiles(clonePath, /\.js$/, userHash);
      console.log(clientLog + "Cloning complete! Sending " + JSFiles.length + " JS files to slaves for analysis.");
      var roundRobin = 0;
      for (var i = 0; i < JSFiles.length; i++) {
        if (roundRobin >= SLAVES.length) {
          roundRobin = 0;
        }
        const slaveID = roundRobin++;
        const hash = md5File.sync(JSFiles[i].localPath);
        const localPath = JSFiles[i].localPath;
        const repoPath = JSFiles[i].repoPath;
        const form = {
          sourceFile: fs.createReadStream(localPath),
          checkSum: hash,
          repoString: repoOwner + '/' + repoName,
          repoPath: repoPath,
          slaveID: slaveID,
          userHash: userHash,
          fileID: i,
        };
        request.post({ url: 'http://' + SLAVES[slaveID] + URL, formData: form }, (err, slaveRes, body) => {
          if (err) {
            return console.error(err);
          } else {
            const report = JSON.parse(body);
            slaveReports.push(report);
            if (slaveReports.length === JSFiles.length) {
              const cyclomaticComplexities = slaveReports.map((report) => report.cyclomaticComplexity);
              const repoPaths = slaveReports.map((report) => report.repoPath);
              const totalCyclomaticComplexity = cyclomaticComplexities.reduce((a, b) => a + b, 0);
              const averageCyclomaticComplexity = totalCyclomaticComplexity / JSFiles.length;
              timer.stop();
              const timeTakenInSeconds = timer.ms / 1000;
              console.log("Analysis of " + repoURL + " complete.");
              const chartOptions = {
                type: 'horizontalBar',
                data: {
                  labels: repoPaths,
                  datasets: [
                    {
                      label: "Cyclomatic complexity",
                      backgroundColor: '#D9213B',
                      borderColor: '#D9213B',
                      hoverBackgroundColor: '#D9213B',
                      data: cyclomaticComplexities,
                    }
                  ]
                },
                options: {
                  legend: { display: false },
                  title: {
                    display: true,
                    text: "Cyclomatic complexity (No. of linearly independent paths through a source file)"
                  },
                  scales: {
                    xAxes: [{
                      ticks: {
                        beginAtZero:true
                      },
                    }],
                  },
                }
              };
              res.render('result', { params: {
                 chartOptions: JSON.stringify(chartOptions),
                 averageCyclomaticComplexity: averageCyclomaticComplexity,
                 timeTakenInSeconds: timeTakenInSeconds,
                 repoString: repoOwner + '/' + repoName,
                 numberOfSourceFiles: JSFiles.length,
                 numberOfSlaves: SLAVES.length,
                 timeStamp: timeStamp,
              }});
              rmraf.sync(clonePath);
            }
          }
        });
      }
    });
  } else {
      res.status(400).send("You did not provide a valid GitHub repository URL.")
  }

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

masterServer.listen(PORT, (err) => {
  if (err) {
    return console.log('Master server failed to start.', err);
  }
  console.log(`Master server listening on port ${PORT}.`);
});
