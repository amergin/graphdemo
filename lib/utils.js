(function(){

// see http://doginthehat.com.au/2012/02/comparison-block-helper-for-handlebars-templates/
Handlebars.registerHelper('compare', function(lvalue, rvalue, options) {

    if (arguments.length < 3)
        throw new Error("Handlerbars Helper 'compare' needs 2 parameters");

    operator = options.hash.operator || "==";

    var operators = {
        '==':       function(l,r) { return l == r; },
        '===':      function(l,r) { return l === r; },
        '!=':       function(l,r) { return l != r; },
        '<':        function(l,r) { return l < r; },
        '>':        function(l,r) { return l > r; },
        '<=':       function(l,r) { return l <= r; },
        '>=':       function(l,r) { return l >= r; },
        'typeof':   function(l,r) { return typeof l == r; }
    }

    if (!operators[operator])
        throw new Error("Handlerbars Helper 'compare' doesn't know the operator "+operator);

    var result = operators[operator](lvalue,rvalue);

    if( result ) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }

});

// combobox extension
    (function( $ ) {
        $.widget( "ui.combobox", {
            _create: function() {
                var input,
                    that = this,
                    select = this.element.hide(),
                    selected = select.children( ":selected" ),
                    value = selected.val() ? selected.text() : "",
                    wrapper = this.wrapper = $( "<span>" )
                        .addClass( "ui-combobox" )
                        .insertAfter( select );
 
                function removeIfInvalid(element) {
                    var value = $( element ).val(),
                        matcher = new RegExp( "^" + $.ui.autocomplete.escapeRegex( value ) + "$", "i" ),
                        valid = false;
                    select.children( "option" ).each(function() {
                        if ( $( this ).text().match( matcher ) ) {
                            this.selected = valid = true;
                            return false;
                        }
                    });
                    if ( !valid ) {
                        // remove invalid value, as it didn't match anything
                        $( element )
                            .val( "" )
                            .attr( "title", value + " didn't match any item" )
                            .tooltip( "open" );
                        select.val( "" );
                        setTimeout(function() {
                            input.tooltip( "close" ).attr( "title", "" );
                        }, 2500 );
                        input.data( "autocomplete" ).term = "";
                        return false;
                    }
                }
 
                input = $( "<input>" )
                    .appendTo( wrapper )
                    .val( value )
                    .attr( "title", "" )
                    .addClass( "ui-state-default ui-combobox-input" )
                    .autocomplete({
                        delay: 0,
                        minLength: 0,
                        source: function( request, response ) {
                            var matcher = new RegExp( $.ui.autocomplete.escapeRegex(request.term), "i" );
                            response( select.children( "option" ).map(function() {
                                var text = $( this ).text();
                                if ( this.value && ( !request.term || matcher.test(text) ) )
                                    return {
                                        label: text.replace(
                                            new RegExp(
                                                "(?![^&;]+;)(?!<[^<>]*)(" +
                                                $.ui.autocomplete.escapeRegex(request.term) +
                                                ")(?![^<>]*>)(?![^&;]+;)", "gi"
                                            ), "<strong>$1</strong>" ),
                                        value: text,
                                        option: this
                                    };
                            }) );
                        },
                        select: function( event, ui ) {
                            ui.item.option.selected = true;
                            that._trigger( "selected", event, {
                                item: ui.item.option
                            });
                        },
                        change: function( event, ui ) {
                            if ( !ui.item )
                                return removeIfInvalid( this );
                        }
                    })
                    .addClass( "ui-widget ui-widget-content ui-corner-left" );
 
                input.data( "autocomplete" )._renderItem = function( ul, item ) {
                    return $( "<li>" )
                        .data( "item.autocomplete", item )
                        .append( "<a>" + item.label + "</a>" )
                        .appendTo( ul );
                };
 
                $( "<a>" )
                    .attr( "tabIndex", -1 )
                    .attr( "title", "Show All Items" )
                    .tooltip()
                    .appendTo( wrapper )
                    .button({
                        icons: {
                            primary: "ui-icon-triangle-1-s"
                        },
                        text: false
                    })
                    .removeClass( "ui-corner-all" )
                    .addClass( "ui-corner-right ui-combobox-toggle" )
                    .click(function() {
                        // close if already visible
                        if ( input.autocomplete( "widget" ).is( ":visible" ) ) {
                            input.autocomplete( "close" );
                            removeIfInvalid( input );
                            return;
                        }
 
                        // work around a bug (likely same cause as #5265)
                        $( this ).blur();
 
                        // pass empty string as value to search for, displaying all results
                        input.autocomplete( "search", "" );
                        input.focus();
                    });
 
                    input
                        .tooltip({
                            position: {
                                of: this.button
                            },
                            tooltipClass: "ui-state-highlight"
                        });
            },
 
            destroy: function() {
                this.wrapper.remove();
                this.element.show();
                $.Widget.prototype.destroy.call( this );
            }
        });
    })( jQuery );


// see https://github.com/documentcloud/underscore/issues/220
_.mixin({
  // ### _.objMap
  // _.map for objects, keeps key/value associations
  objMap: function (input, mapper, context) {
    return _.reduce(input, function (obj, v, k) {
     obj[k] = mapper.call(context, v, k, input);
     return obj;
   }, {}, context);
  },
  // ### _.objFilter
  // _.filter for objects, keeps key/value associations
  // but only includes the properties that pass test().
  objFilter: function (input, test, context) {
    return _.reduce(input, function (obj, v, k) {
     if (test.call(context, v, k, input)) {
       obj[k] = v;
     }
     return obj;
   }, {}, context);
  },
  // ### _.objReject
  //
  // _.reject for objects, keeps key/value associations
  // but does not include the properties that pass test().
  objReject: function (input, test, context) {
    return _.reduce(input, function (obj, v, k) {
     if (!test.call(context, v, k, input)) {
       obj[k] = v;
     }
     return obj;
   }, {}, context);
  }
});

Array.prototype.count = function( elementToFind )
{
  return $.grep(this, function(elem) {
    return elem === elementToFind;
  }).length;
};

Number.prototype.toFixedDown = function(digits) {
  var n = this - Math.pow(10, -digits)/2;
  return n.toFixed(digits);
}

var orderObjectBy = function (name, minor) {
  return function (o, p) {
    var a, b;
    if (typeof o === 'object' && typeof p === 'object' && o && p) {
      a = o[name].toLowerCase();
      b = p[name].toLowerCase();
      if (a === b) {
        return typeof minor === 'function' ? minor(o, p) : o;
      }
      if (typeof a === typeof b) {
        return a < b ? -1 : 1;
      }
      return typeof a < typeof b ? -1 : 1;
    } else {
      throw {
        name: 'Error',
        message: 'Expected an object when sorting by ' + name
      };
    }
  }
};

    // jquery function for uniqueness
    $.extend({
      distinct : function(anArray, removeNAs) {
       var result = [];
       $.each(anArray, function(i,v){
         if ( $.inArray(v, result) == -1 ) 
         {
          if( removeNAs ) 
          {
            if( v === 'NA' )
            {
              return true;
            }
          }
          result.push(v);
        }
      });
       return result;
     }
   });    

    var removeMatching = function(originalArray, regex) {
      var j = 0;
      while (j < originalArray.length) {
        if (regex.test(originalArray[j]))
          originalArray.splice(j, 1);
        else
          j++;
      }
      return originalArray;
    };

    var parseArrays = function( arrayA, arrayB )
    {

      var resultArray = [];
      for( var i = 0; i < arrayA.length; ++i )
      {
        if( arrayA[i].toLowerCase() === 'na' || arrayB[i].toLowerCase() === 'na' )
        {
          continue;
        }
        resultArray.push( [ arrayA[i] * 1, arrayB[i] * 1 ] );
      }
      return resultArray;
    };


})(); // call the anonymous function on load



