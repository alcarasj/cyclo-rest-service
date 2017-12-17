#!/bin/bash

$SLAVE_SERVER ./cyclo-slave-server/start-slave-server-unix.sh
$MASTER_SERVER ./cyclo-master-server/start-master-server-unix.sh

chmod u+x *.sh
. \"${SLAVE_SERVER}\" &
. \"${MASTER_SERVER}\" &
wait
