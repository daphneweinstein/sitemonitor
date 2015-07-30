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
app.use(express.static('public'));

//use nunjucks instead of jade
nunjucks.configure('views', {
	autoescape: true,
	express   : app
});

//set up route for home page
var alerter = [];
var warner = [];
app.get('/', function(req, res) {
	res.render('index.html', {
		title : 'Test Page',
		alert : alerter,
		warning: warner
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
						console.log('no url listed for this site: ' + rawsite.name);
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
	var warnerHelper = [];
	var alerterHelper = [];

	async.each(checksites, function(site, callback) {
		
		//siteAttributes object has a name, url, code, statusCode, (load) secs, longest (load time)
		//shortest (load time), avg (load time), lastFourAvg (load time)
     	var siteAttributes = {};

		async.series([
		    function(cb){
		        siteAttributes.sname = site.name;
		     	siteAttributes.scode = site.code;
		     	var start = +new Date();
		     	var requested = {url: site.final_production_url};

		     	request(requested, function(err, response, body) {
		     		var end = +new Date();
		     		if(!err) {
		     			siteAttributes.secs = (end-start)/1000;
		     			siteAttributes.statusCode = response.statusCode;
		     			if(response.statusCode != 200) {
		     				siteAttributes.alert = true; 
		     				//
		     			}   			
		     		}
		     		else {
		     			siteAttributes.alert = true;
		     			siteAttributes.secs = 5000; 
		     			siteAttributes.statusCode = 'N/A';
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
				    	var roundedAvg = Math.ceil(result[0].fullAvg * 100) / 100;
				        if (result[0].fullAvg == 5000) {
				        	siteAttributes.avg = 'ERROR';
				        } 
				        else siteAttributes.avg = roundedAvg;
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
				    	var roundedAvg = Math.ceil(result[0].timeToLoad * 100) / 100;
				        siteAttributes.longest = roundedAvg;
				    	if (siteAttributes.longest == 5000) {
				        	siteAttributes.longest = 'ERROR';
				        }
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
				        var roundedAvg = Math.ceil(result[0].timeToLoad * 100) / 100;
				        siteAttributes.shortest = roundedAvg;
				        if (siteAttributes.shortest == 5000) {
				        	siteAttributes.shortest = 'ERROR';
				        }
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
				        cb(err);
				    } else if (result.length) {
						//calculate average of most recent 4 loads
				     	var lastFour = 0;
				     	result.forEach(function(res) {
				     		lastFour = lastFour + res.timeToLoad;
				     	});
				     	lastFour = lastFour/4;

				     	//alert true if the recent load times are bad
				     	var alertFactor;
				     	if(process.argv[2]) {
				     		alertFactor = process.argv[2]; 
				     	} else alertFactor = 2.5;
				     	
				     	if(process.argv[3]) {
				     		warningFactor = process.argv[2]; 
				     	} else warningFactor = 1.5;

				     	if(lastFour > alertFactor*siteAttributes.avg) {
				        	siteAttributes.alert = true;
				        } else if(lastFour > warningFactor*siteAttributes.avg) {
				        	siteAttributes.warning = true;
				        } 

				        var roundedAvg = Math.ceil(lastFour * 100) / 100;
				    	siteAttributes.lastFour = roundedAvg;
						
						if(lastFour > 1000) {
				        	siteAttributes.lastFour = "ERROR";
				        }

				    	if(siteAttributes.secs == 5000) {
							siteAttributes.secs = 'ERROR';
						}
						cb(null);
				    } 
			    
			    }); 
		    },
		    function(cb) { 
				if (siteAttributes.avg == 'ERROR') {
					siteAttributes.descr = siteAttributes.shortest + ' --- ' + siteAttributes.avg + ' --- ' + siteAttributes.longest;
				} else siteAttributes.descr = siteAttributes.shortest + ' ----- ' + siteAttributes.avg + ' ----- ' + siteAttributes.longest;
	     		if(siteAttributes.alert == true) {
	     			alerterHelper.push(siteAttributes);
	     		} else if(siteAttributes.warning == true) {
	     			warnerHelper.push(siteAttributes);
	     		}	
				cb(null);
			}
		],
		function(err){
     		callback();
		});

	}, function(err) {
		timeRecorded = +new Date();

		warner = warnerHelper;
		alerter = alerterHelper;

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