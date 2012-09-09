window.App.Utities.onLoad = function() {
	
	Number.prototype.toFixedDown = function(digits) {
      var n = this - Math.pow(10, -digits)/2;
      return n.toFixed(digits);
    }

    // add functionality to primitives:
    Array.max = function( array ){
        return Math.max.apply( Math, array );
    };

    Array.min = function( array ){
        return Math.min.apply( Math, array );
    };

    Array.prototype.count = function( elementToFind )
    {
      return $.grep(this, function(elem) {
        return elem === elementToFind;
      }).length;
    };

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
}