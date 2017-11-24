const express = require('express');
const path = require("path");
const bodyParser = require("body-parser");

const PORT = 8080;

var masterServer = express();
masterServer.use(bodyParser.urlencoded({ extended: false }));
masterServer.use(bodyParser.json());

masterServer.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});

masterServer.post('/analyse',(req, res) => {
  console.log(req.body.repoLink);
  res.send("Alri.");
});

masterServer.listen(PORT, (err) => {
  if (err) {
    return console.log('Master server failed to start.', err)
  }
  console.log(`Master server listening on port ${PORT}.`)
});
