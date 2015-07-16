var config = require('./config.js');
var request = require('request');
var async = require('async');
var express = require('express');

var app = express();
//node-cron

var scores = [];
var sitearray = [];

request({
        uri: config.apiurl,
        strictSSL: false,
        jar: true
        }, function(err, response, body) {
        //console.log(response.statusCode);
        if(!err) {
        sitearray = JSON.parse(body);

      //siteAttributes object has a name, url, status, and (load) secs
var siteAttributes = {};
async.each(sitearray, 
  function(site, callback) {
    siteAttributes = {};
    siteAttributes.sname = site.name;
        //console.log(siteAttributes.sname);
        //if the final site works
    if(site.final_production_url) {
      //clean up the url
      if(site.final_production_url.indexOf("http") == -1) {
        site.final_production_url = 'http://' + site.final_production_url;
      }
      siteAttributes.url = site.final_production_url;
      console.log(site.final_production_url);
      var start = +new Date();
      request(site.final_production_url, function(response, body) {
        var end = +new Date();
        if(response) {
        console.log(site.final_production_url + ": " + response.statusCode);
        siteAttributes.secs = (end-start)/1000;  console.log(siteAttributes.secs + " = secs");
        siteAttributes.statusCode = response.statusCode;  console.log(siteAttributes.statusCode + " = status");
            console.log(siteAttributes +" hello");
            scores.push(siteAttributes);
          }
          callback();
        });
    }
    else callback();
    //callback();
   }//, 
  // function(err) {
  //  console.log("hello from err function");
  //  if(!err){
  //    console.log("hello from err function again");
  //    console.log(scores);
  //    app.get('/', function (req, res) {
  //        // scores.forEach(function(entry) {
  //        // });
  //      console.log("in send");

  //        res.send(scores);
  //      });

  //  }
  //  else res.send("err happened");
  //  var server = app.listen(3000, function () {
  //    var host = server.address().address;
  //    var port = server.address().port;

  //    console.log('Example app listening at http://%s:%s', host, port);
  //  });
  // }
);

}
});
   
  

  // app.get('/', function (req, res) {
  //  // scores.forEach(function(entry) {
  //  // });
  //  console.log("in send");

 //     res.send(scores);
 //   });


// app.get('/', function (req, res) {
//   res.send('Hello World!');
// });

// var server = app.listen(3000, function () {
//   var host = server.address().address;
//   var port = server.address().port;

//   console.log('Example app listening at http://%s:%s', host, port);
// });