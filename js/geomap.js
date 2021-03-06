var BDSVis = BDSVis || {};

//This function makes the geographical map
BDSVis.makeMap = function (data,request,vm,dataunfiltered) {
	//"vm" is the reference to ViewModel

	//Initialize the SVG elements and get width and length for scales
	var pv=vm.PlotView;
	pv.Refresh(data,request,vm);
	svg=pv.svg;
	width=pv.width;
	height=pv.height;

	$("#viewDiv").css({"width":pv.width, "height":pv.height});
	$("#viewAK").css({"width":.3*pv.width, "height":.3*pv.width});
	$("#viewHI").css({"width":.3*pv.width, "height":.3*pv.width});

	var yvar=request[vm.model.yvars];
	var yvarfullname=vm.model.NameLookUp(yvar,vm.model.yvars)
	var xvar=request.xvar;
	var xvarr= vm.model.LookUpVar(xvar);

	var LUName = function(d) {return vm.model.NameLookUp(d[xvar],xvar);} //Returns full name of the variable value by its value returned by IP (aka code), and varname

	var ContAKHI = function(name) { //Returns "AK", "HI" or "Continental" based on name
		if ((name==="Alaska")||(name.indexOf("AK")>-1)) return "AK";
		else if ((name==="Hawaii")||(name.indexOf("HI")>-1)) return "HI";
		else return "Continental";
	}

	//Filter by region
	data = data.filter(function(d1){
		return vm.model[xvar][vm.model[xvar].map(function(d) {return d.code}).indexOf(d1[xvar])].regions.indexOf(vm.region)>-1;
	})

	//Display data in the table below map
	vm.TableView.makeDataTable(data,request.cvar,request.xvar,vm);

	//This function displays numbers in "nice" format
	var NumFormat = function(d,sigdig) {
 	//"sigdig" is how many digits to show
 		var exp=Math.floor(Math.log(Math.abs(d))/Math.log(10))-sigdig+1;
 		var mantissa= Math.floor(d/(Math.pow(10,exp)));
 		var mstring0 = (mantissa*Math.pow(10,exp)).toString(),
 			mstring = mantissa.toString();
 		if (Math.abs(d)>1e+6)
 			return mstring0.slice(0,sigdig+exp-6)+((exp<6)?('.'+mstring.slice(sigdig+exp-6,sigdig)):"")+"M"
 		else if (Math.abs(d)>1e+3)
 			return mstring0.slice(0,sigdig+exp-3)+((exp<3)?('.'+mstring.slice(sigdig+exp-3,sigdig)):"")+"k"
 		else if (Math.abs(d)>1)
 			return mstring0.slice(0,sigdig+exp)+((exp<0)?('.'+mstring.slice(sigdig+exp,sigdig)):"")
 		else if (Math.abs(d)>5e-2)
 			return d.toPrecision(2)
 		else return d.toPrecision(sigdig)
 	};

 	//This function rounds the number up or down to sigdig significant decimal digits
 	var Round = function(d,sigdig,up) {
 		var exp=Math.floor(Math.log(Math.abs(d))/Math.log(10))-sigdig+1,
 			ratio = d/(Math.pow(10,exp)),
 			mantissa = up?Math.ceil(ratio):Math.floor(ratio)
 		return mantissa*Math.pow(10,exp)
 	}
	
	//Find maximal and minimal element of array
    var arraymin = function(a,b){return Math.min(a,b)};
    var arraymax = function(a,b){return Math.max(a,b)};

    //Find the range of the data values
    var sigdig=3;
	var ymin=Round(data.map(function(d){return +d[yvar]}).reduce(arraymin),sigdig,false);
	var ymax=Round(data.map(function(d){return +d[yvar]}).reduce(arraymax),sigdig,true);

	var maxabs=Math.max([Math.abs(ymin),Math.abs(ymax)]);

	var ymid= Round((vm.logscale && (ymin>0))?Math.sqrt(ymin*ymax):.5*(ymin+ymax),sigdig, false); 
	//function(ymin,ymax) {
	//	return 
	//};
	
	var purple="rgb(112,79,161)",
		golden="rgb(194,85,12)",
		teal="rgb(22,136,51)";

	//If there are negative values use blue to red scale with white(ish) for 0 and strength of color corresponding to absolute value
	var colorstopsarray=(ymin<0)?["#CB2027","white","#265DAB"]:[purple,"white",golden];

	var geo_data1=vm.model.geo_data[xvar].slice(0), //Data with geographical contours of states/MSA
		emptystates=0,
		//Time range of the time lapse
		timerange = [data.map(function(d){return +d[vm.model.timevar]}).reduce(function(a,b){return Math.min(a,b)}),data.map(function(d){return +d[vm.model.timevar]}).reduce(arraymax)]
			
	if (vm.timelapse) { //In time lapse regime, select only the data corresponding to the current year
		var datafull=data;
		data=data.filter(function(d) {return +d[vm.model.timevar]===timerange[0];});
	};


	//Put the states/MSAs in geo_data in the same order as they are in data

	var xir = data.map(LUName);
	//var xir = data.map(function(d) {return d[xvar]});
	for (var i in vm.model.geo_data[xvar]) {
		var iir = xir.indexOf(vm.model.geo_data[xvar][i].properties.name);
		if (iir === -1) { //If the state/MSA is not in data (e.g. Puerto Rico is never there), put it to the end of the array
			geo_data1[data.length+emptystates]=vm.model.geo_data[xvar][i];
			emptystates++;
		} else {
			geo_data1[iir]=vm.model.geo_data[xvar][i];
			for (var key in data[0])
				geo_data1[iir].properties[key]=data[iir][key]

			geo_data1[iir].properties.value=+data[iir].value
			if (vm.timelapse)
				//Map values from data elements corresponding to other years into the geographical elemets as features
				for (var yr=timerange[0];yr<timerange[1];yr++) {
					//debugger;
					var yeardata = datafull.filter(function(d) {return +d[vm.model.timevar]===yr;}),
						iyeardata = yeardata.map(LUName).indexOf(vm.model.geo_data[xvar][i].properties.name);
					geo_data1[iir].properties["value"+yr]=+yeardata[iyeardata].value
				}
		}
	};

	geo_data1=geo_data1.slice(0,data.length);
	geo_data1continental=geo_data1.filter(function(d) {return(ContAKHI(d.properties.name)==="Continental")});
	geo_data1AK=geo_data1.filter(function(d) {return(ContAKHI(d.properties.name)==="AK")});
	geo_data1HI=geo_data1.filter(function(d) {return(ContAKHI(d.properties.name)==="HI")});



	//Calculates geometric center of 2D points, flat geometry
	/*function geocenter(arr) {
		return arr.reduce(function(a,b) {return [a[0]+b[0],a[1]+b[1]]})
				.map(function(d) {return d/arr.length});
	}

	function azymin(a,b) {
		var a1 = (a>0)?a:(a+360)
		var b1 = (b>0)?b:(b+360)
		return (a1>b1)?b:a
	}

	function azymax(a,b) {
		var a1 = (a>0)?a:(a+360)
		var b1 = (b>0)?b:(b+360)
		return (a1>b1)?a:b
	}

	//Calculates xmin,ymin of 2D points
	function xymin(arr) {return arr.reduce(function(a,b){return [azymin(a[0],b[0]),Math.min(a[1],b[1])]});}

	//Calculates xmax,ymax of 2D points
	function xymax(arr) {return arr.reduce(function(a,b){return [azymax(a[0],b[0]),Math.max(a[1],b[1])]});}
	
	//Applies function func to nodes of the Polygon if the geometry of GeoJSON element is Polygon, or to each polygon of MultiPolygon
	var PolyOrMultipoly = function(d, func) {
		if (d.geometry.type==="Polygon") return func(d.geometry.coordinates[0])
			else return xymin(d.geometry.coordinates.map(function(d1){ return func(d1[0]); }))
	}

	var mapcenter = geocenter(geo_data1continental.map(function(d) {return PolyOrMultipoly(d, geocenter)}));
	var AKcenter;
	if (geo_data1AK.length>0)
		AKcenter = geocenter(geo_data1AK.map(function(d) {return PolyOrMultipoly(d, geocenter)}));

	var maplowboundary = xymin(geo_data1continental.map(function(d) {return PolyOrMultipoly(d, xymin)}));

	var maphighboundary = xymax(geo_data1continental.map(function(d) {return PolyOrMultipoly(d, xymax)}));*/


	//Use ArcGIS JavaScript API to display map from the data prepared above
	//Geographical map projectionf
	var wkid=102100;
	

	require([
		"esri/Map",
		"esri/views/MapView",
		"esri/views/SceneView",
		"esri/geometry/Extent",
		"esri/geometry/Polygon",
		"esri/layers/FeatureLayer",
		"esri/renderers/SimpleRenderer",
		"esri/symbols/SimpleFillSymbol",
		"esri/symbols/PolygonSymbol3D",
		"esri/symbols/ExtrudeSymbol3DLayer",
		"esri/widgets/Legend",
		"esri/renderers/smartMapping/creators/color",
		"esri/widgets/ColorSlider",
		"esri/widgets/Print",
		"esri/geometry/support/webMercatorUtils",
		"dojo/on",
		"dojo/domReady!"
    ], function(Map, MapView, SceneView, Extent, Polygon,FeatureLayer,SimpleRenderer,SimpleFillSymbol,
    	PolygonSymbol3D,ExtrudeSymbol3DLayer,Legend,colorRendererCreator,ColorSlider,Print,webMercatorUtils,on){

     	var fields = [
			{
				name: "geoid",
				alias: "geoid",
				type: "oid"
			/*}, {
				name: "landarea",
				alias: "landarea",
				type: "int"
			}, {
				name: "name",
				alias: "name",
				type: "string"
			}, {
				name: "value",
				alias: " ",//yvarfullname,
				type: "int"*/
			}
     	];

		var pTemplate = {
			title: "{name}",
			content: [{
				type: "fields",
				fieldInfos: [ {
					fieldName: "value",
					label: yvarfullname,
				}
				]
			}]
		};
		
		//Set the title of the plot and fill the popup template
		var ptitle=yvarfullname; //If many yvars say "various", otherwise the yvar name
		for (var key in data[0]) {
			//X-var should not be in the title, yvar is taken care of. Also check that the name exists in model.variables (e.g. yvar names don't)
			if ((key!==xvar) && (key!==vm.model.yvars) && !((key===vm.model.timevar) && (vm.timelapse)) && (vm.model.VarExists(key))) {
				pTemplate.content[0].fieldInfos.push(
						{
							fieldName: key,
							label: vm.model.NameLookUp(key,"var"),
							visible: true
						}
					)
				ptitle+=vm.model.PrintTitle(data[0][key],key);
			}
		};
		vm.PlotView.ptitle = ptitle

		var symbol = (vm.extruded && vm.mapin3D )?
						new PolygonSymbol3D({
							symbolLayers: [new ExtrudeSymbol3DLayer()]  // creates volumetric symbols for polygons that can be extruded
						}): 
						new SimpleFillSymbol({
							//color: [227, 139, 79, 0.8],//yScale(g.attributes.value),//[227, 139, 79, 0.8],
							outline: { // autocasts as new SimpleLineSymbol()
								color: [255, 255, 255],
								width: .3
							}
						});
		/*symbol: ,*/

		var visualVariables = [
	        	{
					type: "color",
					field: "value",
					stops: [
						{
							value: ymin,
							color: colorstopsarray[0],
							label: NumFormat(ymin,sigdig)
						},
						{
							value: ymid,
							color: colorstopsarray[1],
							label: NumFormat(ymid,sigdig)
						},
						{
							value: ymax,
							color: colorstopsarray[2],
							label: NumFormat(ymax,sigdig)
					}]
        		}]

        if (vm.extruded && vm.mapin3D) visualVariables.push(
			{
				type: "size",
				field: "value",
				stops: [
					{
						value: ymin,
						size: 10000,
						label: NumFormat(ymin,sigdig)
					},
					{
							value: ymid,
							size: 155000,
							label: NumFormat(ymid,sigdig)
					},
					{
						value: ymax,
						size: 300000,
						label: NumFormat(ymax,sigdig)
					}
				]
			}
			)

		var renderer = new SimpleRenderer({
			symbol: symbol,
			label: yvarfullname,
	        visualVariables: visualVariables
		});

		//$('body').append(JSON.stringify(geo_data1))

		if (pv.arcgismap===undefined)
			pv.arcgismap = new Map({
				basemap: "gray",
				//layers: [lr]
			});

		var viewparams = {
			container: "viewDiv",  // Reference to the scene div created in step 5
			map: pv.arcgismap,  // Reference to the map object created before the scene
			//zoom: 4,  // Sets the zoom level based on level of detail (LOD)
			//center: mapcenter,  // Sets the center point of view in lon/lat
			ui: {
				padding: {
					top: 5,
					bottom: 20,
					left: 5,
					right: 5,
				}	
			}	
		};

		



		if (pv.arcgisview===undefined)
			pv.arcgisview = (vm.mapin3D)?(new SceneView(viewparams)):(new MapView(viewparams));

		var graphics=createGraphics(geo_data1);

		var lr=createLayer(graphics);

		/*lr.then(function(layer) {
			//console.log("layer done")
			createLegend(layer)

		})*/

		if (pv.legend) {
			pv.legend.layerInfos = [{
				layer: lr,
				title: " "//ptitle
			}];
		} else {
			pv.legend = new Legend({
				view: pv.arcgisview,
				layerInfos: [
				{
					layer: lr,
					title: " "//ptitle
				}]
			}, "infoDiv");
		}

		//Widget for Printing/Exporting to PDF
		pv.printwidgeton = false;
		pv.printview = new Print({
            view: pv.arcgisview,
            // specify your own print service
            printServiceUrl: "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
        });


		pv.arcgisview.ui.add(pv.legend, "bottom-right");
		//pv.arcgisview.ui.add("cvarselector", "top-right");
		//pv.arcgisview.ui.add(pv.printview, "top-right");

		//Alaska View
		if (geo_data1AK.length>0 & !vm.mapin3D) {
			var viewparamsAK = {
				container: "viewAK",  // Reference to the scene div created in step 5
				map: pv.arcgismap,  // Reference to the map object created before the scene
				zoom: 3,  // Sets the zoom level based on level of detail (LOD)
				center: [-155, 63],  // Sets the center point of view in lon/lat
				ui: {
					padding: {
						top: 0,
						bottom: 0,
						left: 0,
						right: 0,
					}	
				}	
			};
			//p["attribution", "zoom"]
			if (pv.akview===undefined)
				pv.akview = new MapView(viewparamsAK);
				pv.akview
					.then(function(view){
							pv.AdjustUIElements(vm)
					}).otherwise(function(err) {console.log("view rejected:",err)})
				pv.akview.ui.components=[]
		} else $("#viewAK").css({"width":0, "height":0});

		//Hawaii view
		if (((geo_data1HI.length>0) || (geo_data1AK.length>0)) & !vm.mapin3D)  {
			var viewparamsHI = {
				container: "viewHI",  // Reference to the scene div created in step 5
				map: pv.arcgismap,  // Reference to the map object created before the scene
				zoom: 6,  // Sets the zoom level based on level of detail (LOD)
				center: [-158, 20],  // Sets the center point of view in lon/lat
				ui: {
					padding: {
						top: 0,
						bottom: 0,
						left: 0,
						right: 0,
					}	
				}	
			};
			if (pv.hiview===undefined)
				pv.hiview = new MapView(viewparamsHI);
				pv.hiview
					.then(function(view){
							pv.AdjustUIElements(vm)
					}).otherwise(function(err) {console.log("view rejected:",err)})
				pv.hiview.ui.components=[]
		} else $("#viewHI").css({"width":0, "height":0});

		pv.arcgisview
			.then(function(view){
				pv.AdjustUIElements(vm)
				view.goTo({
					target: graphics.filter(function(d){return(ContAKHI(d.attributes.name)==="Continental");}).map(function(d){return d.geometry}),
					heading: 0,
					//tilt:
				}).then(function() {
					
					if (vm.mapin3D)
						view.zoom = view.zoom+.75;

					//Run timelapse animation
					if (vm.timelapse) {
						var iy=Math.max(timerange[0], vm.timelapsefrom);
						var step=vm.model.LookUpVar(vm.model.timevar).range[2];
		
						var intervalfunction = function() {
				  			updateyear(iy,lr);
				  			if (iy<Math.min(timerange[1],vm.timelapseto)) iy+=step; else iy=Math.max(timerange[0], vm.timelapsefrom);
				  			vm.TimeLapseCurrYear=iy;//vm.model[vm.model.timevar][iy];
							clearInterval(vm.tlint);
							vm.tlint=setInterval(intervalfunction, vm.timelapsespeed);
						}

						vm.tlint=setInterval(intervalfunction, vm.timelapsespeed);
					};
					
					
				})
			}).otherwise(function(err) {console.log("view rejected:",err)})


        function createLayer(graphics) {
        	pv.arcgismap.removeAll()
			lyrf = 
				new FeatureLayer({
					source: graphics, // autocast as an array of esri/Graphic
					objectIdField: "geoid",
					geometryType: "polygon",
					fields: fields,
					renderer: renderer, 
					popupTemplate: pTemplate,
					spatialReference: { wkid: wkid },		
				});
			
			pv.arcgismap.add(lyrf)
			return lyrf;
		}


		function createGraphics(geoJson) {
	        // Create an array of Graphics from each GeoJSON feature
			return geoJson.map(function(feature) {

				var attributes = {}
				for (var key in feature.properties)
					attributes[key]=vm.model.VarExists(key)?vm.model.NameLookUp(feature.properties[key],key):feature.properties[key]			

				return { 
					geometry: new Polygon({
						rings: (feature.geometry.type==="Polygon")?
								feature.geometry.coordinates[0]: //If the contour is a single polygon, return the coordinates of its nodes
								feature.geometry.coordinates.map(function(d1) {return d1[0]}), //Else (MultiPolygon) return array for each polygon
						}),
					attributes: attributes
			  	};
			});
	    }

	    // Timelapse animation
		function updateyear(yr,lr) {
			//curyearmessage.text(vm.model[vm.model.timevar][yr]); //Display year
			//curyearmessage.text(yr); //Display year
			//pv.maintitle.text("");
			//debugger;
			var dataset=datafull.filter(function(d) {return +d[vm.model.timevar]===yr}); //Select data corresponding to the year
			vm.TableView.makeDataTable(dataset,vm.model.yvars,xvar,vm); //Change the data that is displayed raw as a table
			var curryearrenderer = lr.renderer.clone();
			curryearrenderer.visualVariables[0].field="value"+yr;
			if (vm.extruded && vm.mapin3D) curryearrenderer.visualVariables[1].field="value"+yr;
			lr.renderer = curryearrenderer;
			pv.legend.layerInfos = [{
				layer: lr,
				title: yr//ptitle
			}];
		};

	    /*function createLegend(layer) {
			// if the legend already exists, then update it with the new layer
			if (pv.legend) {
				pv.legend.layerInfos = [{
					layer: layer,
					title: ptitle
				}];
			} else {
				pv.legend = new Legend({
					view: pv.arcgisview,
					layerInfos: [
					{
						layer: layer,
						title: ptitle
					}]
				}, "infoDiv");
				pv.legend.then(pv.AdjustUIElements(vm))
			}
			return pv.legend
		}*/
    });
};