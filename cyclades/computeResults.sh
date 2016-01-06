#!/bin/bash
#Argument number of clients in the experiments
#sed -e '\[12\/Nov\/2015:20:20:11 \+0100\]/,/\[12\/Nov\/2015:20:25:27 \+0100\]p' access.log

if [ $# -le 0 ]; then
    echo "Error: usage is computeResults path nbClients"
    exit
fi

nbClient=$2
currentIdClient=1

date=$(date +%d-%m-%y)

#cd ../res/${date}/${nbClient}_clients/
#cd ../res/15-12-15:08:21:51/10_clients
cd ${1}
declare startTime;
declare stopTime;
while [ $currentIdClient -ne $(($nbClient+1)) ];do

    sta=`awk '/Start RealPhase:/{print $NF}' logClient_${currentIdClient} #| sed 's,\/,\\\\/,g' $startTime`
    sto=`awk '/Stop RealPhase:/{print $NF}' logClient_${currentIdClient} #| sed 's,\/,\\\\/,g' $stopTime`

#    echo $sta
#    echo $sto

    IFS='/:' read -r -a date <<< "$sta"
    staCmp="${date[2]}-12-${date[0]} ${date[3]}:${date[4]}:${date[5]}"
 #   echo $staCmp
    IFS='/:' read -r -a dateB <<< "$sto"
    stoCmp="${dateB[2]}-12-${dateB[0]} ${dateB[3]}:${dateB[4]}:${dateB[5]}"
  #  echo $stoCmp
    

    if [ $currentIdClient == 1 ]; then
	startTime="${date[0]}/${date[1]}/${date[2]}:${date[3]}:${date[4]}:${date[5]}"
	stopTime="${dateB[0]}/${dateB[1]}/${dateB[2]}:${dateB[3]}:${dateB[4]}:${dateB[5]}"
    else 
	IFS='/:' read -r -a dateA <<< "$startTime"
	startTimeCmp="${dateA[2]}-12-${dateA[0]} ${dateA[3]}:${dateA[4]}:${dateA[5]}"
#	echo $startTimeCmp
	IFS='/:' read -r -a dateO <<< "$stopTime"
	stopTimeCmp="${dateO[2]}-12-${dateO[0]} ${dateO[3]}:${dateO[4]}:${dateO[5]}"
#	echo $stopTimeCmp
	t1=`date --date="$staCmp" +%s`
#	echo $t1
	t2=`date --date="$stoCmp" +%s`
#	echo $t2
	t1B=`date --date="$startTimeCmp" +%s`
#	echo $t1B
	t2b=`date --date="$stopTimeCmp" +%s`
#	echo $t2b
	let "tDiffSta=t1B-t1"
#	echo $tDiffSta
	if [ $tDiffSta -gt 0 ]
	then
	    startTime="${date[0]}/${date[1]}/${date[2]}:${date[3]}:${date[4]}:${date[5]}"
	fi

	let "tDiffSto=t2-t2b"
#	echo $tDiffSto
	if [ $tDiffSto -gt 0 ]
	then
	    stopTime="${dateB[0]}/${dateB[1]}/${dateB[2]}:${dateB[3]}:${dateB[4]}:${dateB[5]}"
	fi
	

    fi


    currentIdClient=$(($currentIdClient+1))
done

echo $startTime
echo $stopTime


awk -v startTime=${startTime} -v stopTime=${stopTime} -f /home/folz/rubenExperiments/ldfClient/scriptExtract.awk /var/log/nginx/access.log > allCalls
#awk -v startTime=${startTime} -v stopTime=${stopTime} -f /home/folz/cycladesExperiments/ldfClient/scriptExtract.awk /var/log/nginx/access.log.1 > extract

cat allCalls | grep MISS > missCalls
cat allCalls | grep HIT > hitCalls

awk -v mbSent="0" -f /home/folz/rubenExperiments/ldfClient/script.awk hitCalls > mbSent


