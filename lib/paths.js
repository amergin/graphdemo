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
      a = (a.length === 0 ) ? a : (a.trim().replace( /<.*?>/g, "" ) + $(a).attr('title')).toLowerCase();
      b = (b.length === 0 ) ? b : (b.trim().replace( /<.*?>/g, "" ) + $(b).attr('title')).toLowerCase();
      return ((a < b) ? 1 : ((a > b) ?  -1 : 0));
  };

  // @nodes with img
  jQuery.fn.dataTableExt.oSort['img-html-asc']  = function(a,b) {
      a = (a.length === 0 ) ? a : (a.trim().replace( /<.*?>/g, "" ) + $(a).attr('title')).toLowerCase();
      b = (b.length === 0 ) ? b : (b.trim().replace( /<.*?>/g, "" ) + $(b).attr('title')).toLowerCase();
      return ((a < b) ? -1 : ((a > b) ?  1 : 0));
  };


});


// Actions on selecting a link
window.App.Paths.selectLink = function(att)
{
  if( !att ) return;

  if( att.previous )
  {
    // remove previous selection
    $("td.pathLink#pathLinkSelected").attr("id", "");
  }
  // add selection
  $(App.Paths.config.container + " td.pathLink").children('div[data-linkId="' + att.current.id + '"]').parent().attr("id", "pathLinkSelected");
};

window.App.Paths.hideLink = function(link)
{
  $("td.pathLink#pathLinkSelected").attr("id", "");
};

window.App.Paths.initPaths = function()
{
  var conf = App.Paths.config;

  var getLinkHTML = function(linkO) 
  {
    var source = {
      linkId: linkO.id,
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
  var sourceObj;
  var targetObj;

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

  // mark down links that leave from each node
  $.each( edges, function(i,d)
  {
    linkSourceDestCatalog[ d.source + "|" + d.target ] = d;
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

        "fnInitComplete": function() {
          // bind click events to link cells on complete: 
          $(App.Paths.config.container + ' td.pathLink').click( function() {
            var link = d3.select( "line.link#" + $(this).children("div").attr("data-linkId") );
            App.Utilities.updateLink(link);
          });
        },
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
            sourceObj = pathElements[indN];
            targetObj = pathElements[indN+1];
            // paths may have different lengths in the table
            if( sourceObj && !targetObj )
            {
              pathCell['node' + (indN+2)] = "";
              pathCell['link' + (indN+1)] = "";
            }
            else if( !sourceObj && !targetObj )
            {
              pathCell['node' + (indN+1)] = "";
              pathCell['node' + (indN+2)] = "";
              pathCell['link' + (indN+1)] = "";
            }
            else
            {
              pathCell['node' + (indN+1)] = getNodeHTML( sourceObj );
              pathCell['node' + (indN+2)] = getNodeHTML( targetObj );
              pathCell['link' + (indN+1)] = getLinkHTML( linkSourceDestCatalog[ sourceObj.id + "|" + targetObj.id ] );
            }
          }

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
          tableConfig.aoColumns.push( { "sTitle": "node" + pathNum, "mData": "node" + pathNum, "sType": "img-html", "sClass": "pathNode" } );
          if( pathNum < maxPathLength )
          {
            tableConfig.aoColumns.push( { "sTitle": "link" + pathNum, "mData": "link" + pathNum, "sType": "num-html", "sClass": "pathLink" } );
          }
        }

    App.Paths.table = $( conf.container + ' #pathTable' ).dataTable( tableConfig );



};