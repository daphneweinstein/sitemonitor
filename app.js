var config = require('./config.js');
var https = require('https');
var url = require('url');

console.log(url.parse(config.apiurl));

// https.get(config.apiurl, function(res) {
//   console.log("statusCode: ", res.statusCode);
//   console.log("headers: ", res.headers);

//   res.on('data', function(d) {
//     process.stdout.write(d);
//   });

// }).on('error', function(e) {
//   console.error(e);
// });
//var sitearray = JSON.parse(info);
// sitearray.forEach(function(site, callback) {
// 	 call on the site and once you recieve the amount of time it took to 
// 	load and it's code at loading, call back
// })



//console.log(config);

// var express = require('express');
// var app = express();

// app.get('/', function (req, res) {
//   res.send('Hello World!');
// });

// var server = app.listen(3000, function () {
//   var host = server.address().address;
//   var port = server.address().port;

//   console.log('Example app listening at http://%s:%s', host, port);
// });