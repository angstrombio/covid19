#!/bin/bash
source config.sh
echo "******************************************************"
cd scripts
echo "**************** LOADING DATA ************************"
for name in "$@"
do
    echo "$name"
    python load-jhu.py --source $CSV_DIR/$name.csv
done
echo "Loaded; SKIPPED MV / EXPORT / GIT"
echo "******************* COMPLETE *************************"
