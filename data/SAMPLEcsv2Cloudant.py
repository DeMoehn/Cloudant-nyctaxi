#!/usr/bin/python

import multiprocessing
import requests
import csv
import json
import simplejson
import sys
import cloudant
import time
import re
import time, datetime

# connect to http://localhost:5984
#account = cloudant.Account() # If connecting to local CouchDB
account = cloudant.Account("http://demoehn3.cloudant.com") # Enter your Accountname
login = account.login('demoehn3', 'a11HQSM54!!') # Enter your Accountname/Username and Password
assert login.status_code == 200

# Print connection
response = account.get()
print response.json()

# Create database object
db = account.database('nyctaxidata3') # Enter your database

# dict of table names and their csv representations
csv_lookup = {
    "aanewaa": sys.argv[1]
}

# functions
def cloudantRequest(data, ttype):
    r = db.bulk_docs(*data)
    if r.status_code in [200, 201, 202]: # on OK, Created or Accepted
        print "Process (1): "+ttype+" uploaded successful - ",(10000*roundCount)
    else:
        print r.status_code
        print r.text

# list of request data, which we'll upload to Cloudant
pickup_data = []
dropoff_data = []
request_data = []
count = 0
roundCount = 0
allCount = 0

for table, filepath in csv_lookup.iteritems():
    # get our data
    with open(filepath, 'rU') as f:
        reader = csv.DictReader(f, skipinitialspace=True, quotechar='"', delimiter=',')

        # put into request body
        for row in csv.DictReader(f):
            count += 1

            #Calculate UNIX time
            timeToScan = row["pickup_datetime"]
            regex = ur'^(\d+)-(\d+)-(\d+) (\d+)\:(\d+)\:(\d+)'
            match = re.findall(regex, timeToScan)
            myList = str(match[0])[1:-1].replace("'", "").replace(" ", "").split(",")
            date = datetime.datetime(int(myList[0]), int(myList[1]), int(myList[2]), int(myList[3]), int(myList[4]), int(myList[5]))
            unixPickupTime = str(time.mktime(date.timetuple()))

            # Transform 1st Set
            allCount +=1
            pickup_data.append({"_id": "pickup:"+row["medallion"]+":"+row["hack_license"]+":"+unixPickupTime, "type": "Feature", "geometry": {  "type": "Point", "coordinates": [float(row["pickup_longitude"]), float(row["pickup_latitude"])]}, "properties": {"pickup_datetime": row["pickup_datetime"], "type": "pickup"}})

            # Transform 2nd Set
            allCount +=1
            dropoff_data.append({"_id": "dropoff:"+row["medallion"]+":"+row["hack_license"]+":"+unixPickupTime, "type": "Feature", "geometry": {  "type": "Point", "coordinates": [float(row["dropoff_longitude"]), float(row["dropoff_latitude"])]}, "properties": {"dropoff_datetime": row["dropoff_datetime"], "type": "dropoff"}})

            # Transform 3rd Set
            allCount +=1
            request_data.append({"_id": "trip:"+row["medallion"]+":"+row["hack_license"]+":"+unixPickupTime, "type": "trip", "vendor_id":row["vendor_id"], "rate_code":row["rate_code"],"store_and_fwd_flag":row["store_and_fwd_flag"], "passenger_count":row["passenger_count"],"trip_time_in_secs":row["trip_time_in_secs"],"trip_distance":row["trip_distance"]})

            if count == 10000:
                print "Process (1): More than 10000"
                roundCount += 1

                # Save all sets
                cloudantRequest(pickup_data, "Pickup")
                cloudantRequest(dropoff_data, "Dropoff")
                cloudantRequest(request_data, "Trip")

                # Clear all sets
                pickup_data = []
                dropoff_data = []
                request_data = []

                count = 0

print "Process (1): Finished at:", (10000*roundCount), "with #docs: ", allCount
