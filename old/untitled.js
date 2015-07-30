
		async.each(sitearray, function(site, callback) {
	     		//siteAttributes object has a name, url, status, and (load) secs
	     		var siteAttributes = {};
	     		
	     		siteAttributes.sname = site.name.replace('&amp;', 'and');
	     		siteAttributes.sname = siteAttributes.sname.replace(/[^A-Z0-9+(). ]+/ig, '-');
	     		siteAttributes.sname = siteAttributes.sname.replace('ndash', '');
	     		siteAttributes.scode = site.name.replace(/[^A-Z]+/ig, "");
				
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

		