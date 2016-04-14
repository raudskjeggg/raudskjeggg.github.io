var BDSVis = BDSVis || {};

//The visual elements of the plot: SVGs for the graph/map and legend
BDSVis.PlotView = {
	margin : {top: 20, right: 30, bottom: 20, left: 80},
	width0 : 850,
	height0 : 450,
	legendwidth: 250,
	titleheight: 15,
	xaxislabelheight: 20,
	Init : function() {
		//Define margins and dimensions of the SVG element containing the chart
		var margin = this.margin;

		this.width = this.width0 - margin.left - margin.right;
		this.height = this.height0 - margin.top - margin.bottom;
		var width=this.width;
		var height=this.height;

		//Select the SVG element, remove old drawings, add grouping element for the chart
		var svgcont = d3.select("#chartsvg");
		svgcont.selectAll("*").remove();

		this.svg=svgcont.attr("width", width + margin.left + margin.right+this.legendwidth)
			.attr("height", height + margin.top + margin.bottom + this.titleheight + this.xaxislabelheight)
			.append('g')
			.attr("transform", "translate(" + margin.left + "," + (margin.top+this.titleheight)+ ")")
			.attr('class', 'chart');

		d3.select("#buttonsundergraph").style("width",width + margin.left+"px");
		d3.select("#plotarea").style("width", width + margin.left + margin.right+this.legendwidth+"px");
		d3.select(".waiting-caption").style("width", width + margin.left + margin.right+this.legendwidth+"px");

		//d3.select("#graphdata").style("height", height + margin.top + margin.bottom-21+"px");

		//Clear legend, set size
		// this.legendsvg=d3.select("#legend").attr("width",400).attr("height",300);
		// this.legendsvg.selectAll("*").remove();
		this.legendx=width+margin.left+ margin.right;
		this.legendsvg=d3.select("#chartsvg")
			.append("g")
			.attr("transform","translate("+(width+margin.left+ margin.right)+","+height*.3+")")
			.attr("class","leglabel legbox");
		
		//X-axis label
		this.xaxislabel=d3.select("#chartsvg").append("text")
			.attr("class","xaxislabel")
			.attr("y",(height + margin.top + this.xaxislabelheight + this.titleheight));

		//Y-axis label
		this.yaxislabel=d3.select("#chartsvg").append("text")
			.attr("class","yaxislabel")
			.attr("transform","translate("+16+","+.5*(height + margin.top + this.xaxislabelheight + this.titleheight)+")rotate(-90)");

		this.lowerrightcornertext=d3.select("#chartsvg").append("text").attr("class","leglabel")
			.attr("x",width+margin.left+ margin.right)
			.attr("y",this.height0-margin.bottom);
	},

	DisplayNoData : function() {
		d3.select("#chartsvg").append("text").attr("class","graphtitle").attr("x",this.width0/2).attr("y",this.height0/2).text("No data");
	},

	SetPlotTitle : function(ptitle) {
		var pv = this;
		this.maintitle=d3.select("#chartsvg")
			.append("text").attr("class","graph-title")
			.text(ptitle)
			.attr("dy",1+"em").attr("y","0");
		this.maintitle.call(BDSVis.util.wrap,pv.width);
		this.maintitle.selectAll("tspan").attr("x",function(d) { return (pv.legendx-this.getComputedTextLength())/2.; });
	},

	SetXaxisLabel : function(xlab,offset) {
		var offs = offset || 0;
		var pv = this;
		var h = pv.margin.top + pv.margin.bottom + pv.titleheight + pv.svg.node().getBBox().height+offs;
		this.xaxislabel
			.text(xlab)
			.attr("x",function(d) { return (pv.margin.left+pv.margin.right+pv.width-this.getComputedTextLength())/2.; })
			.attr("y",h);
		
		d3.select("#chartsvg").attr("height",h+pv.margin.bottom);
	}
};