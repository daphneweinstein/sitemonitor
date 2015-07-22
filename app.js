var config = require('./config.js');
var request = require('request');
var async = require('async');
var express = require('express');
var nunjucks = require('nunjucks');

console.log("UPenn &ndash; Penn IUR".replace(/[^A-Z]+/ig, "")); //remove


var app = express();
app.listen(3001);

nunjucks.configure('views', {
	autoescape: true,
	    express   : app
});

var scoresFinal = [];

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
     		siteAttributes.sname = site.name.replace('&ndash;', '-');
     		siteAttributes.sname = site.name.replace('&amp;', 'and');
     		siteAttributes.scode = site.name.replace(/[^A-Z]+/ig, "");
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
						if(response.statusCode != 200)
							siteAttributes.scolor = '#800000';
						else {
							var lightness = 255 - (siteAttributes.secs*12)
							lightness = Math.round(lightness);
							if(lightness < 0)
								lightness = 0;
							siteAttributes.scolor = rgbToHex(255, lightness, lightness);
						}
						scores.push(siteAttributes);
						//create text to display?
	//assign to a color of red, corresp. to # of seconds, reversed, and assign other 
	//val.s to 255 since white is 255,255,255
    //you can use function 
						//if response.statusCode isn't 200, assign to maroon
						callback();
					}
					else {
						//create text to display?
						siteAttributes.scolor = '#800000';
						siteAttributes.secs = 5000; 
						scores.push(siteAttributes);
						callback();
					}
				});
			}
			else { 
				siteAttributes.scolor = '#800080';
				siteAttributes.secs = -1;
				//create text to display?
				siteAttributes.url = 'NO URL LISTED';
				scores.push(siteAttributes);
				callback();
			}
		}, function(err) {
			//sort scores by secs before putting into scoresfinal
			scores.sort(compare); 
			scoresFinal = scores;
			console.log("done, scores looks like:   ");
			scores.forEach(function(siteattr) {
				console.log(siteattr);
			});
		})
});
}, 1000*2*60);


function rgbToHex(r, g, b) { 
	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b); }

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

app.get('/', function(req, res) {
	res.render('index.html', {
		title : 'Test Page',
		    items : scoresFinal
		    });
    });