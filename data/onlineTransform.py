import cloudant
import json

USERNAME = 'demoehn3'
PASSWORD = 'a11HQSM54!!'
# connect to https://garbados.cloudant.com
account = cloudant.Account(USERNAME, auth=(USERNAME, PASSWORD), async=True)
# login, so we can make changes
login = account.login(USERNAME, PASSWORD)
# and https://garbados.cloudant.com/allyourbase
database = account.database('dash013162_nyctaxidata')
design = database.design('transform')
index = design.index('_view/pickup?limit=10')

# create the database
future = index.get()
response = future.result()

# throw an error if the response code indicates failure
response.raise_for_status()

pickup_data = dict(docs=[])
pickup_data = index.get().result().json()
print pickup_data.rows[0]
# { "db_name": "allyourbase", ... }
