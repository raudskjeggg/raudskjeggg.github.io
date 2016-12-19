var BDSVis = BDSVis || {};

//This function makes d3js plot, either a bar chart or scatterplot
BDSVis.makePlot = function (data,request,vm,limits) {
	//"vm" is the reference to ViewModel

	var pv=vm.PlotView;
	
	var svg=pv.svg;
	var width=pv.width;
	var height=pv.height;

	var cvar = request.cvar;
	var cvarr=vm.model.LookUpVar(cvar);
	var xvar = request.xvar;
	var xvarr=vm.model.LookUpVar(xvar);

	var YvarsAsLegend = (cvar === vm.model.yvars);

	//If yvars is also a c-variable, then we got melted data from updateBDSdata function, with all yvars contained in the "value" column
	var yvar=YvarsAsLegend?"value":request[vm.model.yvars];

	

	var cvarvalues = Array.from(new Set(data.map(function(d) {return d[cvar]}))) //All the unique values of returned cvars
	cvarvalues = vm.model.sortasmodel(cvarvalues, cvar); //Sort them as in model.js
	
	var xvarvalues = Array.from(new Set(data.map(function(d) {return d[xvar]}))) //All the unique values of returned xvars
	xvarvalues = vm.model.IsContinuous(xvarr)?xvarvalues.sort():vm.model.sortasmodel(xvarvalues, xvar); //Sort them by quantity (if continuous) or like in model.js

	//Set the title of the plot
	var ptitle=(YvarsAsLegend && request[vm.model.yvars].length>1)?("Various "+vm.model.yvars+"s"):(vm.model.NameLookUp(request[vm.model.yvars],vm.model.yvars)); //If many yvars say "various", otherwise the yvar name
	
	//Continue forming title
	for (var key in data[0]) {
		//X-var should not be in the title, yvar is taken care of. Also check that the name exists in model.variables (e.g. yvar names don't)
		if ((key!==xvar) && (key!==yvar) && (key!==vm.model.yvars) && !((key===vm.model.timevar) && (vm.timelapse)) && (vm.model.VarExists(key))) {
			if (key!==cvar) ptitle+=vm.model.PrintTitle(data[0][key],key);
			else if (cvarvalues.length === 1) ptitle+=vm.model.PrintTitle(data[0][key],key);
			else if (key!==vm.model.yvars) ptitle+=" by " + vm.model.NameLookUp(key,"var");
		} 		
	};

	//Y-axis label

    var yvarname=vm.model.NameLookUp((YvarsAsLegend)?request[vm.model.yvars][0]:vm.model.yvars);
    console.log(YvarsAsLegend,(YvarsAsLegend)?request[vm.model.yvars][0]:vm.model.yvars)
	//if (((!YvarsAsLegend) || ( request[vm.model.yvars].length==1 )) && (yvarname.indexOf("rate")!==-1))	yvarname = yvarname+", % change";	
	

	var hcc = Highcharts.chart('hccont', {

	    chart: {
	        type: vm.model.IsContinuous(xvarr)?'line':'column',
	        zoomType: 'xy'
	    },

	    title: {
	        text: ptitle
	    },

	    xAxis: {
	    	title: {text: xvarr.name},
	       	categories: vm.model.IsContinuous(xvarr)?"":xvarvalues.map(function(d) {return vm.model.NameLookUp(d,xvar)})
	       //categories: xvarvalues.map(function(d) {return vm.model.NameLookUp(d,xvar)})	
	    },

	    yAxis: {
	        // allowDecimals: false,
	        // min: 0,
	        type: vm.logscale?'logarithmic':'linear',
	        title: {
	            text: yvarname
	        }
	    },

	    tooltip: {
	        formatter: function () {
	            return '<b>' + this.x + '</b><br/>' +
	                this.series.name + ': ' + this.y + '<br/>'
	        }
	    },

	    plotOptions: {
	        column: {
	            stacking: 'normal'
	        }
	    },

	    series: cvarvalues.map(function(cv) {
			return {
					name:vm.model.NameLookUp(cv,cvar), 
					stack:cv, 
					data:
						vm.model.IsContinuous(xvarr)
							?
							//continuous
							data.filter(function(d) {return d[cvar]===cv;})
								.map(function(d) {return [+d[xvar],+d[yvar]]})
							:
							//categorical		
							xvarvalues.map(function(xv) {
								var dxc =  data.filter(function(d) {return (d[cvar]===cv) && (d[xvar]===xv);})
								return [xv,(dxc.length>0)?(+dxc[0][yvar]):0]
						})
				
					}
		})
	});
	
	
	// Timelapse animation
	function updateyear(yr) {

		curyearmessage.transition().duration(vm.timelapsespeed).text(yr); //Display year

		//pv.maintitle.text("");

		var dataset=data.filter(function(d) {return +d[vm.model.timevar]===yr}); //Select data corresponding to the year

		vm.TableView.makeDataTable(dataset,cvar,xvar,vm);
		
		//The data4bars is only needed for smooth transition in animations. There have to be rectangles of 0 height for missing data. data4bars is created
		//empty outside this function. The following loop fills in / updates to actual data values from current year

		d3.merge(data4bars).forEach(function(d) {d[yvar]=0;}); //Set every bar to 0 so that missing bars disappear

		dataset.forEach( function(d) { //Set the values of existing bars
			data4bars [ xScale.domain().indexOf(d[xvar]) ] [ cvarlist.indexOf(d[cvar]) ][yvar]=+d[yvar];
		});
		
  		var bars=chart.selectAll("rect.plotbar").data(d3.merge(data4bars));

  		// UPDATE
		  // Update old elements as needed.
		  
		bars
		   	.attr("fill",  function(d) {return colors(d[cvar])})
		   	.attr("x",function(d) {return xScale(d[xvar])+barwidth*cvarlist.indexOf(d[cvar]);})
		   	.transition().duration(vm.timelapsespeed)
		   	.attr("y",function(d) { return yScale(Math.max(0,+d[yvar]));})
		   	.attr("height",function(d) {return Math.abs(yScale(y0)-yScale(+d[yvar]));});

	};

	//Run timelapse animation
	if (vm.timelapse) {
		
		//This array is only needed for smooth transition in animations. There have to be bars of 0 height for missing data.
		//Create array with entry for all values of xvar and all values of cvar.
		var data4bars = xScale.domain().map(function(xv) {return cvarlist.map(function(cv) {return (obj={}, obj[xvar]=xv, obj[cvar]=cv,obj);});});

		//Create bars for every xvar/cvar combination
		chart.selectAll("rect.plotbar").remove();
		chart.selectAll("rect.plotbar").data(d3.merge(data4bars)).enter().append("rect").attr("class", "plotbar").attr("width", barwidth);
		
		var timerange = d3.extent(data, function(d) { return +d[vm.model.timevar] });
		var step=vm.model.LookUpVar(vm.model.timevar).range[2];
		var iy=Math.max(timerange[0], vm.timelapsefrom);
		var curyearmessage=svg.append("text").attr("x",width/2).attr("y",height/2).attr("font-size",100).attr("fill-opacity",.3);
		var intervalfunction = function() {
  			updateyear(iy);
  			if (iy<Math.min(timerange[1],vm.timelapseto)) iy+=step; else iy=Math.max(timerange[0], vm.timelapsefrom);
  			vm.TimeLapseCurrYear=iy;//vm.model[vm.model.timevar][iy];
			clearInterval(vm.tlint);
			vm.tlint=setInterval(intervalfunction, vm.timelapsespeed);
		}
		vm.tlint=setInterval(intervalfunction, vm.timelapsespeed);
	};

	//BDSVis.util.preparesavesvg();
};