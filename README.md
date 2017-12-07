# Cyclo REST Service (CS4400 REST Service Development Task)
### By Jerico Alcaras, 14317110
## Run using NPM
This service requires **Node** and **NPM** in order to run.
1. Clone the repository.
2. `cd` to `cyclo-master-server` and run `npm install`. 
3. Run `npm start` (this starts one instance of the **MASTER** server on port 8080).
4. `cd` to `cyclo-slave-server` and run `npm install`.
5. Run `npm start` (this starts five instances of the **SLAVE** server on ports 8081, 8082, 8083, 8084 and 8085).
6. Go to `http://localhost:8080` and you can begin using the service.

## Docker Cloud
Docker images are available at `alcarasj/cyclo-master-server` and `alcarasj/cyclo-slave-server`.
## Data Flow
**CLIENT** → (GitHub repo URL) → **MASTER** → (JS files) → **SLAVES** → (Complexity reports) → **MASTER** → (Compiled report) → **CLIENT**

One **MASTER** is connected to many **SLAVES** (IP addresses of **SLAVES** are hardcoded in the master server).

1. **CLIENT** sends GitHub URL of repo.
2. **MASTER** clones repo using GitHub URL, gets all JS files in repo and splits these evenly among **SLAVES** using a simple round-robin protocol.
3. Each **SLAVE** analyses the file using ESComplex (https://www.npmjs.com/package/escomplex) and generates a report object containing the cyclomatic complexity of the file and its path in the repository.
4. Each **SLAVE** sends a report object back to **MASTER** if analysis was successful.
5. **MASTER** compiles all the **SLAVE**'s reports into a Jade view (with a graph showing the files' individual cyclomatic complexities) for the **CLIENT**.
6. **MASTER** sends this compiled report to **CLIENT** for viewing.

## Master Server
**MASTER** is an instance of `cyclo-master-server/masterServer.js`. It is the point of communication between the client and the system.
Upon receipt of a client's analysis request, **MASTER** does the following:
1. See if the user-entered URL is a valid GitHub URL and start the timer.
2. Clone the repository at this URL.
3. Once cloning is complete, retrieve all the path strings of the JS files in the repository and store them in the `JSFiles` array.
4. For every path string in the `JSFiles` array, create a read stream to place the file in a POST request, and send it to **SLAVES** using a simple for-loop round-robin protocol.
5. Receive complexity reports as responses from **SLAVES**. For every complexity report object received, push it to the `reports` array.
6. Once the length of the `reports` array is equal to the length of the `JSFiles` array, then analysis is complete (because we received a report for every JS file sent).
7. Reduce the `report` array to get an average cyclomatic complexity for the repository. Stop the timer.
8. Make a Jade view for the client containing the result of the analysis and send it to the client.

## Slave Server

**SLAVE** is an instance of `cyclo-slave-server/slaveServer.js`.
Five **SLAVES** can be generated locally by using the provided NPM `test` script in `cyclo-slave-server/package.json`. 
Upon receipt of a JS file from **MASTER**, a **SLAVE** does the following:
1. Check for the file's integrity by performing a MD5 check using the checksum sent with the POST request.
2. If integrity was verified, analyse the file using ESComplex (returns a result object on completion, if file has syntactic/lexical errors then cyclomatic complexity of that file is zero).
3. Extract the cyclomatic complexity from this result, and place it in a response object with the file's path in the repository.
4. Send this response object back to **MASTER**.