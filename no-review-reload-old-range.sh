#!/bin/bash
source config.sh
echo "Year=$1 FirstMonth=$2 LastMonth=$3 FirstDay=$4 LastDay=$5"
read -p "Continue with that range? " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
  exit 1
fi
echo "******************************************************"
cd scripts
echo "**************** LOADING DATA ************************"
for month in $(seq -f "%02g" $2 $3)
do
    for day in $(seq -f "%02g" $4 $5)
    do
        echo "$month-$day-$1"
        python load-jhu.py --source $CSV_DIR/$month-$day-$1.csv
    done
done
echo "Loaded; SKIPPED MV / EXPORT / GIT"
echo "******************* COMPLETE *************************"
