window.App.Sidebar.Plot.categoricalConfig = {
  exporting: {
    enabled: false
  },
  chart: {
    renderTo: 'plot',
    type: 'bar',
    marginRight: 150,
        // margin: [0,0,0,0]
      },
      title: {
        text: null
      // enable: false
    },
    xAxis: {
      categories: [],
      title: {
        text: 'Combination',
        align: 'middle'
      },
      labels: {
        overflow: 'justify'
      },
    },
    yAxis: {
        // use for percentages:
        // min: 0,
        // max: 100,
        title: {
          text: 'Count',
          align: 'middle'
        },
        labels: {
          overflow: 'justify'
        }
      },
      tooltip: {
        formatter: function() { 
          return this.point.originalLabel;
        }
      },
      plotOptions: {
        bar: {
          dataLabels: {
            enabled: true
          }
        }
      },
      legend: {
        layout: 'vertical',
        align: 'right',
        verticalAlign: 'top',
        x: -10,
        y: 10,
        floating: true,
        borderWidth: 1,
        backgroundColor: '#FFFFFF',
        shadow: true
      },
      credits: {
        enabled: false
      },
      series: [{ name: '', data: [] }]
    };


// B&B, B&C, C&C
window.App.Sidebar.Plot.categorical = function(params)
{
  var sourcePatientValues = params.sourceO.patientvals;
  var targetPatientValues = params.targetO.patientvals;
  var sourceLabel = params.sourceO.label;
  var targetLabel = params.targetO.label;

  var chartConfig = App.Sidebar.Plot.categoricalConfig;
  chartConfig.series = [{ name: '', data: [] }];
  var truncateLabel = App.Utilities.truncateLabel;
  var categories;

  var getCategories = function( array1, array2, label1, label2 )
  {
    var categoryCounts = {};
    var result = {};
    var originalNames = {};
    var categoryName;
    var stringArr;
    var ele2;
    var catName;

        // calculate categories (something-something)
        $.each( array1, function(ind, ele1) 
        {
          ele2 = array2[ind];
          if( ele1.toLowerCase() === 'na' || ele2.toLowerCase() === 'na' ) return true;

          // use weird attaching character to avoid collisions in hash map
          categoryName = ele1 + "___" + ele2;
          !categoryCounts.hasOwnProperty( categoryName ) ? categoryCounts[ categoryName ] = Number(0) : categoryCounts[ categoryName ]++;
        });

        // construct final strings and percentages
        $.each( categoryCounts, function(cat, count)
        {
          stringArr = cat.split("___");
          catName = truncateLabel(label1) + "(<b>" + truncateLabel(stringArr[0]) + "</b>) <br> and " + truncateLabel(label2) + "(<b>" + truncateLabel(stringArr[1]) + "</b>)";
          
          // use count value instead of percentages
          result[ catName ] = count;
          //result[ catName ] = Math.round( ( count / array1.length ) * 100 );
          originalNames[ catName ] = label1 + "(<b>" + stringArr[0] + "</b>) <br> and " + label2 + "(<b>" + stringArr[1] + "</b>)";
        });
        return { categories: result, originalNames: originalNames };
      };

      categories = getCategories( sourcePatientValues, targetPatientValues, sourceLabel, targetLabel );

      // truncate labels, they might be too long. tooltip will show it in full
      chartConfig.series[0]['name'] = "<b>" + truncateLabel( sourceLabel ) + "</b>,<br> and <br><b>" + truncateLabel( targetLabel ) + "</b>";

      chartConfig.xAxis['categories'] = d3.keys( categories.categories ).sort( function(a,b) { return categories.categories[a] < categories.categories[b] } );
      $.each( chartConfig.xAxis['categories'], function( ind, cat )
      {
        chartConfig.series[0].data.push( { y: categories.categories[cat], originalLabel: categories.originalNames[cat] } );
      });

      // render
      chart = new Highcharts.Chart(chartConfig);
    };




    window.App.Sidebar.Plot.BoxPlotInfoConfig = {
      exporting: {
        enabled: false
      },
      chart: {
        renderTo: 'boxplotinfo',
        type: 'bar',
            // margin: [0,0,0,0]
          },
          title: {
            text: null
          // enable: false
        },
        xAxis: {
            //categories: $.distinct( patientSampleClassifications, false ),
            title: {
              text: 'Sample class',
              align: 'middle'
            },
            labels: {
              overflow: 'justify'
            },
          },
          yAxis: {
            min: 0,
            max: 100,
            title: {
              text: 'Percent',
              align: 'middle'
            },
            labels: {
              overflow: 'justify'
            }
          },
          tooltip: {
            formatter: function() { return "<b>" + this.series.name + "</b>: " + this.y + "%"; }
          },
          plotOptions: {
            bar: {
              dataLabels: {
                enabled: true
              }
            }
          },
          legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'bottom',
            x: -15,
            y: -60,
            floating: true,
            borderWidth: 1,
            backgroundColor: '#FFFFFF',
            shadow: true
          },
          credits: {
            enabled: false
          },
          series: []
        };

        window.App.Sidebar.Plot.boxPlotInfo = function(params)
        {
          var chartConfig = App.Sidebar.Plot.BoxPlotInfoConfig;
          chartConfig.series = [];
          var categoricalValues = params.categoricalO.patientvals;
          var patientSampleClassifications = App.Models.datasets.get('active').get('samples');

          var chart;
          var series = {};
          var category;
          var classification;
          var percentage;

          var categoryEmpty = function( catCounts, categoryName )
          {
            var keys = d3.keys(catCounts);
            for( var i = 0; i < keys.length; ++i )
            {
              if( catCounts[ keys[i] ][categoryName] > 0 )
              {
                return false;
              }
            }
            return true;
          };

          var nonEmptyCategories = function( catCounts )
          {
            var array = [];
            $.each( d3.values(catCounts)[0], function(key,count)
            {
              if( key !== "_count" && !categoryEmpty( catCounts, key ))
              {
                array.push( key );
              }
            });
            return array;
          };

          // create series for each category
          //["PCaN", "PCaP", "CRPC", "BPH"]
          //[0.2, 0.2, 0.2, 0.4]

          // initialize structure:
          var categoryCounts = {};
          $.each( $.distinct( categoricalValues, true ), function(ind, category)
          {
            categoryCounts[ String( category ) ] = {};
            $.each( patientSampleClassifications, function( indP, classification )
            {
              categoryCounts[String(category)][classification] = Number(0);
              categoryCounts[String(category)]["_count"] = Number(0);
            });
          });

          // var classificationCount = Number(0);
          $.each( d3.zip( categoricalValues, patientSampleClassifications ), function(ind, pair)
          {
            category = String(pair[0]);
            classification = pair[1];
            if( category.toLowerCase() !== 'na' )//&& classification.toLowerCase() !== 'na' )
          {
            categoryCounts[ category ][ classification ] += 1;
            categoryCounts[String(category)]._count += 1;
          }
        });
          $.each( categoryCounts, function(cat,obj)
          {
            series = {};
            series['name'] = cat;
            series['data'] = [];
            $.each( obj, function(classif, count)
            {
              if( classif === "_count" ) return true;
              if( categoryEmpty( categoryCounts, classif ) ) return true;
              percentage = Math.round( ( count / obj._count ) * 100 );
              series.data.push( percentage );

            });
            chartConfig.series.push(series);
          });

          chartConfig.xAxis['categories'] = nonEmptyCategories(categoryCounts);

          // render
          chart = new Highcharts.Chart(chartConfig);
        };