// called upon search completion, pushes the results to models
window.App.Utilities.updateElements = function( json ) 
{
  // don't keep previous link selection
  App.Models.sidebar.unset('link', {silent: true});
  
	window.App.Models.datasets.get('active').set({ referenceNodeId: json.referenceNode });

  var nodes = [];
  var edges = [];

  window.App.Models.nodes.reset();
  window.App.Models.edges.reset();

  if( json.nodes.length === 0 || json.links.length === 0 )
  {
    App.Views.dialog.close();
    App.Views.dialog.openEmpty();
    return;
  }

  $.each( json.nodes, function(ind,ele)
  {
    if( ele.hasOwnProperty('patientvals') )
    {
      ele.patientvals = ele.patientvals.split(":");
    }
   nodes.push( new Node( ele ) );
 });
  $.each( json.links, function(ind,ele)
  {
   edges.push( new Edge( ele ) );
 });

  window.App.Models.nodes.add( nodes );
    // latter will fire event which is bound
    window.App.Models.edges.add( edges );	

  App.Views.dialog.close();
};

// called when link selection is to updated:
window.App.Utilities.updateLink = function(d)
{
  if( App.Models.sidebar.get('link') && ( d.id === App.Models.sidebar.get('link').id ) )
  {
    // clicked on already active link
    App.Models.sidebar.reset();
  }
  else
  {
    App.Models.sidebar.set({ 
      nodeA: d.source,
      nodeB: d.target,
      link: d }); 
  }
};

window.App.Utilities.truncateLabel = function(label)
{
  // var label = nodeO.label;
  var labelMaxLength = App.Graph.config.labelMaxLength;
  if( label )
  {
    // if( nodeO.id === ("n" + App.Models.datasets.get('active').get('referenceNodeId') ) )
    // {
    //   return label.length > labelMaxLength ? "<b>" + label.substr(0,labelMaxLength - 3) + "..." + "</b>": "<b>" + label + "</b>";
    // }
    return label.length > labelMaxLength ? label.substr(0,labelMaxLength - 3) + "..." : label;
  }
  return "(no label)";
};

window.App.Utilities.createNodeLabel = function( nodeO )
{
  var chr = nodeO.chr ? "chr " + nodeO.chr + ", " : "";
  return chr + nodeO.start + ":" + nodeO.end;
};

window.App.Utilities.createNodeLabel2 = function( nodeO )
{
  return ( nodeO.source || "(none)" ) + " of " + App.Utilities.truncateLabel( nodeO.label )  + ", chr " + ( nodeO.chr || "(none)" );
};


// mainly for routing

window.App.Utilities.legalDataset = function( dsetName )
{
  return App.Models.datasets.find('name', dsetName);
};

window.App.Utilities.legalNodeType = function( type )
{
  var legalNodes = ['CLIN', 'METH', 'GEXP', 'GNAB', 'MIRN', 'CNVR', 'PRDM', 'SAMP', 'RPPA'];
  return _.include(legalNodes, type);
};

window.App.Utilities.legalTab = function( tabName )
{
  return _.include( App.Views.header.tabs(), tabName );
};

window.App.Utilities.legalEdgeAttr = function( attr )
{
  var legalAttrs = ['pvalue','distance', 'correlation','importance'];
  return _.include( legalAttrs, attr );
};

window.App.Utilities.legalDepth = function( depth )
{
  return +depth <= 4;
};

window.App.Utilities.legalNodeNo = function( no )
{
  return +no <= 20;
};

window.App.Utilities.legalMutated = function( mutated )
{
  return App.Views.regulatorySearch.legalMutatedType(mutated);
};
