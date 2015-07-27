//add timeouts for debugging, make the internal thing a function

var config = require('./config.js');
var request = require('request');
var async = require('async');
var express = require('express');
var nunjucks = require('nunjucks');
var app = express();
var mongodb = require('mongodb');

app.listen(3001);

nunjucks.configure('views', {
	autoescape: true,
	express   : app
});

var MongoClient = mongodb.MongoClient;
var url = 'mongodb://localhost:27017/statuschecks';
			//settimeout function and make stuff inside a named function as well
MongoClient.connect(url, function (err, db) {
	if (err) {
		console.log('Unable to connect to the mongoDB server. Error:', err);
	} else {
    //HURRAY!! We are connected. :)
	console.log('Connection established to', url);

    // Get the documents collection
    var collection = db.collection('sites');

	var scoresFinal = [];

	

	app.get('/', function(req, res) {
		res.render('index.html', {
			title : 'Test Page',
			items : scoresFinal
		});
	});


	var checksites = [];

	

	request({
		uri: config.apiurl,
		strictSSL: false,
		jar: true
		}, 
		function(err, response, body) {
			var sitearray = JSON.parse(body);
			
			collection.insert({name: 'darienst', value: sitearray}, function (err, result) {
				if (err) {
					console.log(err);
				} else {
					console.log('Inserted sitearray sucessfully');
				}
			});

			sitearray.forEach(function(rawsite) {
				rawsite.name = rawsite.name.replace('&amp;', 'and');
				rawsite.name = rawsite.name.replace(/[^A-Z0-9+(). ]+/ig, '-');
				rawsite.name = rawsite.name.replace('ndash', '');
				rawsite.code = rawsite.name.replace(/[^A-Z]+/ig, "");

				if(rawsite.final_production_url) {
					//clean up the url
					if(rawsite.final_production_url.indexOf("http") == -1) {
						rawsite.final_production_url = 'http://' + rawsite.final_production_url;
					}
				checksites.push(rawsite);
				}
				else {
					console.log('no url listed for this site: ' + rawsite);
				}
			});

			console.log('line 81');
			getValues(checksites);
			setInterval(run, 1000*2*60);

	});

	function run() {
    	getValues(checksites);
	}

	

	function getValues(sitearray){
		var scores = [];
		async.each(sitearray, function(site, callback) {
	     		//siteAttributes object has a name, url, status, and (load) secs
	     		var siteAttributes = {};
	     		
	     		// siteAttributes.sname = site.name.replace('&amp;', 'and');
	     		// siteAttributes.sname = siteAttributes.sname.replace(/[^A-Z0-9+(). ]+/ig, '-');
	     		// siteAttributes.sname = siteAttributes.sname.replace('ndash', '');
	     		// siteAttributes.scode = site.name.replace(/[^A-Z]+/ig, "");
				siteAttributes.sname = site.name;
				siteAttributes.scode = site.code;
					//siteAttributes.url = site.final_production_url;
					var start = +new Date();
					var requested = {url: site.final_production_url, timeout: 5000};
					request(requested, function(err, response, body) {
						var end = +new Date();
						if(!err) {

							siteAttributes.secs = (end-start)/1000;
							if(response.statusCode != 200) {
								siteAttributes.scolor = '#800000';
								siteAttributes.descr = siteAttributes.sname + ' loaded in ' + siteAttributes.secs + 's. with status code ' + response.statusCode;
							}
							else {
								var lightness = 255 - (siteAttributes.secs*12)
								lightness = Math.round(lightness);
								if(lightness < 0)
									lightness = 0;
								siteAttributes.scolor = rgbToHex(255, lightness, lightness);
								siteAttributes.descr = siteAttributes.sname + ' loaded in ' + siteAttributes.secs + 's.';
							}
							scores.push(siteAttributes);
							callback();
						}
						else {
							siteAttributes.scolor = '#800000';
							siteAttributes.secs = 5000; 
							siteAttributes.descr = siteAttributes.sname + ' -- load error';
							scores.push(siteAttributes);
							callback();
						}
					});
				
				
		}, function(err) {
			var timeRecorded = +new Date();

			scores.sort(compare); 
			scoresFinal = scores;
						//db.collection.find().skip(db.collection.count() - N) 
						//^^ this is the stupid approach and doesnt ever delete data
						//it appears in: http://stackoverflow.com/questions/4421207/mongodb-how-to-get-the-last-n-records
						//probably better since i am timestamping to just delete entries that are old
						



						//manipulate collection, probably using a for loop to go through and look for big diffs
						//also probably easiest to recalculate averages every time as opposed to trying to reverse-engineer
						var databaseEntry = { time: timeRecorded, scores: scoresFinal };
						console.log("line 119");
						collection.insert(databaseEntry, function (err, result) {
							if (err) {
								console.log(err);
							} else {
								console.log('Inserted databaseEntry sucessfully');
							}
						});
						//
						console.log("done, scores looks like:   ");
						scores.forEach(function(siteattr) {
							console.log(siteattr);
						});
					});
		}
	}
});



function rgbToHex(r, g, b) { 
	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b); 
}

function componentToHex(c) {
	var hex = c.toString(16);
	return hex.length == 1 ? "0" + hex : hex;
}

function compare(a,b) {
	if (a.secs < b.secs)
		return 1;
	if (a.secs > b.secs)
		return -1;
	return 0;
}