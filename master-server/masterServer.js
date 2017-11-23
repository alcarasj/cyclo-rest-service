const express = require('express');
const path = require("path");

const PORT = 8080;

var masterServer = express();

masterServer.get('/',function(req,res){
  res.sendFile(path.join(__dirname + '/index.html'));
});

masterServer.listen(PORT, (err) => {
  if (err) {
    return console.log('Master server failed to start.', err)
  }
  console.log(`Master server listening on port ${PORT}.`)
});