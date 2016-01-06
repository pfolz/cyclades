#!/bin/bash
# run warmUpPhase & realPhase for n clients

if [ $# != 3 ]; then
    echo "Error: usage is launchClients nbClient nbClientDBpedia resLog"
    exit
fi

nbClientBSBM=$1
#resRepBase="/home/folz/cycladesExperiments/res/$(date +%d-%m-%y)/${nbClients}_clients/"
nbClientDBpedia=$2
resRepBase=$3
#nbClients=$(($1+1))
currentIdClient=1

nbClients=$1

source /home/folz/cycladesExperiments/ldfClient/config.properties

declare -a warmUpPid
lastServer=8787
while [ $currentIdClient -ne $(($nbClients+1)) ]; do
    logFile=${resRepBase}callsDone_${currentIdClient}
    
    declare -a pid
    res=$((currentIdClient % 5))
    echo ${res}
    if [ $currentIdClient -eq 1 ] || [ $res -eq 0 ]
    then
	echo 'Is 1 or multiple of 5'
	if [ $currentIdClient != 1 ]
	then
	    peerAdr="http://127.0.0.1:${lastServer}"
	    lastServer=$(($lastServer+1))
	    if [ $currentIdClient -le 50 ]
	    then
		nohup nodejs client.js "http://curiosiphi.lina.sciences.univ-nantes.prive/bsbm" $nbClients $currentIdClient $resRepBase $nbWarmUpRound $nbRealRound "bsbm" $lastServer $peerAdr >>$logFile 2>&1 &
		pid=`ps -ef | grep "client.js "http://curiosiphi.lina.sciences.univ-nantes.prive/bsbm" ${nbClients} ${currentIdClient} ${resRepBase} ${nbWarmUpRound} ${nbRealRound} "bsbm" ${lastServer} ${peerAdr}" | awk {'print $2'}`
	    else
		nohup nodejs client.js "http://curiosiphi.lina.sciences.univ-nantes.prive/bsbmBis" $nbClients $currentIdClient $resRepBase $nbWarmUpRound $nbRealRound "bsbm" $lastServer $peerAdr >>$logFile 2>&1 &
		pid=`ps -ef | grep "client.js "http://curiosiphi.lina.sciences.univ-nantes.prive/bsbmBis" ${nbClients} ${currentIdClient} ${resRepBase} ${nbWarmUpRound} ${nbRealRound} "bsbm" ${lastServer} ${peerAdr}" | awk {'print $2'}`
	    fi
	else
		nohup nodejs client.js "http://curiosiphi.lina.sciences.univ-nantes.prive/bsbm" $nbClients $currentIdClient $resRepBase $nbWarmUpRound $nbRealRound "bsbm" $lastServer >>$logFile 2>&1 &
		pid=`ps -ef | grep "client.js "http://curiosiphi.lina.sciences.univ-nantes.prive/bsbm" ${nbClients} ${currentIdClient} ${resRepBase} ${nbWarmUpRound} ${nbRealRound} "bsbm" ${lastServer}" | awk {'print $2'}`
	fi
		
    else
	echo 'Is simple client'
	peerAdr="http://127.0.0.1:${lastServer}"
	if [ $currentIdClient -le 50 ]
	then
	    nohup nodejs client.js "http://curiosiphi.lina.sciences.univ-nantes.prive/bsbm" $nbClients $currentIdClient $resRepBase $nbWarmUpRound $nbRealRound "bsbm" undefined $peerAdr >>$logFile 2>&1 &
	    pid=`ps -ef | grep "client.js "http://curiosiphi.lina.sciences.univ-nantes.prive/bsbm" ${nbClients} ${currentIdClient} ${resRepBase} ${nbWarmUpRound} ${nbRealRound} "bsbm" undefined ${peerAdr}" | awk {'print $2'}`
	else 
	    nohup nodejs client.js "http://curiosiphi.lina.sciences.univ-nantes.prive/bsbmBis" $nbClients $currentIdClient $resRepBase $nbWarmUpRound $nbRealRound "bsbm" undefined $peerAdr >>$logFile 2>&1 &
	    pid=`ps -ef | grep "client.js "http://curiosiphi.lina.sciences.univ-nantes.prive/bsbmBis" ${nbClients} ${currentIdClient} ${resRepBase} ${nbWarmUpRound} ${nbRealRound} "bsbm" undefined ${peerAdr}" | awk {'print $2'}`
	fi
    fi
        
    echo "Pid for ${currentIdClient} true"
    echo ${pid}
    warmUpPid[${currentIdClient}]=${pid}
    currentIdClient=$(($currentIdClient+1))
done

for p in "${warmUpPid[@]}"
do
    wait ${p}
done


