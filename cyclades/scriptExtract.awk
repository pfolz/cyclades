#!/bin/awk -f
BEGIN{
	#print startTime;
	split(startTime,sta,":");
	#print sta[1], sta[2], sta[3], sta[4];
	#print stopTime;
	split(stopTime,sto,":");
	#print sto[1], sto[2], sto[3], sto[4];
}
{
	#for(j=0;j<=NF;j++){
    print $0
		i=index($0, sta[1]);
		j=index($0, sto[1]);
		#if(i && (length($0) <= 170)) {
		if (i || j) {
			#print $0
			time=substr($0,i+12,8);
			#print $0
			#print time
			split(time,t,":");
			#print time;
			print t[1], t[2], t[3];
			print sta[2];
			print sto[2];
			if((t[1] >= sta[2]) && (t[1] <= sto[2])) { # Hour is comprise between bound
			   if ((t[2] == sta[3]) && (t[2] < sto[3])) {
			      if(t[3] >= sta[4]) {
			     	#print t[1], t[2], t[3];
			      	print $0
			      }
			   }
			   else if ((t[2] > sta[3]) && (t[2] < sto[3])) {
				#print t[1], t[2], t[3];
				print $0
			   }
			   else if ((t[2] >= sta[3]) && (t[2] == sto[3])) { # Minutes is comprise between bound
			     #print t[1],t[2],t[3], sta[4], sto[4]
			      if(t[3] <= sto[4]) {
				#print t[1], t[2], t[3];
				 print $0
			      } 
			   }
			}
		}
	#}
}
END {
}
