// only after page is loaded
jQuery( function($) 
{
  window.App.Paths.config = {

    // cell templates:
    nodeTemplate: Handlebars.compile( $('#pathsNodeTmpl').html() ),
    edgeTemplate: Handlebars.compile( $('#pathsEdgeTmpl').html() ),

    container: "#pathTab"
  };

  // how to deal with html cell ordering @links
  jQuery.fn.dataTableExt.oSort['num-html-asc']  = function(a,b) {
      a = +($(a).filter("#pvalue").text());
      b = +($(b).filter("#pvalue").text());
      return ((a < b) ? -1 : ((a > b) ?  1 : 0));
  };

  // @links
  jQuery.fn.dataTableExt.oSort['num-html-desc'] = function(a,b) {
      a = +($(a).filter("#pvalue").text());
      b = +($(b).filter("#pvalue").text());
      return ((a < b) ? 1 : ((a > b) ?  -1 : 0));
  };

  // @nodes with img
  jQuery.fn.dataTableExt.oSort['img-html-desc'] = function(a,b) {
      a = (a.trim().replace( /<.*?>/g, "" ) + $(a).attr('title')).toLowerCase();
      b = (b.trim().replace( /<.*?>/g, "" ) + $(b).attr('title')).toLowerCase();
      return ((a < b) ? 1 : ((a > b) ?  -1 : 0));
  };

  // @nodes with img
  jQuery.fn.dataTableExt.oSort['img-html-asc']  = function(a,b) {
      a = (a.trim().replace( /<.*?>/g, "" ) + $(a).attr('title')).toLowerCase();
      b = (b.trim().replace( /<.*?>/g, "" ) + $(b).attr('title')).toLowerCase();
      return ((a < b) ? -1 : ((a > b) ?  1 : 0));
  };


});


