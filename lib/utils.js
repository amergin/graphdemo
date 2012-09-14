(function(){

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