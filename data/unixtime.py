import re
import time, datetime

#convert pickup time to unix timestamp
strToScan = '2011-07-15 13:18:52'
regex = ur'^(\d+)-(\d+)-(\d+) (\d+)\:(\d+)\:(\d+)'
match = re.findall(regex, strToScan)
myList = str(match[0])[1:-1].replace("'", "").replace(" ", "").split(",")

date = datetime.datetime(int(myList[0]), int(myList[1]), int(myList[2]), int(myList[3]), int(myList[4]), int(myList[5]))
unixPickupTime = time.mktime(date.timetuple())

print(unixPickupTime)
