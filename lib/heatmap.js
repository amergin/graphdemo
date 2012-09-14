window.App.Heatmap.config = {
    container: 'heatmapTab',
    margins: { 'left': 20, 'top': 20, 'right': 50, 'bottom': 20 },
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
          range: [-1,1],
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

    var sampleClassPresent = patients[0].hasOwnProperty('class');
    var nodeObj;
    var nodeType;
    var minVal;
    var maxVal;
    var midVal;
    var distinctVals;
    var colorRange;
    var patientVal;


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
                minVal = config.colors[type][source].range[0];
                maxVal = config.colors[type][source].range[1];
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
            if( config.colors[type][source].hasOwnProperty( 'middleColor' ) )
            {
              colorRange = [ 
              d3.scale.linear().domain([minVal, maxVal]).range([ config.colors[type][source].startColor, config.colors[type][source].middleColor ]),
              d3.scale.linear().domain([minVal, maxVal]).range([ config.colors[type][source].middleColor, config.colors[type][source].endColor ])
              ];
              midVal = undefined;
            }
            else
            {
              colorRange = d3.scale.linear().domain([minVal, maxVal]).range([ config.colors[type][source].startColor, config.colors[type][source].endColor ]);
            }
          }
          else
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
        // var sampleColorRange = d3.scale.ordinal().domain([ 
        //   d3.min( $.distinct( $.map( patients, function(n) { return n.class } ), true ) ),
        //   d3.max( $.distinct( $.map( patients, function(n) { return n.class } ), true ) ) ])
        // .range([ config.colors.sampleClass.startColor, config.colors.sampleClass.endColor ]);      
    }

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
        if( colorRangeCatalog[nodeType][nodeO.source] instanceof Array )
        {
          // has midvalue defined
          var min = minMaxCatalog[nodeType][nodeO.source][0];
          var max = minMaxCatalog[nodeType][nodeO.source][1];
          if( patientValue <= ( (max-min)  / 2 + min ) ) return colorRangeCatalog[nodeType][nodeO.source][0]( patientValue );
          else return colorRangeCatalog[nodeType][nodeO.source][1]( patientValue );
        }
        return colorRangeCatalog[nodeType][nodeO.source]( patientValue );
      }
      // categoricals:
      return  colorRangeCatalog[nodeType][nodeO.id][patientValue];
      //return colorRangeCatalog[nodeType][nodeO.id](patientValue);
    };

    var getSampleColor = function( patientClass )
    {
      if( patientClass === 'NA' ) return d3.rgb("white");
      return sampleClassColors[patientClass];
      // return d3.hsl( 360 * $.inArray( patientValue, minMaxCatalog[nodeType][nodeO.id] )
      //return sampleColorRange( patientClass );
    };

    /* For determining layout: */
    var sampleClassPresent = patients[0].hasOwnProperty('class');
    var noCategoricals = findOccurences( nodes, 'type', 'B' ) + findOccurences( nodes, 'type', 'C' );
    var noNumericals = findOccurences( nodes, 'type', 'N' );

    var container = $( '#' + config.container );
    var containerWidth = $( '#' + config.container ).width(); // without padding/margin!
    var containerHeight = $( '#' + config.container ).height();

    var paddingMargin = "20px";


    var cellContainerHeight = containerHeight -20;
    if( sampleClassPresent )
    {
    $('#sampleclass_container').css(
      { 
        "width": "40px", 
        "margin-right": paddingMargin,
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


    // init tables and containers to right dimensions:
    if( noCategoricals > 0 )
    {
      console.log("adjusting categorical dimensions");
      $('#categorical_container').css("width", categoricalContainerWidth);
      $('#categorical_container').css("height", cellContainerHeight);
      // init categorical table
      $("<table/>", {
            id: "categoricalTable",
            cellspacing: 0,
            cellpadding: 0,
            border: 0,
            width: categoricalContainerWidth,//categoricalContainerWidth,
            height: categoricalColumnHeight
          }).appendTo( "#categorical_container" );

      $("#categorical_container table").html('<thead><tr></tr></thead>');
      $("#categorical_container thead").after("<tbody></tbody>");
      $("#categorical_container tbody").after("<tfoot><tr></tr></tfoot>");
    }

    if( noNumericals > 0 )
    {
      $('#numerical_container').css("width", numericalContainerWidth);
      $('#numerical_container').css("height", cellContainerHeight);
      $('#numerical_container').css("margin-left", paddingMargin);
      $('#numerical_container').css("padding-left", "1px");

      // initialize num table and header for it
      $("<table/>", {
            id: "numericalTable",
            cellspacing: 0,
            cellpadding: 0,
            border: 0,
            width: numericalContainerWidth, //numericalContainerWidth,
            height: numericalColumnHeight
          }).appendTo( "#numerical_container" );

      $("#numerical_container table").html('<thead><tr></tr></thead>');
      // $("#numerical_container thead").before('<colgroup><col style="width:' 
      //   + numericalCellWidth + 'px; height:' + numericalCellHeight + 'px" span="' + noNumericals + '"></col></colgroup>');
      $("#numerical_container thead").after("<tbody></tbody>");
      $("#numerical_container tbody").after("<tfoot><tr></tr></tfoot>");
    }

    // modify global css rules
    // document.styleSheets[0].insertRule("#numericalTable tbody td { width: " + numericalContainerWidth / noNumericals + "px; height: " + numericalColumnHeight / patients.length + "px;",0);
    // document.styleSheets[0].insertRule("#categoricalTable tbody td { width: " + categoricalColumnWidth + "px; height: " + categoricalColumnHeight / patients.length + "px;",0);

    // create the actual cells to the table

    if( refNode.type === 'C' || refNode.type === 'B' )
    {
      $.each( refNodeCategoryInds, function( category, indices )
      {

          $.each( indices, function(arInd, indValue)
            {
              // no NA category present!
              $("<tr/>", {
                    // id: "numericalTableRow",
                  }).appendTo( "#numerical_container tbody" );
              $("<tr/>", {
                    // id: "numericalTableRow",
                  }).appendTo( "#categorical_container tbody" );

              $.each( nodes, function(nodeI, node)
              {
                  if( node.type === 'N' )
                  {
                    $("<td/>", {
                          // class: "numericalTableCell",
                          "style": "background-color: " + getColor( node.patientvals[indValue], node ) + //";"
                          "; width: " + numericalCellWidth + "px; height: " + numericalCellHeight + "px;"
                        }).appendTo( "#numerical_container tbody tr:last" );
                  }
                  else if( node.type === 'C' || node.type === 'B' )
                  {
                    $("<td/>", {
                          class: "categoricalTableCell",
                          "style": "background-color: " + getColor( node.patientvals[indValue], node )  + //";"
                          "; width: " + categoricalCellWidth + "px; height: " + categoricalCellHeight + "px;"
                        }).appendTo( "#categorical_container tbody tr:last" );
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
        $("<tr/>", {
              // id: "numericalTableRow",
            }).appendTo( "#numerical_container tbody" );
        $("<tr/>", {
              // id: "numericalTableRow",
            }).appendTo( "#categorical_container tbody" );

          $.each( nodes, function(indX, node)
            {
              if( node.type === 'N' )
              {
                $("<td/>", {
                      // class: "numericalTableCell",
                      "style": "background-color: " + getColor( node.patientvals[indY], node ) + //";"
                      "; width: " + numericalCellWidth + "px; height: " + numericalCellHeight + "px;"
                    }).appendTo( "#numerical_container tbody tr:last" );
              }
              else if( node.type === 'C' || node.type === 'B' )
              {
                $("<td/>", {
                      class: "categoricalTableCell",
                      "style": "background-color: " + getColor( node.patientvals[indY], node )  + //";"
                      "; width: " + categoricalCellWidth + "px; height: " + categoricalCellHeight + "px;"
                    }).appendTo( "#categorical_container tbody tr:last" );
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
          // class: "numericLabel"
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
                my: 'right bottom',
                at: 'top center'
              },
        })
        .css( { 
          width: numericalCellWidth,
          height: numericalCellHeight,
        })
        .appendTo( "#numerical_container table thead tr" ).html( '<div class="nodeLabelHeader">' + App.Utilities.truncateLabel( node ) + '</div>' );

        $("<td/>",
        {
        })
        .appendTo( "#numerical_container table tfoot tr" ).html( '<div class="nodeTypeFooter">' + node.source + '</div>' );
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
                my: 'right bottom',
                at: 'top center'
              },
        })        
        .appendTo( "#categorical_container table thead tr" ).html( '<div class="nodeLabelHeader">' + App.Utilities.truncateLabel( nodeLabel ) + '</div>' );

        $("<td/>",
        {
        })
        .css( { 
          width: categoricalCellWidth,
          height: categoricalCellHeight,
        })
        .appendTo( "#categorical_container table tfoot tr" ).html( '<div class="nodeTypeFooter">' + node.source + '</div>' );
      }
    });


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
        $("<table/>", {
              id: "sampleClassTable",
              cellspacing: 0,
              cellpadding: 0,
              border: 0,
              width: $('#sampleclass_container').width()
            }).appendTo( "#sampleclass_container" );

        $("#sampleclass_container table").html('<thead><tr></tr></thead>');
        $("<th/>",
        {
        }).appendTo( "#sampleclass_container table thead tr" ).html( '<div id="sampleClassText">Sample<br/>Class</div>' );        

        $("#sampleclass_container thead").after("<tbody></tbody>");

        $.each( patients, function(indY, patient)
        {
          // always skip NA's present in the reference node
          if( nodes[0].patientvals[indY] === 'NA' )
          {
            // continue
            return true;
          }
          $("<tr/>", {
              }).appendTo( "#sampleclass_container tbody" );
          $("<td/>", {
                style: "background-color: " + getSampleColor( patient.class )
              })
          .mouseover( function() { $(this).css("opacity", 0.5); })
          .mouseout( function() { $(this).css("opacity", 1); } )
          .appendTo( "#sampleclass_container tr:last" );
        });

        $("#sampleClassTable tbody td").css("width", $('#sampleclass_container').width() );
        $("#sampleClassTable tbody td").css("height", numericalCellHeight );

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