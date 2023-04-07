import clock from "clock";
import * as document from "document";
import { me } from "appbit";
import { display } from "display";
import { preferences } from "user-settings";
import { geolocation } from "geolocation";
import { week, dayHistory, primaryGoal, goals, today } from "user-activity";
import { battery, charger } from "power";
import { HeartRateSensor } from "heart-rate";
import * as util from "../common/utils";
import { SunCalc } from "../common/suncalc";

// Update the clock every minute/seconds
const displayOnColors = {
  batteryRedColor: "red",
  batteryYellowColor: "goldenrod",
  batteryGreenColor: "green",
  chargerColor: "white"
};

const displayOffColors = {
  batteryRedColor: "gray",
  batteryYellowColor: "gray",
  batteryGreenColor: "gray",
  chargerColor: "white"
};


let colors = displayOnColors;

let heartRate = -1;
let hrm = null;


// does the device support AOD, and can I use it?
if (display.aodAvailable && me.permissions.granted("access_aod")) {
  // tell the system we support AOD
  display.aodAllowed = true;
  console.log("AOD is enabled");
  
  if (HeartRateSensor && me.permissions.granted("access_heart_rate")) {
    hrm = new HeartRateSensor();
    hrm.addEventListener("reading", () => {
      heartRate = hrm.heartRate;
    });
    hrm.start();
  }
  clock.granularity = "seconds";

  // respond to display change events
  display.addEventListener("change", () => {
    // Is AOD inactive and the display is on?
    if (!display.aodActive && display.on) {
      clock.granularity = "seconds";
      
      colors = displayOnColors;
      updateBattery();

      // Show elements & start sensors
      // someElement.style.display = "inline";
      showSun(true);
      
      hrm.start();
      heartRate = 40;
      showHeartRate(true);
    } else {
      clock.granularity = "minutes";
      
      colors = displayOffColors;
      updateBattery();
      // Hide elements & stop sensors
      // someElement.style.display = "none";
      showSun(false);
      
      hrm.stop();
      showHeartRate(false);
      heartRate = -1;
    }
  });
} else { // no AOD granted
  //clock.granularity = "minutes";
  clock.granularity = "seconds";
  console.log("AOD is disabled");
  
  if (HeartRateSensor && me.permissions.granted("access_heart_rate")) {
    hrm = new HeartRateSensor();
    hrm.addEventListener("reading", () => {
      heartRate = hrm.heartRate;
    });
    display.addEventListener("change", () => {
      // Automatically stop the sensor when the screen is off to conserve battery
      if (display.on) {
        hrm.start();
        heartRate = 40;
        showHeartRate(true);
      } else {
        hrm.stop();
        showHeartRate(false);
        heartRate = -1;
      }
    });
    hrm.start();
  }
}


const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Get a handle on the <text> element
const timeLabel = document.getElementById("timeLabel");
const dateLabel = document.getElementById("dateLabel");
const batteryLabel = document.getElementById("batteryLabel");
const sunriseLabel = document.getElementById("sunriseLabel");
const sunsetLabel = document.getElementById("sunsetLabel");
const sunriseIcon = document.getElementById("sunrise");
const sunsetIcon = document.getElementById("sunset");
const batteryIndicator = document.getElementById("batteryIndicator");
const batteryBorder1 = document.getElementById("batteryBorder1");
const batteryBorder2 = document.getElementById("batteryBorder2");
const chargerBorder1 = document.getElementById("chargerBorder1");
const chargerBorder2 = document.getElementById("chargerBorder2");
const goalName = document.getElementById("goalName");
const goalDayLabels = [ 
  document.getElementById("goalDayLabel1"),
  document.getElementById("goalDayLabel2"),
  document.getElementById("goalDayLabel3"),
  document.getElementById("goalDayLabel4"),
  document.getElementById("goalDayLabel5"),
  document.getElementById("goalDayLabel6"),
  document.getElementById("goalDayLabel7")
];

const goalDayProgress = [ 
  document.getElementById("goalDayProgress1"),
  document.getElementById("goalDayProgress2"),
  document.getElementById("goalDayProgress3"),
  document.getElementById("goalDayProgress4"),
  document.getElementById("goalDayProgress5"),
  document.getElementById("goalDayProgress6"),
  document.getElementById("goalDayProgress7")
];

const heartIcon = document.getElementById("heart");
const heartRateLabel = document.getElementById("heartRateLabel");

let latitude = 42.698334;
let longitude = 23.319941;
let lastGeoUpdate = Date.now();

//const watchId = geolocation.watchPosition(locationSuccess, locationError, { timeout: 60 * 1000 });
//geolocation.clearWatch(watchId);

