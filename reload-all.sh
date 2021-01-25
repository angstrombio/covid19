#!/bin/bash
source config.sh
cd scripts
echo "**************** LOADING DATA ************************"
python load-jhu.py --source $CSV_DIR/ 
echo "Loaded; SKIPPED MV / EXPORT / GIT"
echo "******************* COMPLETE *************************"
