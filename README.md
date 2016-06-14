Cloudant GeoMap with NYC Taxi Data
=================

##Live action?
- Demo available via: http://cloudant-nyc-taxi.mybluemix.net/

##Data set?
The data is available for replication via:

* Cloudant NYC Taxi: https://demoehn.cloudant.com/nyctaxidata
* The complete set: http://www.andresmh.com/nyctaxitrips/

##Description
This application is a reused version of my Cloudant GeoMap demo. It's still WIP but is intented to show live data from the NYC Taxi Data set from 2013 (see "Data set?").

Currently the application **displays** all the first 200 **Taxi trips on the map** and you can click on the markers and **read all details** (e.g. #Passengers, distance, duration, rating, ...). Furthermore Google APIs are used to **draw a theoretical route** (as we only have start&end coordinates) to the map. Of course - as in the GeoMap - you can query for more taxi data by using different shapes and **Cloudants GeoSpatial Queries**.

With the help of **Cloudants Schema Discovery Process** (SDP) data can also be transformed to relational and analyzed with R*.

The app is just quickly hacked to demonstrate Cloudant geospatial, no awareness given to optimized or good coding! It's developed to be displayed on Safari only, no work was done to make it a responsive Web app at all.

##Screenshots
Display some taxi routes on the map:<br />
<img src="https://raw.githubusercontent.com/DeMoehn/Cloudant-nyctaxi/master/github-data/demo-overview.png" width="500"/>

Query for special areas:<br />
<img src="https://raw.githubusercontent.com/DeMoehn/Cloudant-nyctaxi/master/github-data/demo-geo.png" width="500"/>

View trip details:<br />
<img src="https://raw.githubusercontent.com/DeMoehn/Cloudant-nyctaxi/master/github-data/demo-details.png" width="500"/>

Create theoretical route:<br />
<img src="https://raw.githubusercontent.com/DeMoehn/Cloudant-nyctaxi/master/github-data/demo-route.png" width="500"/>

##Presentation
Also some more detailed information is available via a [PowerPoint Presentation](https://github.com/DeMoehn/Cloudant-nyctaxi/blob/master/github-data/NYCTAXI-demo_SebastianMoehn.pptx)

##Deploy on IBM Bluemix
* Login to IBM Bluemix via the CF Command Line Tool
```
$ cf login
```

* Change to the app directory and push the inital application via (Change APPN-AME!):
```
$ cf push APP-NAME -m 64M -b https://github.com/cloudfoundry/staticfile-buildpack.git -s cflinuxfs2
```

* To add Git-Integration go to: https://hub.jazz.net/ and either login or create an account

* Create a new Project and choose "From an existing Git Project" and choose your Git Project

* Use the "Build&Deploy" Button (upper right)

* Create a new Phase, make sure the GIT URL is correct, and tick the box "Run job, when GIT Repo changes"

* Choose "Jobs" add a new "Deploy" Job and make sure to change the script to only include the app/ directory (otherwise Jazzhub pushes the whole repo!)
```
#!/bin/bash
cf push "${CF_APP}" -p app/
```
