#!/usr/bin/python

#!/usr/bin/python

import multiprocessing
import requests
import csv
import json
import sys
import cloudant
from multiprocessing import Process
import os

# connect to http://localhost:5984
account = cloudant.Account()
#account = cloudant.Account("http://demoehn3.cloudant.com")
login = account.login('demoehn3', 'a11HQSM54!!')
assert login.status_code == 200

# Print connection
response = account.get()
print response.json()

# Create database object
db = account.database('nyctaxidata')

def info(title):
    print title
    print 'module name:', __name__
    if hasattr(os, 'getppid'):  # only available on Unix
        print 'parent process:', os.getppid()
    print 'process id:', os.getpid()

# functions
def cloudantRequest(data, ttype, name, rounds):
    r = db.bulk_docs(*data)
    if r.status_code in [200, 201, 202]: # on OK, Created or Accepted
        print "Process ("+str(name)+"): "+ttype+" uploaded successful - ",(10000*rounds)
    # problems?! D:
    else:
        print r.status_code
        print r.text

def f(name):
    # dict of table names and their csv representations
    csv_lookup = {
        # "table_name": "path/to/file.csv"
        "aanewaa": 'trip_data_1_split/output'+name+'.csv',
    }

    # list of request data, which we'll upload to Cloudant
    pickup_data = []
    dropoff_data = []
    request_data = []
    count = 0
    allCount = 0
    roundCount = 0

    for table, filepath in csv_lookup.iteritems():
        # get our data
        with open(filepath, 'rU') as f:
            reader = csv.DictReader(f, skipinitialspace=True, quotechar='"', delimiter=',')

            # put into request body
            for row in csv.DictReader(f):
                count += 1
                allCount +=1
                pickup_data.append({"_id": "pickup:"+row["medallion"]+":"+row["hack_license"], "type": "Feature", "geometry": {  "type": "Point", "coordinates": [float(row["pickup_longitude"]), float(row["pickup_latitude"])]}, "properties": {"pickup_datetime": row["pickup_datetime"], "type": "pickup"}})

                allCount +=1
                dropoff_data.append({"_id": "dropoff:"+row["medallion"]+":"+row["hack_license"], "type": "Feature", "geometry": {  "type": "Point", "coordinates": [float(row["dropoff_longitude"]), float(row["dropoff_latitude"])]}, "properties": {"dropoff_datetime": row["dropoff_datetime"], "type": "dropoff"}})

                allCount +=1
                request_data.append({"_id": "trip:"+row["medallion"]+":"+row["hack_license"], "type": "trip", "vendor_id":row["vendor_id"], "rate_code":row["rate_code"],"store_and_fwd_flag":row["store_and_fwd_flag"], "passenger_count":row["passenger_count"],"trip_time_in_secs":row["trip_time_in_secs"],"trip_distance":row["trip_distance"]})

                if count == 10000:
                    print "Process ("+str(name)+"): More than 10000"
                    roundCount += 1

                    cloudantRequest(pickup_data, "Pickup", name, roundCount)
                    cloudantRequest(dropoff_data, "Dropoff", name, roundCount)
                    cloudantRequest(request_data, "Trip", name, roundCount)

                    pickup_data = []
                    dropoff_data = []
                    request_data = []

                    count = 0

    print "Process ("+str(name)+"): Finished at:", (10000*roundCount), "with #docs: ", allCount

if __name__ == '__main__':
    info('main line')
    jobs = []
    for i in range(24): # stop
        print 'Starting: trip_data_1_split/output'+str(i+1)+'.csv'
        p = Process(target=f, args=(str(i+1),))
        jobs.append(p)
        p.start()
