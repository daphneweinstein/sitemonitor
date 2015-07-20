var config = require('./config.js');
var request = require('request');
var async = require('async');
var express = require('express');

var app = express();
//node-cron

var scores = [];


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





//OLDER~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// function callback(err, response, body) {
        //  if(!err) {
    //            console.log(response.statusCode);
    //          }
    //          else console.log("~~~~~~~~~~~error~~~~~~~~~~~");
    //      }

    //      request(site.final_production_url, callback);

        //console.log(site.final_production_url + ' site ' + i + ' \n \n'); //del
        //call on the site and once you recieve the amount of time it took to 
        //load and it's code at loading, call back
        //callback(/**/);
        //callback();

        //~~~~~~~~~~SEPARATE BLOCK~~~~~~~~~~~~~~~~~~

//  app.get('/', function (req, res) {
//    res.send("hello from 63");

//      //res.send("loaded in " + (end-start)/1000 + " seconds");
//      });
// // app.get('/', function (req, res) {
// //   res.send('Hello World!');
// // });

// var server = app.listen(3000, function () {
//   var host = server.address().address;
//   var port = server.address().port;

//   console.log('Example app listening at http://%s:%s', host, port);
// });

//async.filter(['file1','file2','file3'], fs.exists, function(results){
    // results now equals an array of the existing files
//});