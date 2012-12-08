// holds svg elements fetched from files; only get these one time
window.App.Graph.nodeElements = {
  fetched: false
};

window.App.Graph.config = {

  force: {
    charge: -300,
    gravity: 0.07,
    friction: 0.9,
    theta: 0.55,
    linkStrength: 0.5
  },

  container: '#graphTab',

  // delay used for mouseover events
  eventDelay: 300,
  // always use smaller value here than evenDelay
  hoverDuration: 180, 

  // node svg image rendering size
  nodeImageH: 50,
  nodeImageW: 50,


  maxNodeSize: 240,

  labelMaxLength: 13,

  // rendering area
  //width: function() { return $(this.container).width(); },//$(window).width() * 0.7 - 50,
  height: $(window).height() * 0.90 - 25,

  // opacities used for fading and returning back
  link_def_opacity: 0.6,
  node_def_opacity: 1.0,

  linkDefaultColor: '#000000',
  linkSelectedColor: "#FFD700",
};
window.App.Graph.config.width = $(App.Graph.config.container).width();

window.App.Graph.selectLink = function(att)
{
  if( att.previous )
  {    
    d3.select("line.link#" + att.previous.id).style("stroke", App.Graph.config.linkDefaultColor);
  }
  d3.select("line.link#" + att.current.id).style("stroke", App.Graph.config.linkSelectedColor);
};

window.App.Graph.hideLink = function(d)
{
  if( d === undefined ) return;
  d3.select("line.link#" + d.id).style("stroke", App.Graph.config.linkDefaultColor);
};



window.App.Graph.initGraph = function()
{
  if( App.Graph.nodeElements.fetched ) {
    window.App.Graph.render();
  }
  else {
    var ajaxComplete = _.after(9, function() {
      App.Graph.nodeElements.fetched = true;
      window.App.Graph.render();
    });

    $.each(['GEXP','CNVR','METH','CLIN','GNAB','MIRN','SAMP','RPPA','PRDM'], function(ind,ele) {
      d3.xml("img/node_" + ele.toLowerCase() + ".svg", "image/svg+xml", function(xml) {
        App.Graph.nodeElements[ele] = document.importNode(xml.documentElement, true);
        ajaxComplete();
      });
    });
  }

}


