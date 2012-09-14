window.App.Graph.config = {

  container = '#graphTab',

  // node svg image rendering size
  nodeImageH: 50,
  nodeImageW: 50,


  maxNodeSize: 240,

  // starting node color
  referenceNodeColor: "#FFEE00",

  // rendering area
  width: //$(window).width() * 0.7 - 50,
  height: $(window).height() *0.95 - 25,

  // opacities used for fading and returning back
  link_def_opacity: 0.6,
  node_def_opacity: 1.0,

  linkDefaultColor: '#000000',
  linkSelectedColor: "#FFD700",

};


window.App.Graph.initGraph = function() //json, patientBarcodes )
{
  var conf = App.Graph.config;

    var getLinkStroke = function( edgeO )
    {
      return Number(edgeO.pvalue) * 0.4 + 3 || Number(4);
    };

      // remove previous graph
      d3.select( conf.container + " > svg" ).remove();

      var nodeObjects = App.Models.nodes.getNodes();
      var edgeObjects = App.Models.edges.getEdges();

      // // split patient values and form numbers
      // var patientVal;
      // $.each( json.nodes, function(ind,node)
      // {
      //   json.nodes[ind].patientvals = node.patientvals.split(":");
      // });


      // clear previous sidetabs:
      // clearLinkSidetabs();

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
      .linkStrength( 1 )
      .gravity(0.05)
      .charge(-150)
      .size([conf.width, conf.height]);

      var svg = d3.select( conf.container ).append("svg:svg")
      .attr("width", conf.width)
      .attr("height", conf.height)
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

      var nodeLegend = d3.select( conf.container + " > svg" ).append("svg:image")
      .attr("id", "nodeLegend")
      .attr("xlink:href", "img/legend_round.svg")
      .attr("width", 100)
      .attr("height", 300);

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
      // .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("viewBox", "4 4 15 10")
      // // .attr("refY", 0)
      .attr("markerWidth", 20)
      .attr("markerHeight", 20)
      .attr("markerUnits", "userSpaceOnUse")
      .attr("orient", "auto")
      .attr("style", "overflow:visible")      
      .append("svg:path")
      // .attr("stroke", "none")
      // .attr("fill", "#FF3300")
      .attr("d", "M 0.0,5.65 L 0.0,-5.65")
      //.attr("d", "M0,-5L10,0L0,5")
      .attr("style", "fill:none;fill-opacity:0.75000000;fill-rule:evenodd;stroke:#FF0000;stroke-width:3.0pt; stroke-opacity: 0.8; stroke-dashrray: 0")
      .attr("translate", "scale(1.0)");

      // used for zooming
      function redraw() {
        // console.log("here", d3.event.translate, d3.event.scale);
        svg.attr( "transform", "translate(" + d3.event.translate[0] + "," + d3.event.translate[1] + ") scale(" + d3.event.scale + ")" );

        // svg.attr("transform",
        //     "translate(" + d3.event.translate + ")"
        //     + " scale(" + d3.event.scale + ")");
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


        function fade(opacity) {
          return function(d) {
            var thisOpacity;

            // return to default view
            if( opacity === conf.node_def_opacity )
            {
              d3.selectAll('marker > path').transition().style("opacity", 1);
              // d3.selectAll('marker > path').transition().style('display', '');
              nodeGroup.transition().style("opacity", conf.node_def_opacity);
              link.style("stroke-opacity", conf.link_def_opacity);
            }
            else // fade not-neighborhood away
            {
              d3.selectAll('marker > path').transition().style("opacity", 0);
              // d3.selectAll('marker > path').transition().style('display', 'none');
              nodeGroup.transition().style("opacity", function(o)
              {
                thisOpacity = isConnected(d, o) ? conf.node_def_opacity : opacity;
                return thisOpacity; 
              });

              link.style("stroke-opacity", function(o) {
                return o.source === d || o.target === d ? conf.link_def_opacity : opacity;
              });              
            }
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
              var selection = d3.select(this);
              var initialWidth = Number( selection.style("stroke-width") );
              selection.transition().style("stroke-width", initialWidth + Number(4) )
              .style("stroke-opacity", 1.0);
              //.style("stroke", linkOverColor);
            } )
            .on("mouseout", function(d) {
              var selection = d3.select(this);
              selection.transition().style("stroke-width", getLinkStroke( selection.data()[0] ) )
              .style("stroke-opacity", conf.link_def_opacity);
            })
            .on("mousedown", function(d) {
              if( linkSelection.length > 0 )
              {
                if( linkSelection[0].id === this.id )
                {
                  d3.select( this ).style("stroke", conf.linkDefaultColor);
                  linkSelection.pop()
                  clearLinkSidetabs();
                  return;
                }
                d3.select( linkSelection[0] ).style("stroke", conf.linkDefaultColor);
                linkSelection.pop();
                clearLinkSidetabs();
              }

              d3.select(this).style("stroke", conf.linkSelectedColor);
              linkSelection.push(this);

              var sourceData = d3.select(".nodeGroup#" + d.source.id).data()[0];
              var targetData = d3.select(".nodeGroup#" + d.target.id).data()[0];
              
              // TODO
              //plotNodePatientValues( sourceData, targetData, d );

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
          matrix += scale + ",0,0," + scale + "," + ( d.x - ( scale*conf.nodeImageW/2 ) ) + "," + ( d.y - ( scale*conf.nodeImageH/2 ) ) + ")";
return matrix;          
};



        // add nodes elements
        var nodeGroup = svg.selectAll("image.node").data(nodeObjects).enter()
        .append("svg:g")
        .attr("id", function(d) { return d.id; }) 
        .attr("class", "nodeGroup")
        .call(force.drag);

        var node = nodeGroup.append("svg:image")
        // .attr("viewBox", "0 0 300 300") // + nodeImageW + " " + nodeImageH)
.attr("class", "node")
.attr("xlink:href", function(d)
{
  switch( d.source )
  {
    case "GEXP": return "img/node_gexp.svg";
    case "CNVR": return "img/node_cnvr.svg";
    case "METH": return "img/node_meth.svg";
    case "CLIN": return "img/node_clin.svg";
    case "GNAB": return "img/node_gnab.svg";
    case "MIRN": return "img/node_mirn.svg";
    case "SAMP": return "img/node_samp.svg";
    case "RPPA": return "img/node_rppa.svg";
  }
})
.attr("width", conf.nodeImageW)
.attr("height", conf.nodeImageH)
.attr("transform", function(d) { return getNodeTransformMatrix(d); } )
.on("click", function(d) { 
  console.log("nodeclick");
} )
        // display closest neighbors and fade others out
        .on("mouseover", fade(0.10) )
        // return to default view
        .on("mouseout", fade(conf.node_def_opacity) );


        var nodeText = nodeGroup
        .append("svg:text")
        .attr("class", "nodetext")
        .attr("x", function(d) { return d.x } ) 
        .attr("y", function(d) { return d.y } ) 
        .attr("dx", "1.5em")
          //.attr("dy", "")
          .text( function(d) { return d.label; } );

        // color the reference node:
        d3.select(".nodeGroup#n" + referenceNodeId + "> text").style("fill", conf.referenceNodeColor);


        // for determining what to fade out on mouseover
        var linkedByIndex = {};
        edgeObjects.forEach(function(d) {
          linkedByIndex[d.source.index + "," + d.target.index] = 1;
        });          

        function isConnected(a, b) {
          return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index == b.index;
        }

        // determine tick functionality; triggered e.g. when nodes are dragged
        force.on("tick", function() {

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

}; // initgraph