// Try highcharts boxplot instead

// highcharts
window.App.Sidebar.Plot.BoxPlotConfig = {
  // custom options, not part of highcharts:
  custom: {
    boxWidth: 15
  },

  chart: {
    renderTo: 'plot',
    defaultSeriesType: 'scatter',
    reflow: false,
    margin: [20,30,60,70]
  },
  credits: {
   enabled: false
 },
 exporting: {
  enabled: false
},
title: {
  text: null
      // enable: false
    },    
    tooltip:{
     formatter: function()
     {
       var s = '<b>'+this.x+'</b>';
       for(var i = this.points.length-1; i>-1; i--)
       {
         colors = ["red","#444", "green", "#444", "blue"];
         s = s + ['<br>','<span style="color:' + colors[i] + '">', this.points[i].series.name, '</span>: ',
         '<b>', Highcharts.numberFormat(this.points[i].y, 0), '</b>'].join('');
       }
       return s;    
     },
     shared:true         
   },
   legend:{
     enabled:false
   },
   xAxis:{
    // categories:['Comp', 'Standard', 'kolmas', 'neljäs','viides','kuudes'],
    categories: [],
    labels: {
        //rotation: -90,
        align: 'right',
        style: {
          fontSize: '10px',
          fontFamily: 'Verdana, sans-serif'
        }
      }      
    },
    yAxis:{
      labels:{
        formatter: function(){ return this.value; }
      },
      title: {
        text: 'Values',
        align: 'middle'
      },
    },
    plotOptions:{       
    }
};

