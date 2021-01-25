#!/bin/bash
source config.sh
echo "******************************************************"
cd scripts
echo "**************** REVIEWING DATA **********************"
python review-jhu.py --source $CSV_DIR/$1
read -p "Load data? " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
  exit 1
fi
echo "**************** LOADING DATA ************************"
python load-jhu.py --source $CSV_DIR/$1 
echo "Loaded; SKIPPED MV / EXPORT / GIT"
echo "******************* COMPLETE *************************"
