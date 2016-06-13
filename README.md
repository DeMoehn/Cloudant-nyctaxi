Cloudant GeoMap with NYC Taxi Data
=================

##Live action?
- Demo available via: http://cloudant-nyc-taxi.mybluemix.net/

##Data set?
The data is available for replication via:

* Car data: https://demoehn.cloudant.com/telematics
* Regions data: https://demoehn.cloudant.com/regions_low

You can also find the raw data in '/data'

##Description
A simple and quick hacked **automotive** webpage to demonstrate **Cloudant Geospatial** Queries.
The app is built using **HTML5** and **Javascript** (lots of jQuery) including the OpenSource "**LeafletJS**" Map to show Geo-information on an interactive map.

The application is based on automotive data gathered via a project where 5 colleagues actually used a small device in their cars to track values like coordinates, speed, direction, acceleration, etc. during their rides. The application is used to visualize this data and make it explorable via an interface, Google address APIs, Heatmaps, etc.

The app is just quickly hacked to demonstrate Cloudant geospatial, no awareness given to optimized or good coding! It's developed to be displayed on Safari and should also work with iPad, but no work was done to make it a real responsive Web app.

##Screenshots
Create a heatmap by car locations:<br />
<img src="https://raw.githubusercontent.com/DeMoehn/Cloudant-geomap/master/github-data/map-heatmap.png" width="500"/>

##Presentation
Also some more detailed information is available via a [PowerPoint Presentation](https://github.com/DeMoehn/Cloudant-geomap/blob/master/github-data/geomap-example.pptx)

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