window.App.Sidebar.Plot.boxPlot = function(params)
{
  var conf = App.Sidebar.Plot.BoxPlotConfig;
  // dont use previous results
  conf.xAxis.categories = [];
  conf['series'] = [];

  var categories = {};
  var seriesNames = ['Minimum', '1st Quartile', 'Median', '3rd Quartile', 'Maximum'];
  var dataIndices = { 'min': 0, 'quartile1': 1, 'median': 2, 'quartile3': 3, 'max': 4 };

  // temps
  var categoryVal;
  var numericalVal;
  var series;


  // construct categories
  for( var i = 0; i < params.categoricalO.patientvals.length; ++i )
  {
    categoryVal = params.categoricalO.patientvals[i];
    numericalVal = params.numericalO.patientvals[i];
    if( !isNaN(numericalVal) )
    {
      ( categories[ categoryVal ] || ( categories[ categoryVal ] = [] ) ).push( +numericalVal );  
    }
  }

  $.each( seriesNames, function(ind,name) {
    series = {};
    series['name'] = name;
    series['marker'] = { enabled: false };
    series['data'] = [];

    // add category names
    conf.xAxis.categories = _.map( _.keys( categories ), function(name) { return App.Utilities.truncateLabel( name ); } );

    $.each( categories, function(category, values) {
      // required by quantile function
      values.sort( d3.ascending );

      switch( ind )
      {
        case dataIndices['min']: series.data.push( _.min( values ) ); break;
        case dataIndices['quartile1']: series.data.push( d3.quantile( values, 0.25 ) ); break;
        case dataIndices['median']: series.data.push( d3.median( values ) ); break;
        case dataIndices['quartile3']: series.data.push( d3.quantile( values, 0.75 ) ); break;
        case dataIndices['max']: series.data.push( _.max( values ) ); break;
      }
    });
    conf.series.push( series );    
  });

  var drawingFunction = function(chart) {
    var min = chart.series[dataIndices['min']].data;
    var quartile1 = chart.series[dataIndices['quartile1']].data;
    var median = chart.series[dataIndices['median']].data;
    var quartile3 = chart.series[dataIndices['quartile3']].data;
    var max = chart.series[dataIndices['max']].data;
    var translate = 20; // padding between symbols and boxes

    for(i=0; i<quartile1.length; i++)
    {

        // add the box for each category
        chart.renderer.rect(
             quartile3[i].plotX-(conf.custom.boxWidth/2)+chart.plotLeft-translate, //x
             quartile3[i].plotY+chart.plotTop, //y
             conf.custom.boxWidth, //width
             quartile1[i].plotY-quartile3[i].plotY, //height
             0) // cornerRadius
        .attr({
          'stroke-width': 1,
          stroke: '#aaa',
          fill: '#ccc',
          zIndex:4
        }).add();  

       // max value line
       chart.renderer.path(['M', max[i].plotX-(conf.custom.boxWidth/2)+chart.plotLeft-translate, max[i].plotY+chart.plotTop,
        'L', max[i].plotX+(conf.custom.boxWidth/2)+chart.plotLeft-translate, max[i].plotY+chart.plotTop ])
       .attr({
        'stroke-width': 1,
        stroke: 'blue',
        zIndex:5
      }).add();  

        // median value line
        chart.renderer.path(['M',median[i].plotX-(conf.custom.boxWidth/2)+chart.plotLeft-translate,median[i].plotY+chart.plotTop,
          'L',median[i].plotX+(conf.custom.boxWidth/2)+chart.plotLeft-translate,median[i].plotY+chart.plotTop])
        .attr({
          'stroke-width': 1,
          stroke: 'green',
          zIndex:5
        }).add();  

        // minimum value line
        chart.renderer.path(['M', min[i].plotX-(conf.custom.boxWidth/2)+chart.plotLeft-translate, min[i].plotY+chart.plotTop,
          'L', min[i].plotX+(conf.custom.boxWidth/2)+chart.plotLeft-translate, min[i].plotY+chart.plotTop])
        .attr({
          'stroke-width': 1,
          stroke: 'red',
          zIndex:5
        }).add();

       // line from box to endpoints
       chart.renderer.path(['M', min[i].plotX+chart.plotLeft-translate, min[i].plotY+chart.plotTop,
        'L', max[i].plotX+chart.plotLeft-translate, max[i].plotY+chart.plotTop])
       .attr({
        'stroke-width': 1,
        stroke: '#aaa',
        zIndex:3
      })
       .add();          
     }

   };

// render
var chart = new Highcharts.Chart( conf, drawingFunction );
};




