var config = require('./config.js');
var request = require('request');
var async = require('async');
var express = require('express');

var app = express();

function singleRequest() {
	var scores = [];

	request({
		uri: config.apiurl,
		strictSSL: false,
		jar: true
	}, 
	function(err, response, body) {		
        var sitearray = JSON.parse(body);
     	//var i = 0; //del
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
				//console.log(site.final_production_url + " ?= " + siteAttributes.url);

				var start = +new Date();
				request(site.final_production_url, function(err, response, body) {
					var end = +new Date();
					if(!err) {
						//console.log(site.final_production_url + ": " + response.statusCode);
						siteAttributes.secs = (end-start)/1000;
						siteAttributes.statusCode = response.statusCode;
						//console.log("loaded in " + (end-start)/1000 + " seconds");
						console.dir(siteAttributes);
						scores.push(siteAttributes);
						//console.dir(siteAttributes);
						callback();
					}
					else {
						siteAttributes.statusCode = -1;
						console.dir(siteAttributes);
						scores.push(siteAttributes);
						//console.dir(siteAttributes);
						callback();
					}
				});
			}
			else { //console.log(site.final_production_url + ": " + "error");
			siteAttributes.url = 'NO URL LISTED';
			scores.push(siteAttributes);
			console.dir(siteAttributes);
			callback();
		}
	}, function(err) {
		// app.delete('/', function (req, res) {
		//   res.send('DELETE request to homepage');
		// });
		console.log("done \n \n \n");
		app.get('/', function (req, res) {
			res.send(scores);
		});
		})
});
}


singleRequest();

setInterval(function () {
	console.log("~~~~~~~~~~~Hello@13~~~~~~~~~~~");
	singleRequest();
}, 1000*60*2.5);

var server = app.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('Example app listening at http://%s:%s', host, port);
				//console.log("scores are \n \n \n " + scores);
});
