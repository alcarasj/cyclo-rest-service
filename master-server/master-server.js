const net = require('net');

if (process.argv.length <= 2) {
  console.log("Usage: " + __filename + "GITHUB_REPO_LINK_JS");
  process.exit(-1);
}
