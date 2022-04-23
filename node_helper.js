var NodeHelper = require('node_helper');
var request = require('request');
var moment = require('moment');


module.exports = NodeHelper.create({

  start: function() {
    console.log("Starting module helper: " + this.name);
  },


  socketNotificationReceived: function(notification, payload) {
    if (notification === 'CONFIG') {
      this.config = payload;
      this.collectData();
      self = this;
      setInterval(function () {
        self.collectData();
      }, 60 * 1000 * 30);
    }
  },

  collectData: function () {
    var today;
    if (moment() < moment(this.config.switchTime, "HH:mm")) {
     today = moment().format("YYYY-MM-DD");
    } else {
     today = moment().add(1, "days").format("YYYY-MM-DD");
    }
    var self = this;
    const maxExtraDays = 7;
    let done = false;
    for (let extraDays = 0; extraDays < maxExtraDays; extraDays++) {
      today = moment().add(extraDays,"days").format("YYYY-MM-DD");
      var requestURL = 'https://openmensa.org/api/v2/canteens/'+this.config.canteen+'/days/'+today+'/meals';
      //console.log(requestURL) // uncomment for debug purposes
      request({
        url: requestURL,
        json: true
      }, function(error, response, body) {
        console.log('statusCode: ', response && response.statusCode);
        if (error) {
          console.log(error);
        } else if (response.statusCode == 404) {
          console.log("Canteen closed on " + today + ", trying again...");
          //self.sendSocketNotification("CLOSED", null);
        } 
        else if(response.statusCode == 500){
          self.sendSocketNotification("API_ERROR", null);
        }
        else {
          if(!done){
            done = true;
            self.sendSocketNotification("EXTRADAYS", extraDays);
            self.sendSocketNotification("MEALS", body);
            return;
          }
        }
      });
    }
    if(done) return;
  }
});