window.App.Sidebar.Plot.BoxPlotConfigD3 = {
  container: "#plot",
  margin: {top: 10, right: 50, bottom: 10, left: 50},
};


window.App.Sidebar.Plot.boxPlotD3 = function(params)
{
  var conf = App.Sidebar.Plot.BoxPlotConfigD3;
  var categoricalValues = params.categoricalO.patientvals;
  var numericValues = params.numericalO.patientvals;

        // $(conf.container).css('padding-left', 50);
        var width = 120 - conf.margin.left - conf.margin.right,
        height = 250 - conf.margin.top - conf.margin.bottom;

        var min = Infinity,
        max = -Infinity;

        var chart = boxChart()
        .whiskers(iqr(1.5))
        .width(width)
        .height(height);


        // put each each valueset into its own dataset
        // var categories = $.distinct( categoricalValues );
        var dataDict = {};
        var data = [];

        $.each( $.distinct( categoricalValues, true ), function(ind,category)
        {
          dataDict[ category ] = [];
        });

        $.each( numericValues, function(ind, value)
        {
          if( !isNaN( value) && categoricalValues[ind].toLowerCase() !== 'na' )
          {
            dataDict[ categoricalValues[ind] ].push( Number(value) );
          }
        });
        $.each( dataDict, function(ind, valueSet)
        {
          data.push( valueSet );
        });

        min = d3.min( $.map( data, function(n) { return n; } ) );
        max = d3.max( $.map( data, function(n) { return n; } ) );

        chart.domain([min, max]);

        var vis = d3.select("#plot").selectAll("svg")
        .data(data)
        .enter().append("svg")
        .attr("class", "box")
        .attr("width", width + conf.margin.left + conf.margin.right)
        .attr("height", height + conf.margin.bottom + conf.margin.top)
        .append("g")
        .attr("transform", "translate(" + conf.margin.left + "," + conf.margin.top + ")")
        .call(chart);

        chart.duration(1000);
        window.transition = function() {
          vis.datum(randomize).call(chart);
        };

        function randomize(d) {
          if (!d.randomizer) d.randomizer = randomizer(d);
          return d.map(d.randomizer);
        }

        function randomizer(d) {
          var k = d3.max(d) * .02;
          return function(d) {
            return Math.max(min, Math.min(max, d + k * (Math.random() - .5)));
          };
        }

        // Returns a function to compute the interquartile range.
        function iqr(k) {
          return function(d, i) {
            var q1 = d.quartiles[0],
            q3 = d.quartiles[2],
            iqr = (q3 - q1) * k,
            i = -1,
            j = d.length;
            while (d[++i] < q1 - iqr);
            while (d[--j] > q3 + iqr);
            return [i, j];
          };
        }

        // Inspired by http://informationandvisualization.de/blog/box-plot
        function boxChart() {
          var width = 1,
          height = 1,
          duration = 0,
          domain = null,
          value = Number,
          whiskers = boxWhiskers,
          quartiles = boxQuartiles,
          tickFormat = null;

          // For each small multiple…
          function box(g) {
            g.each(function(d, i) {
              d = d.map(value).sort(d3.ascending);
              var g = d3.select(this),
              n = d.length,
              min = d[0],
              max = d[n - 1];

              // Compute quartiles. Must return exactly 3 elements.
              var quartileData = d.quartiles = quartiles(d);

              // Compute whiskers. Must return exactly 2 elements, or null.
              var whiskerIndices = whiskers && whiskers.call(this, d, i),
              whiskerData = whiskerIndices && whiskerIndices.map(function(i) { return d[i]; });

              // Compute outliers. If no whiskers are specified, all data are "outliers".
              // We compute the outliers as indices, so that we can join across transitions!
              var outlierIndices = whiskerIndices
              ? d3.range(0, whiskerIndices[0]).concat(d3.range(whiskerIndices[1] + 1, n))
              : d3.range(n);

              // Compute the new x-scale.
              var x1 = d3.scale.linear()
              .domain(domain && domain.call(this, d, i) || [min, max])
              .range([height, 0]);

              // Retrieve the old x-scale, if this is an update.
              var x0 = this.__chart__ || d3.scale.linear()
              .domain([0, Infinity])
              .range(x1.range());

              // Stash the new scale.
              this.__chart__ = x1;

              // Note: the box, median, and box tick elements are fixed in number,
              // so we only have to handle enter and update. In contrast, the outliers
              // and other elements are variable, so we need to exit them! Variable
              // elements also fade in and out.

              // Update center line: the vertical line spanning the whiskers.
              var center = g.selectAll("line.center")
              .data(whiskerData ? [whiskerData] : []);

              center.enter().insert("svg:line", "rect")
              .attr("class", "center")
              .attr("x1", width / 2)
              .attr("y1", function(d) { return x0(d[0]); })
              .attr("x2", width / 2)
              .attr("y2", function(d) { return x0(d[1]); })
              .style("opacity", 1e-6)
              .transition()
              .duration(duration)
              .style("opacity", 1)
              .attr("y1", function(d) { return x1(d[0]); })
              .attr("y2", function(d) { return x1(d[1]); });

              center.transition()
              .duration(duration)
              .style("opacity", 1)
              .attr("y1", function(d) { return x1(d[0]); })
              .attr("y2", function(d) { return x1(d[1]); });

              center.exit().transition()
              .duration(duration)
              .style("opacity", 1e-6)
              .attr("y1", function(d) { return x1(d[0]); })
              .attr("y2", function(d) { return x1(d[1]); })
              .remove();

              // Update innerquartile box.
              var box = g.selectAll("rect.box")
              .data([quartileData]);

              box.enter().append("svg:rect")
              .attr("class", "box")
              .attr("x", 0)
              .attr("y", function(d) { return x0(d[2]); })
              .attr("width", width)
              .attr("height", function(d) { return x0(d[0]) - x0(d[2]); })
              .transition()
              .duration(duration)
              .attr("y", function(d) { return x1(d[2]); })
              .attr("height", function(d) { return x1(d[0]) - x1(d[2]); });

              box.transition()
              .duration(duration)
              .attr("y", function(d) { return x1(d[2]); })
              .attr("height", function(d) { return x1(d[0]) - x1(d[2]); });

              // Update median line.
              var medianLine = g.selectAll("line.median")
              .data([quartileData[1]]);

              medianLine.enter().append("svg:line")
              .attr("class", "median")
              .attr("x1", 0)
              .attr("y1", x0)
              .attr("x2", width)
              .attr("y2", x0)
              .transition()
              .duration(duration)
              .attr("y1", x1)
              .attr("y2", x1);

              medianLine.transition()
              .duration(duration)
              .attr("y1", x1)
              .attr("y2", x1);

              // Update whiskers.
              var whisker = g.selectAll("line.whisker")
              .data(whiskerData || []);

              whisker.enter().insert("svg:line", "circle, text")
              .attr("class", "whisker")
              .attr("x1", 0)
              .attr("y1", x0)
              .attr("x2", width)
              .attr("y2", x0)
              .style("opacity", 1e-6)
              .transition()
              .duration(duration)
              .attr("y1", x1)
              .attr("y2", x1)
              .style("opacity", 1);

              whisker.transition()
              .duration(duration)
              .attr("y1", x1)
              .attr("y2", x1)
              .style("opacity", 1);

              whisker.exit().transition()
              .duration(duration)
              .attr("y1", x1)
              .attr("y2", x1)
              .style("opacity", 1e-6)
              .remove();

              // Update outliers.
              var outlier = g.selectAll("circle.outlier")
              .data(outlierIndices, Number);

              outlier.enter().insert("svg:circle", "text")
              .attr("class", "outlier")
              .attr("r", 5)
              .attr("cx", width / 2)
              .attr("cy", function(i) { return x0(d[i]); })
              .style("opacity", 1e-6)
              .transition()
              .duration(duration)
              .attr("cy", function(i) { return x1(d[i]); })
              .style("opacity", 1);

              outlier.transition()
              .duration(duration)
              .attr("cy", function(i) { return x1(d[i]); })
              .style("opacity", 1);

              outlier.exit().transition()
              .duration(duration)
              .attr("cy", function(i) { return x1(d[i]); })
              .style("opacity", 1e-6)
              .remove();

              // Compute the tick format.
              var format = tickFormat || x1.tickFormat(8);

              // Update box ticks.
              var boxTick = g.selectAll("text.box")
              .data(quartileData);

              boxTick.enter().append("svg:text")
              .attr("class", "box")
              .attr("dy", ".3em")
              .attr("dx", function(d, i) { return i & 1 ? 6 : -6 })
              .attr("x", function(d, i) { return i & 1 ? width : 0 })
              .attr("y", x0)
              .attr("text-anchor", function(d, i) { return i & 1 ? "start" : "end"; })
              .text(format)
              .transition()
              .duration(duration)
              .attr("y", x1);

              boxTick.transition()
              .duration(duration)
              .text(format)
              .attr("y", x1);

              // Update whisker ticks. These are handled separately from the box
              // ticks because they may or may not exist, and we want don't want
              // to join box ticks pre-transition with whisker ticks post-.
              var whiskerTick = g.selectAll("text.whisker")
              .data(whiskerData || []);

              whiskerTick.enter().append("svg:text")
              .attr("class", "whisker")
              .attr("dy", ".3em")
              .attr("dx", 6)
              .attr("x", width)
              .attr("y", x0)
              .text(format)
              .style("opacity", 1e-6)
              .transition()
              .duration(duration)
              .attr("y", x1)
              .style("opacity", 1);

              whiskerTick.transition()
              .duration(duration)
              .text(format)
              .attr("y", x1)
              .style("opacity", 1);

              whiskerTick.exit().transition()
              .duration(duration)
              .attr("y", x1)
              .style("opacity", 1e-6)
              .remove();
            });
d3.timer.flush();
}

box.width = function(x) {
  if (!arguments.length) return width;
  width = x;
  return box;
};

box.height = function(x) {
  if (!arguments.length) return height;
  height = x;
  return box;
};

box.tickFormat = function(x) {
  if (!arguments.length) return tickFormat;
  tickFormat = x;
  return box;
};

box.duration = function(x) {
  if (!arguments.length) return duration;
  duration = x;
  return box;
};

box.domain = function(x) {
  if (!arguments.length) return domain;
  domain = x == null ? x : d3.functor(x);
  return box;
};

box.value = function(x) {
  if (!arguments.length) return value;
  value = x;
  return box;
};

box.whiskers = function(x) {
  if (!arguments.length) return whiskers;
  whiskers = x;
  return box;
};

box.quartiles = function(x) {
  if (!arguments.length) return quartiles;
  quartiles = x;
  return box;
};

return box;
};

function boxWhiskers(d) {
  return [0, d.length - 1];
}

function boxQuartiles(d) {
  return [
  d3.quantile(d, .25),
  d3.quantile(d, .5),
  d3.quantile(d, .75)
  ];
}        


    }; // initBoxPlot
    

    window.App.Sidebar.Plot.scatterplotConfig = {
      chart: {
        renderTo: 'plot',
        type: 'scatter',
        zoomType: 'xy'
      },

      exporting: {
        buttons: { 
          exportButton: {
            enabled: false
          },
          printButton: {
            enabled: false
          }

        }
      },

      title: {
        text: 'Patient values'
      },
      xAxis: {
        title: {
          enabled: true,
                    //text: 'Node A'
                  },
                  startOnTick: true,
                  endOnTick: true,
                  showLastLabel: true
                },
                yAxis: {
                  title: {
                    //text: 'Node B'
                  }
                },
                tooltip: {
                  formatter: function() {
                    return "<b>Patient</b>: " + this.point.barcode;
                  }
                },
                legend: {
                  layout: 'vertical',
                  align: 'left',
                  verticalAlign: 'top',
                  x: 55,
                  y: 45,
                  floating: true,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1
                },
                credits: {
                  enabled: false
                },
                plotOptions: {
                  scatter: {
                    marker: {
                      radius: 5,
                      states: {
                        hover: {
                          enabled: true,
                          lineColor: 'rgb(100,100,100)'
                        }
                      }
                    },
                    states: {
                      hover: {
                        marker: {
                          enabled: false
                        }
                      }
                    }
                  }
                },
                series: []
              };



