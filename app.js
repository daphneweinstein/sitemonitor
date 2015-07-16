var config = require('./config.js');
var request = require('request');
var async = require('async');
var express = require('express');



var app = express();
//node-cron

var responseObj = {};

request({
        uri: config.apiurl,
        strictSSL: false,
        jar: true
        }, function(err, response, body) {

        //console.log(response.statusCode);
     	var sitearray = JSON.parse(body);
     	//var i = 0; //del
		async.each(sitearray, function(site, callback) {
			//if the final site works
			if(site.final_production_url) {
				//clean up the url
				if(site.final_production_url.indexOf("http") == -1) {
					site.final_production_url = 'http://' + site.final_production_url;
				}
				var start = +new Date();
				request(site.final_production_url, function(err, response, body) {
					var end = +new Date();
					if(!err) {
        				console.log(site.final_production_url + ": " + response.statusCode);
        				console.log("loaded in " + (end-start)/1000 + " seconds");
        				callback();

        			}
        			else { //console.log(site.final_production_url + ": " + "error");
        			callback(); }
    			});

				// function callback(err, response, body) {
				// 	if(!err) {
    //     				console.log(response.statusCode);
    //     			}
    //     			else console.log("~~~~~~~~~~~error~~~~~~~~~~~");
    // 			}

    // 			request(site.final_production_url, callback);

				//console.log(site.final_production_url + ' site ' + i + ' \n \n'); //del
				//call on the site and once you recieve the amount of time it took to 
				//load and it's code at loading, call back
				//callback(/**/);
				//callback();
			}
			//i = i + 1; //del
		})
     });
	app.get('/', function (req, res) {
  		res.send("loaded in " + (end-start)/1000 + " seconds");
  		});
// app.get('/', function (req, res) {
//   res.send('Hello World!');
// });

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

//async.filter(['file1','file2','file3'], fs.exists, function(results){
    // results now equals an array of the existing files
//});