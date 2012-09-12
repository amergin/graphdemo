window.App.Paths.initPaths = function()
{
  // if( !$('#pathTab').is(":empty") )
  // {
  //   // don't redraw
  //   return;
  // }

  var edges = d3.selectAll("line.link");
  var refNode = d3.select("#n" + referenceNodeId + ".nodeGroup").data()[0];

  var nodeLinkCatalog = {};
  var linkSourceDestCatalog = {};
  var pathLinks = [];
  var simplePaths = [];
  var visitedCatalog = {};
  var neighbor;
  var traversingStack = [];
  var leafs = Number(0);
  var shallowCopyObject = {};
  var pathCell = {};
  var maxPathLength = 0;
  var pathLength = 0;

  var getLinkHTML = function(linkO)
  {
    var html;
    html = "<b>pvalue</b>: " + linkO.pvalue.toFixedDown(2) + "<br/>";
    if( linkO.hasOwnProperty('distance') ) html += "<b>distance</b>: " + linkO.distance + "<br/>";
    html += "<b>correlation</b>: " + linkO.correlation.toFixedDown(2) + "<br/>";
    html += "<b>importance</b>: " + linkO.importance.toFixedDown(2) + "<br/>";
    return html;
  };

  var getNodeHTML = function(nodeO)
  {
    var html;
    var nodeSrc;
    switch( nodeO.source )
    {
      case "GEXP": 
        nodeSrc = "img/node_gexp.svg";
        break;
      case "CNVR":
        nodeSrc = "img/node_cnvr.svg";
        break;
      case "METH": 
        nodeSrc = "img/node_meth.svg";
        break;
      case "CLIN": 
        nodeSrc = "img/node_clin.svg";
        break;
      case "GNAB": 
        nodeSrc = "img/node_gnab.svg";
        break;
      case "MIRN":
        nodeSrc = "img/node_mirn.svg";
        break;
      case "SAMP": 
        nodeSrc = "img/node_samp.svg";
        break;
      case "RPPA": 
        nodeSrc = "img/node_rppa.svg";
        break;
    }
    // html = '<a href="testlink">JEA</a>';
    html = $('<img/>', { src: nodeSrc, class: 'nodeTableImg', title: nodeO.source } ).prop("outerHTML");
    //html = '<object data="' + nodeImg + '" type="image/svg+xml" class="nodeImage" aria-label="' + nodeO.source + '"></object>';
    //html = $('<object/>', { data: nodeImg, type: 'image/svg+xml', width: 15, height: 15 }).prop("outerHTML");
    html += nodeO.label;
    return html;
  };

  var dfs = function( nodeO )
  {
    visitedCatalog[nodeO.id] = 'gray';
    // console.log("push 1 to stack");
    //traversingStack.push( d3.select( "#" + nodeO.id + ".nodeGroup" ) );
    traversingStack.push(nodeO);
    // console.log("traversing stack l:" + traversingStack.length );
    if( nodeLinkCatalog.hasOwnProperty( nodeO.id ) )
    {
      $.each( nodeLinkCatalog[nodeO.id], function(ind,neighborEdge)
      {
        //traversingStack.push( d3.select("line#" + neighborEdge.id + ".link") );
        neighbor = neighborEdge.target;
        // console.log("looking at neighbor:");
        // console.log( d3.select("#" + neighbor.id  + ".nodeGroup" ) );

        // unvisited at the moment, 'white'
        if( !visitedCatalog.hasOwnProperty( neighbor.id ) )
        {
          //console.log("calling recursive");
          // call the function recursively to traverse further from neighbor
          dfs( neighbor );
        }
        else if( visitedCatalog[neighbor.id] === 'gray' )
        {
          // console.log("loop found at=" + neighbor.id);
        }
      });      
    }
    else
    {
      // the node is a leaf, one result found
      // console.log( "leaf found:" );
      // console.log( d3.select("#" + neighbor.id  + ".nodeGroup" ) );
      // ++leafs;
      // console.log( "stack:");
      // console.log( traversingStack );
      // console.log( "paths:" );

      //shallowCopyObject = $.extend({}, traversingStack);
      shallowCopyObject = traversingStack.slice(0);
      pathLength = shallowCopyObject.length;
      if( pathLength > maxPathLength ) maxPathLength = pathLength;
      simplePaths.push( shallowCopyObject );
      // console.log( simplePaths );
    }
    // console.log("delete 1 from stack");
    traversingStack.pop();
    visitedCatalog[nodeO.id] = 'black';
  };

  // mark down links that leave from each node
  edges.each( function(d,i)
  {
    linkSourceDestCatalog[ d.source.id + "|" + d.target.id ] = d;
    // if( !nodeLinkCatalog.hasOwnProperty( d.target.id ) )
    // {
    //   nodeLinkCatalog[ d.target.id ] = [];
    // }
    // nodeLinkCatalog[ d.target.id ].push( d );
    if( !nodeLinkCatalog.hasOwnProperty( d.source.id ) )
    {
      nodeLinkCatalog[ d.source.id ] = [];
    }
    nodeLinkCatalog[ d.source.id ].push( d );
  });

  // do a DFS search to get the simple paths in the graph:
  dfs( refNode );
  //console.log("LEAFS=" + leafs);
  //console.log( jea = simplePaths );
  // console.log( stack = traversingStack );
  // console.log( paths = simplePaths );

// draw the table

    var tableConfig = {
        "bProcessing": true,
        "aaData": [],
        "sScrollX": "100%",
        // "sScrollXInner": "120%",
        // "bScrollCollapse": true,        
        "bJQueryUI": true,
        "sDom": '<"H"lfr>t<"F"Cip>',
        "iDisplayLength": 100,
        "aoColumns": [ 
        { "sTitle": "score", "mData": "score" } ],
        // desc order of score
        "aaSorting": [[0, "desc"]]
    };
        $("#pathTab").html( '<table id="pathTable" cellpadding="0" cellspacing="0" border="0"></table>' );

        $.each( simplePaths, function(indP, pathElements)
        {
          pathLinks = [];
          pathCell = {};
          $.each( pathElements, function(indN,nodeO)
          {
            pathCell['node' + (indN+1)] = getNodeHTML( nodeO ); //nodeO.label;
            if( ( indN+1 ) < pathElements.length )
            {
              pathCell['link' + (indN+1)] = getLinkHTML( linkSourceDestCatalog[ nodeO.id + "|" + pathElements[indN+1].id ] ) //.pvalue.toFixedDown(2);
            }

          });
          // find links, used to calculate score
          for( var i = 1; i < pathElements.length; ++i )
          {
            pathLinks.push( linkSourceDestCatalog[ pathElements[i-1].id + "|" + pathElements[i].id ] );
          }
          pathCell['score'] = d3.mean( pathLinks, function(d) { return d.pvalue; } ).toFixedDown(2);
          tableConfig["aaData"].push( pathCell );
        });

        for( var pathNum = 1; pathNum <= maxPathLength; ++pathNum )
        {
          tableConfig.aoColumns.push( { "sTitle": "node" + pathNum, "mData": "node" + pathNum, "sType": "html" } );
          if( pathNum < maxPathLength )
          {
            tableConfig.aoColumns.push( { "sTitle": "link" + pathNum, "mData": "link" + pathNum } );
          }
        }

    var oTable = $('#pathTab #pathTable').dataTable( tableConfig );

};