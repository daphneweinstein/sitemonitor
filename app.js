//add timeouts for debugging, make the internal thing a function

var config = require('./config.js');
var request = require('request');
var async = require('async');
var express = require('express');
var nunjucks = require('nunjucks');
var app = express();
var mongodb = require('mongodb');

var DAY_IN_MILISECONDS = 86400000;

//set up the server
app.listen(3001);

//use nunjucks instead of jade
nunjucks.configure('views', {
	autoescape: true,
	express   : app
});

//set up route for home page
var scoresFinal = [];
app.get('/', function(req, res) {
	res.render('index.html', {
		title : 'Test Page',
		items : scoresFinal
	});
});

//set up mongo and connect to statuschecks db
var MongoClient = mongodb.MongoClient;
var url = 'mongodb://localhost:27017/statuschecks';

var collection;
var checksites = [];

async.series([
    function(callback){
    	//connect to mongo
        MongoClient.connect(url, function (err, db) {
			if (err) {
				console.log('Unable to connect to the mongoDB server. Error:', err);
				callback(err);
			} else {
		    	//HURRAY!! We are connected. :)
				console.log('Connection established to', url);

		    	// Get the documents collection
		    	collection = db.collection('sites');

		    	//clean out all old data 
		    	var timeRecorded = +new Date();
				var keepTime = timeRecorded - DAY_IN_MILISECONDS;
				collection.remove( { time: { $lt: keepTime } } );
		    	callback(null);
        	}
        });
    },
    function(callback){
    	//hit darienst and get back cleaned array of sites
    	request({
			uri: config.apiurl,
			strictSSL: false,
			jar: true
			}, 
			function(err, response, body) {
				
				//parse the response
				var sitearray = JSON.parse(body);

    			//loop over responses and clean them up
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
					} else {
						console.log('no url listed for this site: ' + rawsite);
					}
				});

				callback(null);
		});
    }
],
function(err, results){
	if(err) {
		console.log(err);
		return;
	}

	getValues();
	setInterval(getValues, 1000*2*60);
});



function getValues(){

	var timestamp = +new Date();

	var scores = [];

	async.each(checksites, function(site, callback) {

		//siteAttributes object has a name, url, status, (load) secs, longest (load time)
		//shortest (load time), avg (load time), lastFourAvg (load time)
     	var siteAttributes = {};

		async.series([
		    function(cb){
		        siteAttributes.sname = site.name;
		     	siteAttributes.scode = site.code;
		     	var start = +new Date();
		     	var requested = {url: site.final_production_url/*, timeout: 115000*/};

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
		     				if(lightness < 0) { lightness = 0; }
		     				siteAttributes.scolor = rgbToHex(255, lightness, lightness);
		     				siteAttributes.descr = siteAttributes.sname + ' loaded in ' + siteAttributes.secs + 's.';
		     			}     			
		     		}
		     		else {
		     			siteAttributes.scolor = '#800000';
		     			siteAttributes.secs = 5000; 
		     			siteAttributes.descr = siteAttributes.sname + ' -- load error';
		     			
     				}
     			cb(null);
     			});//close request
		        
		    },
		    function(cb){
		        //store all data as object with a timestamp, scode (name of site), and time to load
	     		var dbEntry = { scode: siteAttributes.scode, time: timestamp, timeToLoad: siteAttributes.secs  };

	     		//insert database entry
	     		collection.insert(dbEntry, function (err, result) {
					if (err) {
						console.log(err);
					} 
				});

	     		//calculate total average
	     		var averageObj = collection.aggregate(
				   [
				   	{ $match: { scode: siteAttributes.scode } },
				     {
				       
				       $group:
				         {
				           _id: "$scode",
				           fullAvg: { $avg: "$timeToLoad" } 
				         }
				     }
				   ]
				).toArray(function (err, result) {
				    if (err) {
				        console.log(err);
				    } else if (result.length) {
				        siteAttributes.avg = result[0].fullAvg;
				    } 
			    	cb(null);
			    }); 
		    },
		    function(cb){
		        // //get longest load time
	     		var cursor = collection.find({scode: siteAttributes.scode });
	     		cursor.sort({timeToLoad: -1}); 
	     		cursor.limit(1);
	     		cursor.toArray(function (err, result) {
				    if (err) {
				        console.log(err);
				    } else if (result.length) {
				        siteAttributes.longest = result[0].timeToLoad;
				    } 
					cb(null);
			    });   
		    },
		    function(cb){
		        //get shortest load time
	     		var cursor = collection.find({scode: siteAttributes.scode });
	     		cursor.sort({timeToLoad: 1}); 
	     		cursor.limit(1);
	     		cursor.toArray(function (err, result) {
				    if (err) {
				        console.log(err);
				    } else if (result.length) {
				        siteAttributes.shortest = result[0].timeToLoad;
				    } 
			    	cb(null);
			    });
		        
		    },
		    function(cb){
		        
	     		//calculate last 4 average
	     		var cursor = collection.find({scode: siteAttributes.scode });
	     		cursor.sort({time: -1}); 
	     		cursor.limit(4);
	     		cursor.toArray(function (err, result) {
				    if (err) {
				        console.log(err);
				    } else if (result.length) {
						//calculate average of most recent 4 loads
				     	var lastFour = 0;
				     	result.forEach(function(res) {
				     		lastFour = lastFour + res.timeToLoad;
				     	});
				     	lastFour = lastFour/4;

				     	//alert true if the recent load times are bad
				     	if(lastFour > 2*siteAttributes.avg) {
				        	siteAttributes.alert = true;
				        }
				        else siteAttributes.alert = false;
				    } 
			    cb(null);
			    }); 
		    }
		],
		function(err){
		    //TEMPORARY PATCH update the description
     		siteAttributes.descr = siteAttributes.descr + " average: " + siteAttributes.avg + " lowest: " + siteAttributes.shortest + " highest: " + siteAttributes.longest;

     		scores.push(siteAttributes);
     		callback();
		});

	}, function(err) {
		timeRecorded = +new Date();

		scores.sort(compare); 
		scoresFinal = scores;
		
		//remove old times as we go along
		keepTime = timeRecorded - DAY_IN_MILISECONDS;
		collection.remove( { time: { $lt: keepTime } } );

		collection.remove( { timeToLoad: { $gt: 4990 } } );
		collection.remove(  { timeToLoad: null } );

	}/*close error function*/);//close async.each
}//close full getValues


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