function getLocation() {
  geolocation.getCurrentPosition(locationSuccess, locationError, { timeout: 60 * 1000 });
  lastGeoUpdate = Date.now();
}

getLocation();
//console.log(`Primary goal is ${primaryGoal}`);


function locationSuccess(position) {
  latitude = position.coords.latitude;
  longitude = position.coords.longitude;
  //console.log(`Received GPS coordinates : ${latitude} ${longitude}`);
}

function locationError(error) {
  //console.log("Error: " + error.code, "Message: " + error.message);
}

function showHeartRate(visible) {
  if (hrm != null && visible) {
    heartIcon.style.visibility = "visible";
    heartRateLabel.style.visibility = "visible";
  } else {
    heartIcon.style.visibility = "hidden";
    heartRateLabel.style.visibility = "hidden";
  }
}

function showSun(visible) {
  let v = visible ? "visible" : "hidden";
  sunriseIcon.style.visibility = v;
  sunsetIcon.style.visibility = v;
}

function updateBattery() {
  const batteryLevel = Math.floor(battery.chargeLevel);
  const batteryText = `${batteryLevel}%`;
  batteryLabel.text = batteryText;
  let batteryColor = colors.batteryGreenColor;
  if (batteryLevel < 15) {
    batteryColor = colors.batteryRedColor;    
  } else if (batteryLevel < 60) {
    batteryColor = colors.batteryYellowColor;
  }
  batteryIndicator.width = Math.floor(36 * battery.chargeLevel / 100.0);
  batteryIndicator.style.fill = batteryColor;
  batteryBorder1.style.fill = batteryColor;
  batteryBorder2.style.fill = batteryColor;
  const chargerVisibility = battery.charging ? "visible" : "hidden";
  chargerBorder1.style.visibility = chargerVisibility;
  chargerBorder1.style.fill = colors.chargerColor;
  chargerBorder2.style.visibility = chargerVisibility;
  chargerBorder2.style.fill = colors.chargerColor;
}

// Update the <text> element every tick with the current time
clock.ontick = (evt) => {
  const use12h = preferences.clockDisplay === "12h";
  const now = evt.date;
  const hours = util.formatHours(now.getHours(), use12h);
  const mins = util.zeroPad(now.getMinutes());
  const dayOfMonth = now.getDate();
  const month = monthNames[now.getMonth()];
  const dayOfWeek = dayNames[now.getDay()];
  
  // get today's sunlight times for the last known GPS coordinates
  const times = SunCalc.getTimes(now, latitude, longitude);
  const sunriseHours = util.formatHours(times.sunrise.getHours(), use12h);
  const sunriseMinutes = util.zeroPad(times.sunrise.getMinutes());
  
  const sunsetHours = util.formatHours(times.sunset.getHours(), use12h);
  const sunsetMinutes = util.zeroPad(times.sunset.getMinutes());
  
  dateLabel.text = `${dayOfWeek}, ${month} ${dayOfMonth}`;
  timeLabel.text = `${hours}:${mins}`;
  sunriseLabel.text = `${sunriseHours}:${sunriseMinutes}`;
  sunsetLabel.text = `${sunsetHours}:${sunsetMinutes}`;
  
  if (Date.now() > lastGeoUpdate + 3600000 && display.on) {
    getLocation();
  }
  
  updateBattery();   
  
  goalName.text = primaryGoal;
  const goalTarget = goals[primaryGoal];

  const dayRecords = [];
  for (let i = 0; i < 7; i++) {
    let d = {};
    d[primaryGoal] = 0;
    dayRecords.push(d);
  }
  let gtarget = 1;
  if (goalTarget !== undefined) {
    //console.log(`${primaryGoal} target is ${goalTarget}`);
    gtarget = goalTarget;
    dayRecords = dayHistory.query( { "limit": 6 } );
    dayRecords.splice(0, 0, today.adjusted);
    // dayRecords.forEach((day, index) => {
    //   console.log(`${100* day[primaryGoal] / goalTarget || 0}% (${day[primaryGoal]}) ${primaryGoal}. ${index} day(s) ago.`);
    // });
  }
  //console.log(`Current ${primaryGoal}: ${today.adjusted[primaryGoal]}. Goal is ${gtarget}`);

  let day = now.getDay();
  for(let i = 0; i < 7; i++) {
    goalDayLabels[i].text = dayNames[day].charAt(0);
    const h = 16 * Math.max(0, (1 - dayRecords[i][primaryGoal] / gtarget));
    //console.log(`Height ${i}:${h}`)
    goalDayProgress[i].height = h;
    day--;
    if (day < 0) {
      day = 6;
    }
  }
  
  if (heartRate >= 0 && hrm != null) {
    heartRateLabel.text = `${heartRate}`
  }
}