window.App.Paths.initPaths = function()
{
  var conf = App.Paths.config;

  var getLinkHTML = function(linkO) 
  {
    var source = {
      pvalue: linkO.pvalue.toFixedDown(2),
      distance: linkO.distance,
      correlation: linkO.correlation.toFixedDown(2)
    };
    return conf.edgeTemplate(source);
  };

  var getNodeHTML = function(nodeO)
  {
    var source = {
      imageSource: "img/node_" + nodeO.source.toLowerCase() + ".svg",
      nodeSource: nodeO.source,
      label: nodeO.label
    };
    return conf.nodeTemplate(source);
  };

  var edges = App.Models.edges.getEdges(); // map
  var nodes = App.Models.nodes.getNodes(); // map
  var refNodeId = "n" + App.Models.datasets.get('active').get('referenceNodeId');
  var refNode = App.Models.nodes.find('id', refNodeId)[0].getRaw();

  var nodeLinkCatalog = {};
  var linkSourceDestCatalog = {};
  var pathLinks = [];
  var nodeObject;

  var simplePaths = [];
  var visitedCatalog = {};
  var traversingStack = [];

  var neighbor;
  var leafs = Number(0);
  var shallowCopyObject = {};
  var pathCell = {};
  var maxPathLength = 0;
  var pathLength = 0;



  var dfs = function( nodeO )
  {
    // mark the node as visited
    visitedCatalog[nodeO.id] = 'gray';
    // console.log("looking at node", nodeO.label);

    // note that we've been here
    traversingStack.push(nodeO);

    // does it have any neighbors?
    if( nodeLinkCatalog.hasOwnProperty( nodeO.id ) )
    {

      $.each( nodeLinkCatalog[nodeO.id], function(ind,neighborEdge)
      {
        neighbor = nodes[neighborEdge.target];
        // console.log("looking @node's ", nodeO.label, " neighbor ", neighbor.label);

        // is the neighbor unvisited at the moment, 'white'
        if( !visitedCatalog.hasOwnProperty( neighbor.id ) )
        {
          // call the function recursively to traverse further from neighbor
          // console.log("node's ", nodeO.label, " neighbor ", neighbor.label, "was unvisited, recurse");
          dfs( neighbor );
        }
        else // the neighbor was already visited, do not go there
        {
          // console.log("node's ", nodeO.label, " neighbor ", neighbor.label, "was visited, check");          
          // was the neighbor a one without it's own neighbors in this direction?
          if( !nodeLinkCatalog.hasOwnProperty( neighbor.id ) )
          {
            // console.log("node's ", nodeO.label, " neighbor ", neighbor.label, "was visited and DOES NOT have neighbors");
            // this is the endpoint of one of the paths:
            shallowCopyObject = traversingStack.slice(0);
            shallowCopyObject.push( neighbor );
            pathLength = shallowCopyObject.length;
            if( pathLength > maxPathLength ) maxPathLength = pathLength;
            simplePaths.push( shallowCopyObject );            
          }
        }
      });
    }
    // no neighbors: either a leaf or traversing in 'wrong' direction
    else
    {
      // console.log("node ", nodeO.label, "had no neighbors"); 
      shallowCopyObject = traversingStack.slice(0);
      pathLength = shallowCopyObject.length;
      if( pathLength > maxPathLength ) maxPathLength = pathLength;
      simplePaths.push( shallowCopyObject );     
    }

    // all viable neighbors are traversed, back out one step
    traversingStack.pop();
    visitedCatalog[nodeO.source] = 'black';
  };





  // var dfs = function( nodeO )
  // {
  //   visitedCatalog[nodeO.id] = 'gray';

  //   // console.log("push 1 to stack");
  //   //traversingStack.push( d3.select( "#" + nodeO.id + ".nodeGroup" ) );

  //   traversingStack.push(nodeO);

  //   // console.log("traversing stack l:" + traversingStack.length );

  //   // does the node have neighbors?
  //   if( nodeLinkCatalog.hasOwnProperty( nodeO.id ) )
  //   {
  //     $.each( nodeLinkCatalog[nodeO.id], function(ind,neighborEdge)
  //     {

  //       // find one neighbor
  //       neighbor = nodes[neighborEdge.target];

  //       // console.log("looking at neighbor:");
  //       // console.log( d3.select("#" + neighbor.id  + ".nodeGroup" ) );

  //       // is the neighbor unvisited at the moment, 'white'
  //       if( !visitedCatalog.hasOwnProperty( neighbor.id ) )
  //       {
  //         //console.log("calling recursive");

  //         // call the function recursively to traverse further from neighbor
  //         dfs( neighbor );
  //       }
  //       else if( visitedCatalog[neighbor.id] === 'gray' || visitedCatalog[neighbor.id] == 'black' )
  //       {
  //         // we've already been in that node

  //         // console.log("loop found at=" + neighbor.id);
  //       }
  //     });      
  //   }
  //   else
  //   {
  //     // the node does not have neighbors

  //     // the node is a leaf, one result found
  //     // console.log( "leaf found:" );
  //     // console.log( d3.select("#" + neighbor.id  + ".nodeGroup" ) );
  //     // ++leafs;
  //     // console.log( "stack:");
  //     // console.log( traversingStack );
  //     // console.log( "paths:" );

  //     //shallowCopyObject = $.extend({}, traversingStack);
  //     shallowCopyObject = traversingStack.slice(0);
  //     pathLength = shallowCopyObject.length;
  //     if( pathLength > maxPathLength ) maxPathLength = pathLength;
  //     simplePaths.push( shallowCopyObject );
  //     // console.log( simplePaths );
  //   }
  //   // console.log("delete 1 from stack");
  //   traversingStack.pop();
  //   visitedCatalog[nodeO.source] = 'black';
  // };

  // mark down links that leave from each node
  $.each( edges, function(i,d)
  {
    linkSourceDestCatalog[ d.source + "|" + d.target ] = d;
    // if( !nodeLinkCatalog.hasOwnProperty( d.target.id ) )
    // {
    //   nodeLinkCatalog[ d.target.id ] = [];
    // }
    // nodeLinkCatalog[ d.target.id ].push( d );
    if( !nodeLinkCatalog.hasOwnProperty( d.source ) )
    {
      nodeLinkCatalog[ d.source ] = [];
    }
    nodeLinkCatalog[ d.source ].push( d );
  });

  // do a DFS search to get the simple paths in the graph:
  dfs( refNode );


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
        $(conf.container).html( '<table id="pathTable" cellpadding="0" cellspacing="0" border="0"></table>' );

        $.each( simplePaths, function(indP, pathElements)
        {
          pathLinks = [];
          pathCell = {};

          // notice how the index might go over the pathelements length!
          for( var indN = 0; indN < maxPathLength; indN++ )
          {
            nodeObject = ( (indN+1) >= pathElements.length ) ? undefined : pathElements[indN];
            if( !nodeObject )
            {
              // paths may have different lengths in the table
              pathCell['node' + (indN+1)] = "";
              pathCell['link' + (indN+1)] = "";
            }
            else
            {
              pathCell['node' + (indN+1)] = getNodeHTML( nodeObject );
              pathCell['link' + (indN+1)] = getLinkHTML( linkSourceDestCatalog[ nodeObject.id + "|" + pathElements[indN+1].id ] );
            }
          }


          // $.each( pathElements, function(indN,nodeO)
          // {
          //   pathCell['node' + (indN+1)] = getNodeHTML( nodeO );
          //   if( ( indN+1 ) < pathElements.length )
          //   {
          //     pathCell['link' + (indN+1)] = getLinkHTML( linkSourceDestCatalog[ nodeO.id + "|" + pathElements[indN+1].id ] );
          //   }

          // });
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
          tableConfig.aoColumns.push( { "sTitle": "node" + pathNum, "mData": "node" + pathNum, "sType": "img-html" } );
          if( pathNum < maxPathLength )
          {
            tableConfig.aoColumns.push( { "sTitle": "link" + pathNum, "mData": "link" + pathNum, "sType": "num-html" } );
          }
        }

    var oTable = $( conf.container + ' #pathTable' ).dataTable( tableConfig );

};