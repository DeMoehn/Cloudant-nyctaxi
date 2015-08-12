Cloudant GeoMap with NYC Taxi Data
=================

##Live action?
- Demo available via: http://cloudant-nyctaxi.mybluemix.net

##Changes
- Nothing so far...

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
