library(ibmdbR)
#Init
library(ggplot2)

#Connect to the database
idaInit(idaConnect("BLUDB","",""))

q <- ida.data.frame('"NYCTAXIDATA"')

names(q)
#Select only trips from Madison Square area to JFK
bdf <- q[(q$PICKUP_LATITUDE>40.759988)&(q$PICKUP_LATITUDE<40.765693)&
           (q$PICKUP_LONGITUDE>-73.976693)&(-73.9677>q$PICKUP_LONGITUDE)&
           (q$DROPOFF_LATITUDE>40.628024)&(q$DROPOFF_LATITUDE<40.672566)&
           (q$DROPOFF_LONGITUDE>-73.858281)&(-73.715544>q$DROPOFF_LONGITUDE)
         ,]
dim(bdf)
#Load the data into R
date()
df <- as.data.frame(bdf)
date()

#Preprocess taxi data - Do date / time conversions
df$date <- strptime(df$PICKUP_DATETIME,'%Y-%m-%d %H:%M:%S')
df$hour <- format(df$date,'%H')
df$min <- format(df$date,'%M')
df$dayyear <- as.numeric(format(df$date,'%j'))
df$dayweeknum <- df$dayyear%%7
df$dayweek <- format(df$date,'%a')
df$day <- as.numeric(format(df$date,'%d'))
df$month <- as.numeric(format(df$date,'%m'))
df$dayweek <- as.factor(df$dayweek)

df$timeofday <- (as.numeric(df$hour)*60+as.numeric(df$min))/60.0
df$trip_distance <- as.numeric(df$TRIP_DISTANCE)
df$trip_time <- as.numeric(df$TRIP_TIME_IN_SECS)/60.0
df$speed <- as.numeric(df$TRIP_DISTANCE)/as.numeric(df$TRIP_TIME_IN_SECS)
df$EST <- format(df$date,'%Y-%m-%d')

#Remove outliers
df <- df[df$TRIP_DISTANCE>15,]

#Plot trip time
ggplot(df, aes(x=trip_time)) + stat_bin(aes(y=..count../sum(..count..))) + ylab('') + xlab('Trip time (minutes)')

#Plot trip time depending on time of day
ggplot(df,aes(timeofday,trip_time))  + geom_point() + ggtitle('Trip time IBM Manhattan office to JFK Airport (Weekdays)') + xlab('Time of day (hour)') + ylab('Trip time (minutes)') + layer(geom="smooth") + ylim(0,100)+ xlim(0,23) + geom_rug(col="darkred",alpha=.1)

ggplot(df[(df$dayweek!='Sat')&(df$dayweek!='Sun'),],aes(timeofday,trip_time))  + geom_point() + ggtitle('Trip time IBM Manhattan office to JFK Airport') + xlab('Time of day (hour)') + ylab('Trip time (minutes)') + layer(geom="smooth") + ylim(0,100)+ xlim(0,23) + geom_rug(col="darkred",alpha=.1)


#Sunday
ggplot(df[df$dayweek=='Sun',],aes(timeofday,trip_time)) + ggtitle('Trip time IBM Manhattan office to JFK Airport (Sunday)') + xlab('Time of day (hour)') + ylab('Trip time (minutes)') + geom_point()+layer(geom="smooth") + ylim(0,100) + xlim(0,23)+ geom_rug(col="darkred",alpha=.1)

################################################
#Load Weather data into table "nycweather2013"
################################################


dfWeather <- as.data.frame(ida.data.frame('"NYCWEATHER2013"'))

head(dfWeather)

df2 <- merge(df,dfWeather,by="EST")
df2 <- df2[df2$Precipitation<20,]

head(df2)

ggplot(df2, aes(x=Precipitation)) + stat_bin(aes(y=..count../sum(..count..))) + ylab('') + xlab('Niederschlag')

g <- gam(trip_time~s(timeofday,by=dayweek)+s(Precipitation,k=5),data=df2)

plot(g)
