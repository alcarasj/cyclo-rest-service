# Cyclo REST Service (CS4400 REST Service Development Task)
### By Jerico Alcaras, 14317110
## Data Flow (as of 27/11/2017)

**CLIENT** → **MASTER** → **SLAVES** → **MASTER** → **CLIENT**

**SLAVES** consists of three slave servers: **SLAVE-0**, **SLAVE-1**, **SLAVE-2**.
One **MASTER** is connected to many **SLAVES** (IP addresses of **SLAVES** are hardcoded in the master server).

1. **CLIENT** sends GitHub URL of repo.
2. **MASTER** clones repo using GitHub URL, gets all JS files in repo and splits these evenly among **SLAVES**.
3. For each **SLAVE**, **MASTER** generates a zip file containing the **SLAVE**'s allocated JS files and sends it to the **SLAVE**.
4. **SLAVE** generates reports using Plato (https://www.npmjs.com/package/plato).

Note: From here onwards is still WIP.

5. **SLAVE** sends reports back to **MASTER**.
6. **MASTER** compiles all the **SLAVE**'s reports into one report for the **CLIENT**.
7. **MASTER** sends report to **CLIENT** for viewing.