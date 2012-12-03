window.App.Heatmap.config = {
  container: 'heatmapTab',
    // margins: { 'left': 20, 'top': 20, 'right': 50, 'bottom': 20 },
    labelRotation: -40,
    sidepanelLabelRotation: -40,
    colors: {
      sampleClass: {
        startColor: d3.rgb('blue'),
        endColor: d3.rgb('red')
      },
      C: {
        startColor: d3.rgb('blue'),
        endColor: d3.rgb('red')
      },
      N: {
        GEXP: {
          startColor: d3.rgb('green'),
          endColor: d3.rgb('red')          
        },
        RPPA: {
          startColor: d3.rgb('green'),
          endColor: d3.rgb('red')          
        },
        CNVR: {
          range: [-1,0,1],
          // range: [-1,1],
          startColor: d3.rgb('blue'),
          middleColor: d3.rgb('white'),
          endColor: d3.rgb('red')
        },
        METH: {
          range: [0,1],
          startColor: d3.rgb('white'),
          endColor: d3.rgb('orange')          
        },
        other: {
          startColor: d3.rgb('blue'),
          endColor: d3.rgb('red')          
        },
      }
    }
  };

  window.App.Heatmap.initHeatmap = function()
  {

    App.Views.dialog.open({ title: "Updating heatmap", message: "Updating heatmap, please wait."} );
    console.log( "initheatmap called ");

    var config = App.Heatmap.config;
    var nodes = App.Models.nodes.getNodes();
  var edges = App.Models.edges.getEdges(); // defaults to sorted by pvalue
  var refNodeId = "n" + App.Models.datasets.get('active').get('referenceNodeId');
  var refNode = App.Models.nodes.find('id', refNodeId)[0].getRaw();
  var barcodes = App.Models.datasets.get('active').get('barcodes');
  var samples = App.Models.datasets.get('active').get('samples');


  var neighbors = [];
  var patients = [];
  var patientObj;

  // refnode is leftmost
  neighbors.push( refNode );
  $.each( edges, function(ind, edge)
  {
    if( edge.source === refNode.id )
    {
      neighbors.push( nodes[edge.target] );
    }
  });

  $.each( barcodes, function(ind,barcode)
  {
    patientObj = { 'name': barcode };
    if( samples.length > 0 )
    {
      patientObj['class'] = samples[ind];
    }
    patients.push( patientObj );
  });

  App.Heatmap.renderHeatmap( patients, neighbors, refNode, config );
  App.Views.dialog.close();
};


  // takes sorted array of nodes and renders heatmap based on them on the
  // corresponding order
  window.App.Heatmap.renderHeatmap = function( patients, nodes, refNode, config )
  {
    $('#numericalTable').remove();
    $('#categoricalTable').remove();
    $('#sampleClassTable').remove();
    $('#categorical_container').removeAttr("style");
    $('#sampleclass_container').removeAttr("style");
    $('#sampleclass_numerical_container').removeAttr("style");

    // 3. catalog for node types:
    var nodeTypeCatalog = { 'C': {}, 'N': {} };
    // 4. catalog for min-max-vals
    var minMaxCatalog = { 'C': {}, 'N': {} };
    // 5. catalog for color ranges
    var colorRangeCatalog = { 'C': {}, 'N': {} };

    var sampleClassPresent = patients[0].hasOwnProperty('class'),
    nodeObj,
    nodeType,
    minVal,
    maxVal,
    midVal,
    valueRange,
    distinctVals,
    colorRange,
    colorCodeRange,
    patientVal;


    // number of non-NA patient values in reference nodes
    // ! Important, this is used to determine cell heights
    // and draw the rows!
    if( refNode.type === 'B' || refNode.type === 'C' )
    {
      var refNodeNonNAPatients = 0;
      var refNodeCategoryInds = {};
      for( var ind = 0; ind < refNode.patientvals.length; ++ind )
      {
        patientVal = refNode.patientvals[ind];
        if( patientVal === 'NA' ) continue;
        if( !refNodeCategoryInds.hasOwnProperty( patientVal ) ) refNodeCategoryInds[patientVal] = [];
        refNodeCategoryInds[patientVal].push( ind );
        refNodeNonNAPatients += 1;
      }      
    }
    else
    {
      var refNodeNonNAPatients = refNode.patientvals.length - refNode.patientvals.count("NA");
    }

    var indPatientVal;

    // populate nodeTypes and initialize other catalogs
    for(var i = 0; i < nodes.length; ++i)
    {
      nodeObj = nodes[i];
      nodeType = ( nodeObj.type === 'B' || nodeObj.type  === 'C' ) ? 'C' : 'N';
      if( !nodeTypeCatalog[nodeType].hasOwnProperty( nodeObj.source ) )
      {
        nodeTypeCatalog[nodeType][nodeObj.source] = [];
      }
      nodeTypeCatalog[nodeType][nodeObj.source].push( nodeObj );

      if( nodeType === 'N' )
      {
        minMaxCatalog[nodeType][nodeObj.source] = [];
        colorRangeCatalog[nodeType][nodeObj.source] = undefined;
      }
      else
      {
        minMaxCatalog[nodeType][nodeObj.id] = [];
        colorRangeCatalog[nodeType][nodeObj.id] = undefined;
      }

    }

    // calculate min-max vals

    // type=[C|N], nodeset={'METH':[], 'GEXP':[]...}
    $.each( nodeTypeCatalog, function(type, nodeset)
    {
      // numeric: source=[GEXP|METH|...], sourceNodes=[nodeobj1,obj2,...]
      $.each( nodeset, function(source, sourceNodes)
      {
        if( type === 'N' )
        {
          // use min,max values to determine color domain
          if( config.colors[type].hasOwnProperty( source ) )
          {
            if( config.colors[type][source].hasOwnProperty( 'range' ) )
            {
              if( config.colors[type][source]['range'].length === 3 )
              {
                minVal = config.colors[type][source].range[0];
                midVal = config.colors[type][source].range[1];
                maxVal = config.colors[type][source].range[2];                  
              }
              else
              {
                minVal = config.colors[type][source].range[0];
                maxVal = config.colors[type][source].range[1];
              }
            }
            else
            {
              minVal = Infinity;
              maxVal = -Infinity;
              var patientValues = $.map( sourceNodes, function(n) { return n.patientvals; } );
              for( var i = 0; i < patientValues.length; ++i )
              {
                // convert to number
                patientVal = +(patientValues[i]);
                if( patientVal )
                {
                  if( patientVal > maxVal ) maxVal = patientVal;
                  if( patientVal < minVal ) minVal = patientVal;
                }
              }
            }

            if( midVal !== undefined )
            {
              valueRange = [minVal, midVal, maxVal];
              colorCodeRange = [ config.colors[type][source].startColor, config.colors[type][source].middleColor, config.colors[type][source].endColor ];
              midVal = undefined;
            }
            else
            {
              valueRange = [minVal,maxVal];
              colorCodeRange = [ config.colors[type][source].startColor, config.colors[type][source].endColor ];
            }
            console.log("values:", source, valueRange, colorCodeRange);
            colorRange = d3.scale.linear().domain(valueRange).range(colorCodeRange);

            // if( config.colors[type][source].hasOwnProperty( 'middleColor' ) )
            // {
            //   colorRange = [ 
            //   d3.scale.linear().domain([minVal, maxVal]).range([ config.colors[type][source].startColor, config.colors[type][source].middleColor ]),
            //   d3.scale.linear().domain([minVal, maxVal]).range([ config.colors[type][source].middleColor, config.colors[type][source].endColor ])
            //   ];
            //   midVal = undefined;
            // }
            // else
            // {
            //   colorRange = d3.scale.linear().domain([minVal, maxVal]).range([ config.colors[type][source].startColor, config.colors[type][source].endColor ]);
            // }
          }
          else // no specific config for color scale
          {
            console.log("No color config for source type " + source);
            if( config.colors[type]['other'].hasOwnProperty( 'range' ) )
            {
              minVal = config.colors[type]['other'].range[0];
              maxVal = config.colors[type]['other'].range[1];
            }
            else
            {
              minVal = Infinity;
              maxVal = -Infinity;
              var patientValues = $.map( sourceNodes, function(n) { return n.patientvals; } );
              var patientVal;
              for( var i = 0; i < patientValues.length; ++i )
              {
                // convert to number
                patientVal = +(patientValues[i]);
                if( patientVal )
                {
                  if( patientVal > maxVal ) maxVal = patientVal;
                  if( patientVal < minVal ) minVal = patientVal;
                }
              }
            }
            colorRange = d3.scale.linear().domain([minVal, maxVal]).range([ config.colors[type].other.startColor, config.colors[type].other.endColor ]);
          }
          minMaxCatalog[type][source].push(minVal,maxVal);
          colorRangeCatalog[type][source] = colorRange;
          if( source === 'CNVR' ) console.log( colorRangeCatalog[type][source](1.0) );
        }
        else // categorical
        {
          $.each( sourceNodes, function(ind,node)
          {
            distinctVals = $.distinct( node.patientvals, true );
            // minMaxCatalog[type][node.id] = distinctVals;
            // minVal = d3.min( distinctVals );
            // maxVal = d3.max( distinctVals );
            // minMaxCatalog[type][node.id].push(minVal, maxVal);

            // colorRange = d3.scale.ordinal().domain(distinctVals)
            // .range(d3.range(distinctVals.length).map(d3.scale.linear()
            //   .domain([0, distinctVals.length - 1])
            //   .range([config.colors[type].startColor, config.colors[type].endColor])
            //   .interpolate(d3.interpolateLab)));
            // dont use, does not work:
            //colorRange = d3.scale.ordinal().domain( distinctVals ).range([ config.colors[type].startColor, config.colors[type].endColor ]);
            colorRangeCatalog[type][node.id] = {};
            $.each( distinctVals, function(ind,val)
            {
              colorRangeCatalog[type][node.id][val] = d3.hsl( 360 * (ind/distinctVals.length), 1, 0.5 ).toString();
            });

          });
}
});
});

if( sampleClassPresent )
{
  var sampleDistinctVals = $.distinct( $.map( patients, function(n) { return n.class } ), true );
  var sampleClassColors = {};
  $.each( sampleDistinctVals, function(ind,val)
  {
    sampleClassColors[val] = d3.hsl( 360 * (ind/sampleDistinctVals.length), 1, 0.5 ).toString();
  });
}

    // update color bars in the legend div
    App.Views.heatmapLegend.addColorBars({ values: minMaxCatalog, colors: config.colors });

    var findOccurences = function( array, prop, elementToFind )
    {  
      return $.grep(array, function(elem) 
      {    
        return elem[prop] === elementToFind;
      }).length;
    };

    var getColor = function( patientValue, nodeO )
    {
      var nodeType = ( nodeO.type === 'B' || nodeO.type === 'C' ) ? 'C' : 'N';
      if( patientValue === 'NA' ) return d3.rgb("white").toString();

      if( nodeType === 'N' )
      {
        // if( nodeO.source === 'CNVR' ) {
        //   console.log(nodeO, patientValue);
        // }
        return colorRangeCatalog[nodeType][nodeO.source]( +patientValue );
        // if( colorRangeCatalog[nodeType][nodeO.source] instanceof Array )
        // {
        //   // has midvalue defined
        //   var min = minMaxCatalog[nodeType][nodeO.source][0];
        //   var max = minMaxCatalog[nodeType][nodeO.source][1];
        //   if( patientValue <= ( (max-min)  / 2 + min ) ) return colorRangeCatalog[nodeType][nodeO.source][0]( patientValue );
        //   else return colorRangeCatalog[nodeType][nodeO.source][1]( patientValue );
        // }
        // return colorRangeCatalog[nodeType][nodeO.source]( patientValue );
      }
      // categoricals:
      return  colorRangeCatalog[nodeType][nodeO.id][patientValue];
    };

    var getSampleColor = function( patientClass )
    {
      if( patientClass === 'NA' ) return d3.rgb("white");
      return sampleClassColors[patientClass];

    };

    /* For determining layout: */
    var sampleClassPresent = patients[0].hasOwnProperty('class');
    var noCategoricals = findOccurences( nodes, 'type', 'B' ) + findOccurences( nodes, 'type', 'C' );
    var noNumericals = findOccurences( nodes, 'type', 'N' );

    var container = $( '#' + config.container );
    var containerWidth = $( '#' + config.container ).width(); // without padding/margin!
    var containerHeight = $( '#' + config.container ).height();

    var cellContainerHeight = containerHeight -20;
    if( sampleClassPresent )
    {
      $('#sampleclass_container').css(
      { 
        "width": "40px",
        "height": cellContainerHeight 
      });      
    }

    var cellContainerWidth = Math.floor(( containerWidth - $('#sampleclass_container').outerWidth(true) ) / (noCategoricals + noNumericals)) -0.5;// - 1;
    var numericalContainerWidth = cellContainerWidth * noNumericals -20;

    // determine categorical values' width and numerical table width
    var categoricalContainerWidth = cellContainerWidth * noCategoricals -10; // -5;// - 5;
    var cellHeight = Math.round(cellContainerHeight / refNodeNonNAPatients);
    cellHeight = ( cellHeight < 1 || cellHeight === 2 ) ? 1 : cellHeight;

    var numericalColumnWidth = cellContainerWidth;//numericalContainerWidth / noNumericals;
    var numericalColumnHeight = cellContainerHeight; //containerHeight;

    var categoricalColumnWidth = cellContainerWidth;
    var categoricalColumnHeight = cellContainerHeight;

    var categoricalCellWidth = categoricalColumnWidth;
    var categoricalCellHeight = cellHeight; //containerHeight / patients.length;

    var numericalCellWidth =  numericalColumnWidth; //numericalContainerWidth / noNumericals;
    var numericalCellHeight = cellHeight; //numericalColumnHeight / patients.length;

    var catTable, numTable, sampleTable;


    // init tables and containers to right dimensions:
    if( noCategoricals > 0 )
    {
      console.log("adjusting categorical dimensions");
      $('#categorical_container').css("width", categoricalContainerWidth);
      $('#categorical_container').css("height", cellContainerHeight);
      // init categorical table
      catTable = $("<table/>", {
        id: "categoricalTable",
        cellspacing: 0,
        cellpadding: 0,
        border: 0,
        width: categoricalContainerWidth,
        height: categoricalColumnHeight
      })
      .append("<thead><tr></tr></thead>")
      .append("<tbody></tbody>")
      .append("<tfoot><tr></tr></tfoot>");      
    }

    if( noNumericals > 0 )
    {
      $('#numerical_container').css("width", numericalContainerWidth);
      $('#numerical_container').css("height", cellContainerHeight);

      // initialize num table and header for it
      numTable = $("<table/>", {
        id: "numericalTable",
        cellspacing: 0,
        cellpadding: 0,
        border: 0,
        width: numericalContainerWidth,
        height: numericalColumnHeight
      })
      .append("<thead><tr></tr></thead>")
      .append("<tbody></tbody>")
      .append("<tfoot><tr></tr></tfoot>");
    }

    // create the actual cells to the table
    if( refNode.type === 'C' || refNode.type === 'B' )
    {
      $.each( refNodeCategoryInds, function( category, indices )
      {

        $.each( indices, function(arInd, indValue)
        {
              // no NA category present!
              if( noNumericals > 0 )
              {
                $("<tr/>", {
                })
                .appendTo( numTable.find( "tbody" ) );                
              }

              if( noCategoricals > 0 ) {
                $("<tr/>", {
                })
                .appendTo( catTable.find("tbody") );              
              }

              $.each( nodes, function(nodeI, node)
              {
                if( node.type === 'N' )
                {
                  $("<td/>", {
                    "style": "background-color: " + getColor( node.patientvals[indValue], node ) + 
                    "; width: " + numericalCellWidth + "px; height: " + numericalCellHeight + "px;"
                  })
                  .appendTo( numTable.find("tbody tr:last") );
                }
                else if( node.type === 'C' || node.type === 'B' )
                {
                  $("<td/>", {
                    "style": "background-color: " + getColor( node.patientvals[indValue], node )  + 
                    "; width: " + categoricalCellWidth + "px; height: " + categoricalCellHeight + "px;"
                  })
                  .appendTo( catTable.find("tbody tr:last") );
                }
              });
            });
});
}
else
{
  $.each( patients, function(indY, patient)
  {
        // always skip rows that have NAs present in the reference node
        if( nodes[0].patientvals[indY] === 'NA' )
        {
          // continue
          return true;
        }
        if( noNumericals > 0 )
        {
          $("<tr/>", {
          })
          .appendTo( numTable.find("tbody") );          
        }
        if( noCategoricals > 0 )
        {
          $("<tr/>", {
          })
          .appendTo( catTable.find("tbody") );          
        }

        $.each( nodes, function(indX, node)
        {
          if( node.type === 'N' )
          {
            $("<td/>", {
                      "style": "background-color: " + getColor( node.patientvals[indY], node ) + //";"
                      "; width: " + numericalCellWidth + "px; height: " + numericalCellHeight + "px;"
                    })
            .appendTo( numTable.find("tbody tr:last") );
          }
          else if( node.type === 'C' || node.type === 'B' )
          {
            $("<td/>", {
                      "style": "background-color: " + getColor( node.patientvals[indY], node )  + //";"
                      "; width: " + categoricalCellWidth + "px; height: " + categoricalCellHeight + "px;"
                    })
            .appendTo( catTable.find("tbody tr:last") );
          }
        });
      });
}

    // create table headers and footers
    $.each( nodes, function(ind,node)
    {
      nodeLabel = node.label || App.Utilities.createNodeLabel( node );
      if( node.type === 'N' )
      {
        $("<th/>",
        {
          name: nodeLabel,
        })
        .css( { 
          width: numericalCellWidth,
          height: numericalCellHeight,
        })
        .qtip( {
          content: nodeLabel,
          style: {
            border: {
              width: 5,
              radius: 10
            },
            padding: 10,
            textAlign: 'center',
            tip: true,
            name: 'light'
          },
          hide: {
            fixed: false,
            delay: 300,
            effect: 'blur'
          },
          position: {
            viewport: $(window),
            my: 'left center',
            at: 'top center',
          },
        })
        .css( { 
          width: numericalCellWidth,
          height: numericalCellHeight,
        })
        .appendTo( numTable.find("thead tr") )
        .html( '<div class="nodeLabelHeader">' + App.Utilities.truncateLabel( nodeLabel ) + '</div>' );

        $("<td/>",
        {
        })
        .appendTo( numTable.find("tfoot tr") )
        .html( '<div class="nodeTypeFooter">' + node.source + '</div>' );
      }
      else if( node.type === 'C' || node.type === 'B' )
      {
        $("<th/>",
        {
          name: nodeLabel,          
        })
        .css( { 
          width: categoricalCellWidth,
          height: categoricalCellHeight,
        })
        .qtip( {
          content: nodeLabel,
          style: {
            border: {
              width: 5,
              radius: 10
            },
            padding: 10,
            textAlign: 'center',
            tip: true,
            name: 'light'
          },
          position: { 
            viewport: $(window),
            my: 'left center',
            at: 'top center',
          },
        })
        .appendTo( catTable.find("thead tr") )
        .html( '<div class="nodeLabelHeader">' + App.Utilities.truncateLabel( nodeLabel ) + '</div>' );

        $("<td/>",
        {
        })
        .css( { 
          width: categoricalCellWidth,
          height: categoricalCellHeight,
        })
        .appendTo( catTable.find("tfoot tr") )
        .html( '<div class="nodeTypeFooter">' + node.source + '</div>' );
      }
    });

    // place the in-memory tables now to DOM
    if( catTable ) catTable.appendTo("#categorical_container");
    if( numTable ) numTable.appendTo("#numerical_container");


    // position vertically to start where numerical table starts
    if( noNumericals > 0 )
    {
      $("#categoricalTable tbody").css( {
        position: "absolute",
        top: $("#numericalTable tbody").position().top + "px"
      });
      $("#categoricalTable thead").css( {
        position: "absolute",
        top: $("#numericalTable thead").position().top + "px"
      });
      $("#categoricalTable tfoot").css( {
        position: "absolute",
        top: $("#numericalTable tfoot").position().top + "px"
      });
    }


    // draw sample container table
    if( sampleClassPresent )
    {
        // initialize num table and header for it
        sampleTable = $("<table/>", {
          id: "sampleClassTable",
          cellspacing: 0,
          cellpadding: 0,
          border: 0,
          width: $('#sampleclass_container').width()
        })
        .append("<thead><tr></tr></thead>")
        .append("<tbody></tbody>");

        $("<th/>",
        {
        })
        .appendTo( sampleTable.find("thead tr") )
        .html( '<div id="sampleClassText">Sample<br/>Class</div>' );

        var sampleContainerWidth = $('#sampleclass_container').width();
        $.each( patients, function(indY, patient)
        {
          // always skip NA's present in the reference node
          if( nodes[0].patientvals[indY] === 'NA' )
          {
            // continue
            return true;
          }
          $("<tr/>", {
          })
          .appendTo( sampleTable.find("tbody") );
          $("<td/>", {
            style: "background-color: " + getSampleColor( patient.class )
          })
          .css("width", sampleContainerWidth)
          .css("height", numericalCellHeight)
          .mouseover( function() { $(this).css("opacity", 0.5); })
          .mouseout( function() { $(this).css("opacity", 1); } )
          .appendTo( sampleTable.find("tr:last") );
        });

        // place the in-memory table to DOM
        sampleTable.appendTo("#sampleclass_container");

        // position vertically to start where numerical table starts
        $("#sampleClassTable tbody").css( {
          position: "absolute",
          top: $("#numericalTable tbody tr:first").position().top + "px"
        });
        $("#sampleClassTable thead").css({
          position: "absolute",
          top: $("#numericalTable thead tr").position().top + "px"
        });
      }
    }

    window.App.Heatmap.colorBar = function(){
      var orient = "right",
    lineWidth = 40, //Function?... because that would be coooooool... not sure if it is compatible with axis.js
    size_ = 300,
    tickFormat = d3.format("g"),
    color = d3.scale.linear().domain([0, 0.5, 1]).range(["blue", "green", "red"]), //v -> color
    line = d3.svg.line().interpolate("basis"),
    precision = 8,
    points_,
    tickSize_; 

    function component(selection){
      selection.each(function(data,index){
        var container = d3.select(this),
        tickSize = tickSize_ || lineWidth,
        n,
        points = points_ || (((orient == "left") || (orient == "right"))?[[0,size_],[0,0]]:[[size_,0],[0,0]]),
        quads = quad(sample(line(points),precision)),
        size = (points)?n:size_,
            aScale = color.copy().domain(d3.extent(color.domain())).range([size,0]), //v -> px
            colorExtent = d3.extent(color.domain()),
            normScale = color.copy().domain(color.domain().map(function(d){ return (d - colorExtent[0])/ (colorExtent[1] - colorExtent[0])})),

            //Save values for transitions            
            oldLineWidth = this.__lineWidth__ || lineWidth;
            oldQuads = this.__quads__ || quads;
            this.__quads__ = quads;
            this.__lineWidth__ = lineWidth;

            //Enters
            var bar = container.selectAll("path.c").data(d3.range(quads.length), function(d){return d}),
            bEnter = bar.enter().insert("path","g.axis").classed("c",true), 
            bExit = d3.transition(bar.exit()).remove(),
            bUpdate = d3.transition(bar),
            bTransform = function(selection,f,lw){
              selection.style("fill", function(d) { return normScale(f(d).t); })
              .style("stroke", function(d) { return normScale(f(d).t); })
              .attr("d", function(d) { var p = f(d); return lineJoin(p[0], p[1], p[2], p[3], lw); });};

            bEnter.call(bTransform,function(d){return oldQuads[oldQuads.length - 1]},oldLineWidth); // enter from last of oldQuad
            bExit.call(bTransform,function(d){return quads[quads.length - 1]},lineWidth); //exit from last of quads
            bUpdate.call(bTransform,function(d){return quads[d]},lineWidth)

            var colorBarAxis = d3.svg.axis().scale(aScale).orient(orient)
            .tickSize(tickSize).tickFormat(tickFormat),
            a = container.selectAll("g.axis").data(function(d){return (aScale)?[1]:[]}), //axis container
            aEnter = a.enter().append("g").classed("axis",true),
            aExit = d3.transition(a.exit()).remove(),
            aUpdate = d3.transition(a).call(colorBarAxis),
            aTransform = function(selection,lw){
              selection.attr("transform", "translate(" 
               + (((orient == "right") || (orient == "left"))?-lw/2:0) + "," 
               + (((orient == "right") || (orient =="left"))?0:lw/2) + ")");};

              aEnter.call(aTransform,oldLineWidth);
              aExit.call(aTransform,lineWidth);
              aUpdate.call(aTransform,lineWidth);

            // Sample the SVG path string "d" uniformly with the specified precision.
            function sample(d,pre) {
              var path = document.createElementNS(d3.ns.prefix.svg, "path");
              path.setAttribute("d", d);

              n = path.getTotalLength();

              var t = [0], i = 0, dt = pre;
              while ((i += dt) < n) t.push(i);
              t.push(n);

              return t.map(function(t) {
                var p = path.getPointAtLength(t), a = [p.x, p.y];
                a.t = t / n;
                return a;
              });

              document.removeChild(path);
            }

            // Compute quads of adjacent points [p0, p1, p2, p3].
            function quad(pts) {
              return d3.range(pts.length - 1).map(function(i) {
                var a = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
                a.t = (pts[i].t + pts[i + 1].t) / 2;
                return a;
              });
            }

            // Compute stroke outline for segment p12.
            function lineJoin(p0, p1, p2, p3, width) {
              var u12 = perp(p1, p2),
              r = width / 2,
              a = [p1[0] + u12[0] * r, p1[1] + u12[1] * r],
              b = [p2[0] + u12[0] * r, p2[1] + u12[1] * r],
              c = [p2[0] - u12[0] * r, p2[1] - u12[1] * r],
              d = [p1[0] - u12[0] * r, p1[1] - u12[1] * r];

                if (p0) { // clip ad and dc using average of u01 and u12
                  var u01 = perp(p0, p1), e = [p1[0] + u01[0] + u12[0], p1[1] + u01[1] + u12[1]];
                  a = lineIntersect(p1, e, a, b);
                  d = lineIntersect(p1, e, d, c);
                }

                if (p3) { // clip ab and dc using average of u12 and u23
                  var u23 = perp(p2, p3), e = [p2[0] + u23[0] + u12[0], p2[1] + u23[1] + u12[1]];
                  b = lineIntersect(p2, e, a, b);
                  c = lineIntersect(p2, e, d, c);
                }

                return "M" + a + "L" + b + " " + c + " " + d + "Z";
              }

            // Compute intersection of two infinite lines ab and cd.
            function lineIntersect(a, b, c, d) {
              var x1 = c[0], x3 = a[0], x21 = d[0] - x1, x43 = b[0] - x3,
              y1 = c[1], y3 = a[1], y21 = d[1] - y1, y43 = b[1] - y3,
              ua = (x43 * (y1 - y3) - y43 * (x1 - x3)) / (y43 * x21 - x43 * y21);
              return [x1 + ua * x21, y1 + ua * y21];
            }

            // Compute unit vector perpendicular to p01.
            function perp(p0, p1) {
              var u01x = p0[1] - p1[1], u01y = p1[0] - p0[0],
              u01d = Math.sqrt(u01x * u01x + u01y * u01y);
              return [u01x / u01d, u01y / u01d];
            }            
            
          })}

component.orient = function(_) {
  if (!arguments.length) return orient;
  orient = _;
  return component;
};

component.lineWidth = function(_) {
  if (!arguments.length) return lineWidth;
  lineWidth = _;
  return component;
};

component.size = function(_) {
  if (!arguments.length) return size_;
  size_ = _;
  return component;
};

component.tickFormat = function(_) {
  if (!arguments.length) return tickFormat;
  tickFormat = _;
  return component;
};

component.tickFormat = function(_) {
  if (!arguments.length) return tickSize_;
  tickSize_ = _;
  return component;
};

component.color = function(_) {
  if (!arguments.length) return color;
  color = _;
  return component;
};

component.precision = function(_) {
  if (!arguments.length) return precision;
  precision = _;
  return component;
};

component.points = function(_) {
  if (!arguments.length) return points_;
  points_ = _;
  return component;
};

component.line = function(_) {
  if (!arguments.length) return line;
  line = _;
  return component;
};

return component;
}