var BDSVis = BDSVis || {};

//This function makes the geographical map
BDSVis.makeMap = function (data,request,vm) {
	//"vm" is the reference to ViewModel

	//Initialize the SVG elements and get width and length for scales
	//vm.PlotView.Init();
	svg=vm.PlotView.svg;
	width=vm.PlotView.width;
	height=vm.PlotView.height;
	
	var measure=request.measure;

	//Set graph title
	//d3.select("#graphtitle").
	d3.select("#chartsvg")
		.append("text").attr("class","graph-title")
		.text(vm.model.NameLookUp(measure,"measure")+" in "+request.year2)
		.attr("x",function(d) { return (vm.PlotView.margin.left+vm.PlotView.margin.right+width-this.getComputedTextLength())/2.; })
		.attr("y",1+"em");

	//Set D3 scales
	var ymin=d3.min(data, function(d) { return +d[measure]; });
	var ymax=d3.max(data, function(d) { return +d[measure]; });
	var ymid=(ymax+ymin)*.5;
	var maxabs=d3.max([Math.abs(ymin),Math.abs(ymax)]);
	
	//Define which scale to use, for the map and the colorbar. Note that log scale can be replaced by any other here (like sqrt), the colormap will adjust accordingly.
	var scaletype = (vm.logscale())?d3.scale.log():d3.scale.linear();

	var yScale = scaletype.copy();
	
	var purple="rgb(112,79,161)"; var golden="rgb(194,85,12)"; var teal="rgb(22,136,51)";

	if ((ymin<0) && !vm.logscale())
		yScale.domain([-maxabs,0,maxabs]).range(["#CB2027","#eeeeee","#265DAB"]);
	else
		//yScale.domain([ymin,ymax]).range(["#eeeeee","#265DAB"]);
		yScale.domain([ymin,ymid,ymax]).range([golden,"#bbbbbb",purple]);
		//yScale.domain([ymin,ymid,ymax]).range(["red","#ccffcc","blue"]);

	//Get the map from the shape file in JSON format
	d3.json("../json/gz_2010_us_040_00_20m.json", function(geo_data) {
        var mapg = svg.append('g')
        		.attr('class', 'map');
				
		var projection = d3.geo.albersUsa()
				.scale(800)
				.translate([width / 2, height / 2.]);

		var geo_data1=[];

		if (vm.timelapse()) { //In time lapse regime, select only the data corresponding to the current year
			var datafull=data;
			data=data.filter(function(d) {return +d.time===vm.model.year2[0]});
		}

		//Put the states in geo_data in the same order as they are in data
		for (var i in data)
			geo_data1.push(geo_data.features.filter(function(d) {return data[i].state===d.properties.NAME;})[0]);

		var path = d3.geo.path().projection(projection);

		var map = mapg.selectAll('path')
				.data(geo_data1)
				.enter()
				.append('path')
				.attr('d', path)
				.data(data)
				.style('fill', function(d) { return yScale(d[measure]);})
				.style('stroke', 'white')
				.style('stroke-width', 0.3)
				.append("title").text(function(d){return d.state+": "+d3.format(",")(d[measure]);});

		//Making Legend
		var legendsvg=vm.PlotView.legendsvg;

		var colorbar={height:200, width:20, nlevels:100, nlabels:5, fontsize:15, levels:[]};

		var hScale = scaletype.copy().domain([ymin,ymax]).range([0,colorbar.height]); //Scale for height of the rectangles in the colorbar
		var y2levelsScale = scaletype.copy().domain([ymin,ymax]).range([0,colorbar.nlevels]); //Scale for levels of the colorbar

		for (var i=0; i<colorbar.nlevels+1; i++) colorbar.levels.push(y2levelsScale.invert(i));

		legendsvg.append("text").attr("class","legtitle").text(vm.model.NameLookUp(measure,"measure")).attr("x",-20).attr("y",-20);

		//Make the colorbar
		legendsvg.selectAll("rect")
			.data(colorbar.levels)
			.enter()
			.append("rect")
			.attr("fill",  function(d) {return yScale(d);})
			.attr("width",20)
			.attr("height",colorbar.height/colorbar.nlevels+1)
			.attr("y",function(d) {return hScale(d);})
			.append("title").text(function(d){return vm.model.NumFormat(+d,3);});

		//Make the labels of the colorbar
		legendsvg.selectAll("text .leglabel")
			.data(colorbar.levels.filter(function(d,i) {return !(i % ~~(colorbar.nlevels/colorbar.nlabels));})) //Choose rectangles to put labels next to
			.enter()
			.append("text")
			.attr("fill", "black")
			.attr("class","leglabel")
			.attr("font-size", colorbar.fontsize+"px")
			.attr("x",colorbar.width+3)
			.attr("y",function(d) {return .4*colorbar.fontsize+hScale(d);})
			.text(function(d) {return(vm.model.NumFormat(+d,3));});

		// Timelapse animation
		function updateyear(yr) {
			curyearmessage.text(vm.model.year2[yr]); //Display year
			d3.select("#graphtitle").text("");
			var dataset=datafull.filter(function(d) {return +d.time===vm.model.year2[yr]}); //Select data corresponding to the year
			map = mapg.selectAll('path')
					.data(dataset)
					.transition().duration(1000)
					.style('fill', function(d) { return yScale(d[measure]);})
		};

		//Run timelapse animation
		if (vm.timelapse()) {
			var iy=0;
			var curyearmessage=d3.select("#chartsvg").append("text").attr("x",0).attr("y",height*.5).attr("font-size",100).attr("fill-opacity",.3);
			vm.tlint=setInterval(function() {
	  			updateyear(iy);
	  			if (iy<vm.model.year2.length) iy++; else iy=0;
	  			vm.TimeLapseCurrYear=vm.model.year2[iy];
			}, 1000);
		}
	});
}