window.App.Sidebar.Plot.scatterplot = function(params)// sourceNodeo, targetNodeo )
{
  var scatterplotConfig = App.Sidebar.Plot.scatterplotConfig;

  var sourcePlot = params.sourceO.patientvals;
  var targetPlot = params.targetO.patientvals;
  var patientBarcodes = App.Models.datasets.get('active').get('barcodes');
  var patientSampleClassifications = App.Models.datasets.get('active').get('samples');

  var scatterplotData = [];
  var sampleSeries = {};
  var dataX, dataY;
  var colorpalette = d3.scale.category10();

  scatterplotConfig.xAxis.title['text'] = params.sourceO.source + " of " + params.sourceO.label + ", chr " + params.sourceO.chr;
  scatterplotConfig.yAxis.title['text'] = params.targetO.source + " of " + params.targetO.label + ", chr " + params.targetO.chr;
  scatterplotConfig.series = [];


    if( patientSampleClassifications.length > 0 ) // && samples.length === scatterplotData.length )
{
      // classification for samples exists
      $.each( patientSampleClassifications, function(ind, sample)
      {
        if( !sampleSeries[sample] )
        {
          sampleSeries[sample] = [];
        }
        dataX = sourcePlot[ind]*1;
        dataY = targetPlot[ind]*1;
        if( !isNaN( dataX ) && !isNaN( dataY ) )
        {
        sampleSeries[sample].push( { 'x': dataX, 'y': dataY, 'barcode': patientBarcodes[ind] } );// scatterplotData[ind] );
    }
  });

      $.each( sampleSeries, function(seriesName, series )
      {
        scatterplotConfig.series.push( 
        {
          name: seriesName,
          color: colorpalette(seriesName),
          data: series
        });
      });
    }
    else
    {
      // no classification available
      $.each( patientBarcodes, function(ind, barcode )
      {
        dataX = sourcePlot[ind]*1;
        dataY = targetPlot[ind]*1;
        if( !isNaN( dataX ) && !isNaN( dataY ) )
        {
          scatterplotData.push( { 'x': dataX, 'y': dataY, 'barcode': barcode } );
        }
      });
      scatterplotConfig.series.push( 
      {
        name: "Dataset",
        color: 'rgba(223, 83, 83, .5)',
        data: scatterplotData
      });
    }

    var chart = new Highcharts.Chart( scatterplotConfig );
  }


      // var clearLinkSidetabs = function()
      // {
      //     $("#nodeA.sidetab").html('');
      //     $("#nodeB.sidetab").html('');
      //     $("#link.sidetab").html('');
      //     $("#plot.sidetab").html('');
      //     $('#plot').prev('h3').find('a').text('Plot');
      //     $('#plot').css('padding-left', '');

      //     $('#boxplotinfo').prev('h3').css("display", "none");
      //     $('#boxplotinfo').html("");

      //     $('#sidebar').delay(600).multiAccordion( { 'active': 0 } );
      // };


