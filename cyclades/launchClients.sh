#!/bin/bash
#arguments: nbClients currentIdClient repository nbRoundsWarmUp nbRoundsReal

if [ $# != 5 ]; then
    echo "Error: usage is launchClients nbClients currentIdClients repository nbRoundsWarmUp nbRoundsReal"
    exit
fi

nbClients=$1
currentIdClient=$2
repBase=$3
nbRoundsWarmUp=$4
nbRoundsReal=$5

logFile=${repBase}logClient_${currentIdClient}
monthnames=( invalid Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec)
month=${monthnames[$(date +%m)]}
echo 'Start WarmUpPhase:' ${warmUpPhase} '-'  $(date +%d/)${month}$(date +/%Y:%T ) >> ${logFile}
if [ $currentIdClient -eq 1 ]; then
	nodejs client.js "http://curiosiphi.lina.sciences.univ-nantes.prive/bsbm" $nbClients $currentIdClient $repBase $nbRoundsWarmUp $nbRoundsReal 8787 >>$logFile 
else
	nodejs client.js "http://curiosiphi.lina.sciences.univ-nantes.prive/bsbm" $nbClients $currentIdClient $repBase $nbRoundsWarmUp $nbRoundsReal undefined "http://127.0.0.1:8787" >>$logFile 
fi
echo 'Stop WarmUpPhase:' ${warmUpPhase} '-' $(date +%d/)${month}$(date +/%Y:%T ) >> ${logFile}
