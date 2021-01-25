#!/bin/bash
set -euo pipefail
source config.sh
cd $jhudir
echo "***************** UPDATING SOURCE FILES *************"
git pull
echo "******************************************************"
cd $CSV_DIR
MAX_FILE=`ls *2021.csv | sort -r | head -n 1`
echo Max File is $MAX_FILE
read -p "Continue to load this file? " -n 1 -r
echo
cd $basedir
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
  exit 1
fi
cd scripts
echo "**************** REVIEWING DATA **********************"
python review-jhu.py --source $CSV_DIR/$MAX_FILE
read -p "Load data? " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
  exit 1
fi
echo "**************** LOADING DATA ************************"
python load-jhu.py --source $CSV_DIR/$MAX_FILE
python export-data-for-web.py --overwrite
cd ../docs/data
echo "**************** UPDATING GIT ************************"
git status
read -p "Commit to Git? " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
  exit 1
fi
git add metadata.json
NEW_GEOJSON=`ls 2021*.geojson | sort -r | head -n 1`
git add $NEW_GEOJSON
git commit -m "Data for ${NEW_GEOJSON:0:10}"
read -p "Push? " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
  exit 1
fi
git push origin master
echo "******************* COMPLETE *************************"
