# Databox Sensingkit Driver

A Databox driver that provides SensingKit mobile sensor data

To be used in conjunction with the Databox mobile app [Android](https://play.google.com/store/apps/details?id=io.databox.app) [IOS](https://itunes.apple.com/us/app/databox-controller/id1295071825?mt=8).

## Data sources

| Type | Data | Example | Rate |
|-|-|-|-|
|`light`| time, level |`["1569439132559","7.000000"]`| ~1Hz |
|`linear acceleration`| time,x,y,z (m/s/s) | `["1569439396531","-0.040882","0.017995","0.095730"]` | ~100Hz |
|`gravity`| time,x,y,z (m/s/s) | `["1569439477204","-0.195773","0.249226","9.801528"]` | ~100Hz |
|`battery`| time,level,?,?,?,state,? | `["1569439276687","0.810000","307","4076","unknown","discharging","good"]` | |
|`accelerometer`| time,x,y,z (m/s/s) | `["1569439687031","-0.162806","0.201113","9.911995"]` | ~5Hz |
|`step counter`| time,steps | `["1569439817163","45.000000"]` | 1Hz?? |
|``|``| | |

Note, 
- values are only sent on change.
- all values are encoding in strings
- time is Java time, i.e. ms since UNIX epoch
- examples above are from the Android app on a Motorola G5-plus)

## Databox is funded by the following grants:

```
EP/N028260/1, Databox: Privacy-Aware Infrastructure for Managing Personal Data

EP/N028260/2, Databox: Privacy-Aware Infrastructure for Managing Personal Data

EP/N014243/1, Future Everyday Interaction with the Autonomous Internet of Things

EP/M001636/1, Privacy-by-Design: Building Accountability into the Internet of Things (IoTDatabox)

EP/M02315X/1, From Human Data to Personal Experience

```