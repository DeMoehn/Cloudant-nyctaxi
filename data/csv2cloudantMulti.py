#!/usr/bin/python

import multiprocessing
import requests
import csv
import json
import sys
from multiprocessing import Process
import os

def info(title):
    print title
    print 'module name:', __name__
    if hasattr(os, 'getppid'):  # only available on Unix
        print 'parent process:', os.getppid()
    print 'process id:', os.getpid()

def f(name):
    # configuration values
    config = dict(
        username="demoehn3",
        password="a11HQSM54!!",
        database="nyctaxidata")

    # dict of table names and their csv representations
    csv_lookup = {
        # "table_name": "path/to/file.csv"
        "aanewaa": 'trip_data_1_split/output'+name+'.csv',
    }

    # authenticate with cloudant via cookie
    auth = "name={username}&password={password}".format(**config)
    auth_url = "https://{username}.cloudant.com/_session".format(**config)
    auth_headers = {"Content-Type": "application/x-www-form-urlencoded"}
    r = requests.post(auth_url,
                     data=auth,
                     headers=auth_headers)
    # save auth cookie
    cookies = r.cookies

    # upload!
    upload_url = "https://{username}.cloudant.com/{database}/_bulk_docs".format(**config)
    upload_headers = {"Content-Type":"application/json"}

    # functions
    def cloudantRequest(data, datas, ttype):
        for table, data in datas.iteritems():
            r = requests.post(upload_url,
            data=json.dumps(data),
            cookies=cookies,
            headers=upload_headers)
            # if it worked, print the results so we can seeeeee
            if r.status_code in [200, 201, 202]: # on OK, Created or Accepted
                print "Process ("+name+"): "+ttype+" uploaded successful - ",(10000*roundCount)
            # problems?! D:
            else:
                print r.status_code
                print r.text
                break
        return

    # dict of request data, which we'll upload to Cloudant
    requests_data = {}
    pickups_data = {}
    dropoffs_data = {}
    count = 0
    roundCount = 0

    jobs = []
    queue = multiprocessing.Queue()

    for table, filepath in csv_lookup.iteritems():
        pickup_data = dict(docs=[])
        dropoff_data = dict(docs=[])
        request_data = dict(docs=[])
        # get our data
        with open(filepath, 'rU') as f:
            reader = csv.DictReader(f, skipinitialspace=True, quotechar='"', delimiter=',')

            # put into request body
            for row in csv.DictReader(f):
                count += 1

                pickup_data['docs'].append({"_id": "pickup:"+row["medallion"]+":"+row["hack_license"], "type": "Feature", "geometry": {  "type": "Point", "coordinates": [float(row["pickup_longitude"]), float(row["pickup_latitude"])]}, "properties": {"pickup_datetime": row["pickup_datetime"], "type": "pickup"}})
                del row["pickup_longitude"], row["pickup_latitude"], row["pickup_datetime"]
                pickups_data[table] = pickup_data

                dropoff_data['docs'].append({"_id": "dropoff:"+row["medallion"]+":"+row["hack_license"], "type": "Feature", "geometry": {  "type": "Point", "coordinates": [float(row["dropoff_longitude"]), float(row["dropoff_latitude"])]}, "properties": {"dropoff_datetime": row["dropoff_datetime"], "type": "dropoff"}})
                del row["dropoff_longitude"], row["dropoff_latitude"], row["dropoff_datetime"]
                dropoffs_data[table] = dropoff_data

                row.update({"_id": "trip:"+row["medallion"]+":"+row["hack_license"], "type": "trip"})
                request_data['docs'].append(row)
                requests_data[table] = request_data

                if count == 10000:
                    print "Process ("+name+"): More than 10000"
                    roundCount += 1

                    cloudantRequest(request_data, requests_data, "Trip")
                    cloudantRequest(pickup_data, pickups_data, "Pickup")
                    cloudantRequest(dropoff_data, dropoffs_data, "Dropoff")

                    requests_data = {}
                    pickups_data = {}
                    dropoffs_data = {}
                    count = 0

    print "Process ("+name+"): Finished at:", (10000*roundCount)

if __name__ == '__main__':
    info('main line')
    jobs = []
    for i in range(24): # stop
        print 'Starting: trip_data_1_split/output'+str(i+1)+'.csv'
        p = Process(target=f, args=(str(i+1),))
        jobs.append(p)
        p.start()