window.App.Graph.render = function()
{
  var conf = App.Graph.config;

  // for allowing only one fade event at time, see mouseover
  var timer;


  var getLinkStroke = function( edgeO )
  {
    if( edgeO.pvalue > 30 ) return 15;
    return Number(edgeO.pvalue) * 0.4 + 3 || Number(4);
  };

      // remove previous graph
      $(conf.container).empty();
      // d3.select( conf.container + " > svg" ).remove();
      d3.select(conf.container).append("a")
      .attr("id", "export")
      .attr("href", "#")
      .attr("title", "Export visible graph as SVG file")
      .text("Export");

      // default is maps, don't need it here
      var nodeObjects = _.values( App.Models.nodes.getNodes() );
      var edgeObjects = _.values( App.Models.edges.getEdges() );

      // currently selected link
      var linkSelection = [];
      var referenceNodeId = App.Models.datasets.get('active').get('referenceNodeId');

      // calculate max-min values for gene interesting scores:
      var maxScore = App.Models.nodes.max( function(ele) { return ele.get('gene_interesting_score'); } );
      maxScore = maxScore ? maxScore.get('gene_interesting_score') : 0;
      var minScore = App.Models.nodes.min( function(ele) { return ele.get('gene_interesting_score'); } );
      minScore = minScore ? minScore.get('gene_interesting_score') : 0;


      // Prep the node IDs:
      // https://groups.google.com/forum/#!topic/d3-js/LWuhBeEipz4
      var hash_lookup = [];
      nodeObjects.forEach(function(d, i) {
        hash_lookup[d.id] = d;
      });
      edgeObjects.forEach(function(d, i) {
        d.source = hash_lookup[d.source];
        d.target = hash_lookup[d.target];
      });

      var color = d3.scale.category20();
      var fill = d3.scale.category10();

      var force = d3.layout.force()
      .linkDistance( function(d) {
        if( d.hasOwnProperty('distance') )
        {
          return ( d.distance < 10000 ) ? ( Math.log(d.distance) / Math.log(10) ) * 2 + 30 : ( Math.log( d.distance ) / Math.log(10) ) * 13 + 5;
        }
        return 100;
      } )
      .linkStrength( conf.force.linkStrength )
      .gravity( conf.force.gravity )
      .charge( conf.force.charge )
      .friction( conf.force.friction )
      .theta( conf.force.theta )
      .size([conf.width, conf.height]);

      var svg = d3.select( conf.container ).append("svg:svg")
      .attr("width", conf.width)
      .attr("height", conf.height)
      .attr("id", "forcegraph")
      .attr("pointer-events", "all")
      .append('svg:g')
          // .attr('class', 'brush') 
          // .call(brush.x(brushX).y(brushY))
          .call(d3.behavior.zoom().translate([0,0]).scale(1.0).scaleExtent([0.1,4.0]).on("zoom", redraw))
          .append('svg:g');
      // append a white rectangle to background to use in zooming
      svg.append('svg:rect')
      .attr('width', conf.width)
      .attr('height', conf.height)
      .attr('fill', 'white');

      // line markers
      svg.append("svg:defs").selectAll("marker")
      .data(["activating"])
      .enter().append("svg:marker")
      .attr("id", function(d) { 
        return d === "activating" ? "arrow-activating" : "arrow-inhibiting" 
      } )
      .attr("refX", 25)
      .attr("viewBox", "4 4 15 10")
      .attr("markerWidth", 20)
      .attr("markerHeight", 10)
      .attr("markerUnits", "userSpaceOnUse")
      .attr("orient", "auto")
      .attr("style", "overflow:visible")      
      .append("svg:path")
      .attr("d", "M 5.77,0.0 L -2.88,5.0 L -2.88,-5.0 L 5.77,0.0 z ")
      .attr("style", "fill-rule:evenodd;fill:#FFFFFF;stroke:#FF0000;stroke-width:2.0pt;marker-start:none; stroke-opacity: 0.8; stroke-dashrray: 0")
      .attr("translate", "scale(0.8)");

      // second line marker
      svg.append("svg:defs").selectAll("marker")
      .data(["inhibiting"])
      .enter().append("svg:marker")
      .attr("id", function(d) { 
        return d === "activating" ? "arrow-activating" : "arrow-inhibiting" 
      } )
      .attr("refX", 25)
      .attr("viewBox", "4 4 15 10")
      .attr("markerWidth", 20)
      .attr("markerHeight", 20)
      .attr("markerUnits", "userSpaceOnUse")
      .attr("orient", "auto")
      .attr("style", "overflow:visible")      
      .append("svg:path")
      .attr("d", "M 0.0,5.65 L 0.0,-5.65")
      .attr("style", "fill:none;fill-opacity:0.75000000;fill-rule:evenodd;stroke:#FF0000;stroke-width:3.0pt; stroke-opacity: 0.8; stroke-dashrray: 0")
      .attr("translate", "scale(1.0)");

      // used for zooming
      function redraw() {
        // console.log("here", d3.event.translate, d3.event.scale);
        svg.attr( "transform", "translate(" + d3.event.translate[0] + "," + d3.event.translate[1] + ") scale(" + d3.event.scale + ")" );
      }

      // colors selected nodes in red
      function color_node(node) {
            // console.log("color_node");
            if (node.selected) { return "red"; }
            else { return fill(node.group);}
          }

          force
          .nodes(nodeObjects)
          .links(edgeObjects)
          .size([conf.width,conf.height])
          .start();

      // converge the graph
      for (var i = nodeObjects.length * nodeObjects.length * 3 + 1000; i > 0; --i) force.tick();


        function fade(opacity, d) {
            // important, otherwise the events bubble up in the DOM and may show closeby links/nodes
            // d3.event.stopPropagation();

            var thisOpacity;

            // return to default view
            if( opacity === conf.node_def_opacity )
            {
              d3.selectAll('marker > path').transition().style("opacity", 1);
              // d3.selectAll('marker > path').transition().style('display', '');
              nodeGroup.transition().duration(conf.hoverDuration).style("opacity", conf.node_def_opacity);
              link.style("stroke-opacity", conf.link_def_opacity);
            }
            else // fade not-neighborhood away
            {
              d3.selectAll('marker > path').transition().style("opacity", 0);
              // d3.selectAll('marker > path').transition().style('display', 'none');
              nodeGroup.transition().duration(conf.hoverDuration).style("opacity", function(o)
              {
                thisOpacity = isConnected(d, o) ? conf.node_def_opacity : opacity;
                return thisOpacity; 
              });

              link.style("stroke-opacity", function(o) {
                return o.source === d || o.target === d ? conf.link_def_opacity : opacity;
              });              
            }
          }    

          var link = svg.selectAll("line.link")
          .data( edgeObjects )
          .enter().append("line")
          .attr("class", "link")
          .attr("id", function(d) { return d.id; } )
            // .style("stroke", "black")
            .style("stroke-width", 
              function(d) { return getLinkStroke( d ) } )
            .on("mouseover", function(d) {

              if( timer )
              {
                clearTimeout(timer);
                timer = null;
              }
              var selection = d3.select(this);
              timer = setTimeout( function() {
                var initialWidth = Number( selection.style("stroke-width") );
                selection.transition().duration(conf.hoverDuration).style("stroke-width", initialWidth + Number(4) )
                .style("stroke-opacity", 1.0);
              }, conf.eventDelay );

            } )
            .on("mouseout", function(d) {

              if( timer )
              {
                clearTimeout(timer);
                timer = null;
              }
              var selection = d3.select(this);
              selection.transition().duration(conf.hoverDuration).style("stroke-width", getLinkStroke( selection.data()[0] ) )
              .style("stroke-opacity", conf.link_def_opacity);

            })
            .on("mousedown", function(d) {
              // will modify model -> appropriate actions taken
              App.Utilities.updateLink(d);
            }) // mousedown
            .style("stroke-opacity", conf.link_def_opacity )
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; })
            .attr("marker-end", function(d) { 
              return (d.correlation > 0) ? "url(#arrow-activating)" : "url(#arrow-inhibiting)";
            })
            .style("stroke-dasharray", function(d) { 
              if( d.distance )
              {
                return ( d.distance < 10000 ) ? "2, 3" : "none";
              }
              return "none";
            } )
            .call(force.drag);


            var getNodeTransformMatrix = function(d)
            {
              var matrix = "matrix(";
              var scale = 0.55; // sx & sy
              if( d.hasOwnProperty('gene_interesting_score') && d.gene_interesting_score > 0 )
              {
                scale = ( (d.gene_interesting_score - minScore ) / ( maxScore - minScore ) ) * 0.5 + 0.25; 
              }
              d._scale = scale;
              matrix += scale + ",0,0," + scale + "," + ( d.x - ( scale*conf.nodeImageW/2 ) ) + "," + ( d.y - ( scale*conf.nodeImageH/2 ) ) + ")";
              return matrix;   
            };

        // add nodes elements
        var nodeGroup = svg.selectAll("image.node").data(nodeObjects).enter()
        .append("svg:g")
        .attr("id", function(d) { return d.id; }) 
        .attr("class", "nodeGroup")
        .attr("type", function(d) { return d.source; })
        .call(force.drag);

        var node = nodeGroup.append("svg:g")
        .attr("class", "node")
        .attr("transform", function(d) { return getNodeTransformMatrix(d); } )
        .on("click", function(d) { 
          console.log("nodeclick");
        } )
        // display closest neighbors and fade others out
        .on("mouseover", function(d) {
          if( timer )
          {
            clearTimeout(timer);
            timer = null;
          }

          timer = setTimeout( function() {
            fade(0.10, d);
          }, conf.eventDelay);         
        } )
        // return to default view
        .on("mouseout", function(d)
        {
          if( timer )
          {
            clearTimeout(timer);
            timer = null;
          }
          fade(conf.node_def_opacity, d);
        })
        .each( function(d) {
          var added = d3.select(this).node().appendChild( App.Graph.nodeElements[d.source].cloneNode(true) );
          d3.select( added )
          .attr("width", conf.nodeImageW)
          .attr("height", conf.nodeImageH);
        });

        var nodeText = nodeGroup
        .append("svg:text")
        .attr("class", "nodetext")
        .attr("text-anchor", "middle")
        .attr("x", function(d) { return d.x } ) 
        .attr("y", function(d) {
          // use the scale[gene interesting score / default] to determine suitable offset from node image center
          return d.y - (conf.nodeImageH * d._scale / 2) - 5;
        } ) 
        //.attr("dx", "0em")
        //.attr("dy", "-1.70em")
        .text( function(d) { return (!d.label || d.label === '-' || d.label === '') ? "(no label)" : d.label } );

        // color the reference node using CSS
        d3.select(".nodeGroup#n" + referenceNodeId + "> text")
        .attr("id", "startNode");


        // for determining what to fade out on mouseover
        var linkedByIndex = {};
        edgeObjects.forEach(function(d) {
          linkedByIndex[d.source.index + "," + d.target.index] = 1;
        });          

        function isConnected(a, b)
        {
          return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index == b.index;
        }

        // determine tick functionality; triggered e.g. when nodes are dragged
        force.on("tick", function()
        {

          link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

          // move node to new position
          node.attr("transform", function(d) { return getNodeTransformMatrix(d); } );

          // mode nodeText to new position
          nodeText
          .attr("x", function(d) { return d.x } )
          .attr("y", function(d) { return d.y } ); 
        });

        // force.stop();
        for(var i = 0; i < force.nodes().length; ++i )
        {
          force.nodes()[i].fixed = true;
        }

          // quickfix: override path dashline property so markers are solid lines (chrome renders wrong?, firefox correctly)
          $('defs > marker[id="arrow-activating"]').css('stroke-dasharray', "0");
          $('defs > marker[id="arrow-inhibiting"]').css('stroke-dasharray', "0");



  // if other tabs had previous selections, show them
  var selectedLink = App.Models.sidebar.get('link');
  if( selectedLink )
  {
    App.Graph.selectLink({current: selectedLink});
  }
};