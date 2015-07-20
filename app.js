var config = require('./config.js');
var request = require('request');
var async = require('async');
var express = require('express');



var app = express();
var scoresFinal = [];
// take express stuff out of the setInterval, use a standin to fill up scores and 
// then reassign to scores within setInterval once it's ready to go

var i = 0;
setInterval(function () {
	var scores = [];
	request({
		uri: config.apiurl,
		strictSSL: false,
		jar: true
	}, 
	function(err, response, body) {
		var sitearray = JSON.parse(body);
		async.each(sitearray, function(site, callback) {
     		//siteAttributes object has a name, url, status, and (load) secs
     		var siteAttributes = {};
     		siteAttributes.sname = site.name;
			//if the final site works
			if(site.final_production_url) {
				//clean up the url
				if(site.final_production_url.indexOf("http") == -1) {
					site.final_production_url = 'http://' + site.final_production_url;
				}
				siteAttributes.url = site.final_production_url;
				var start = +new Date();
				request(site.final_production_url, function(err, response, body) {
					var end = +new Date();
					if(!err) {
						siteAttributes.secs = (end-start)/1000;
						siteAttributes.statusCode = response.statusCode;
						scores.push(siteAttributes);
						callback();
					}
					else {
						siteAttributes.statusCode = -1;
						scores.push(siteAttributes);
						callback();
					}
				});
			}
			else { 
				siteAttributes.url = 'NO URL LISTED';
				scores.push(siteAttributes);
				callback();
			}
		}, function(err) {
			scoresFinal = scores;
			console.log("done, scores looks like:   ");
			scores.forEach(function(siteattr) {
				console.log(siteattr);
			});
		})
});
}, 1000*2*60);


app.get('/', function (req, res) {
	while(true) {
		res.send(scoresFinal);
	}
});

var server = app.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('Example app listening at http://%s:%s', host, port);
				//console.log("scores are \n \n \n " + scores);
			});
