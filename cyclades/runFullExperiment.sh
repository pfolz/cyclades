#!/bin/bash
# Run experiments with 1, 2, 4, 8, 16, 32, 64, 132, 244

#nbClient=(1 2 4 8 16 32 64 132 244)

#nbClient=(10)


source /home/folz/cycladesExperiments/ldfClient/config.properties

nbClient=$nbCycles
nbClientDBpedia=$nbClientDBpedia

for i in "${nbClient[@]}"
do
   err=$(rm -rf /tmp/nginx/cache/* 2>&1)
   del=0
   while [ $del -eq 0 ]
   do
	if [[ $err =~ ^rm.* ]]
	then
	    err=$(rm -rf /tmp/nginx/cache/* 2>&1)
	    if [[ $err != *"rm"* ]]; then
		del=1
	    fi
	else
	    del=1
	fi
   done
#   resRepBase="/home/folz/cycladesExperiments/res/$(date +%d-%m-%y:%T)/${i}_clients/"
   resRepBase="/home/folz/cycladesExperiments/res/${i}_clients/"

   mkdir -p $resRepBase 

   cp config.properties $resRepBase

   cycleFile=${resRepBase}cycle_${i}
   nohup bash -x runExperiment.sh $i $nbClient $resRepBase > ${cycleFile} 2>&1 &
   pid=`ps -ef | grep "runExperiment.sh ${i}" | awk {'print $2'}`
   echo ${pid}
   wait ${pid}
done

