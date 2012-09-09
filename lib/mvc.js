
// only after page is loaded
jQuery( function($) 
{
	// namespace the app
	window.App = {
		Controllers: {},
		Models: {},
		Views: {},

		Graph: {},
		Heatmap: {},
		Paths: {},

		Utilities: {}
	};

	/* MODELS & COLLECTIONS: */

	// override default ajax-sync to local storage (plugin)
	Backbone.sync = function(method, model, options)
	{
		var resp;
		// remember to define this for each model/collection!
		var store = model.localStorage || model.collection.localStorage;

		switch(method)
		{
			case "read": resp = model.id ? store.find(model) : store.findAll(); break;
			case "create": resp = store.create(model); break;
			case "update": resp = store.update(model); break;
			case "delete": resp = store.destroy(model); break;
		}

		if (resp)
		{
			// operation succeeded
			options.success(resp);
		}
		else{
			//failed, throw error
			options.error("Record not found");
		}
	};

	// window.Graph = Backbone.Model.extend( {
	// 	defaults: {
	// 	},

	// 	initialize: function( config ) {
	// 		// _.bindAll(this, '');
	// 	}
	// });

	window.Dataset = Backbone.Model.extend( {
		defaults: {
			name: "",
			samples: [],
			clinicalNodes: [], // only names, not actual Nodes; {id: 1234, name: 'sth' }
			fetchClinType: 'POST',
			fetchClinURL: '/graph/getCLINNodes',

			fetchSampleType: 'POST',
			fetchSampleURL: '/graph/getSampleData',

			referenceNodeId: undefined
		},

		initialize: function(name)
		{
			this.name = name;

			// _.bindAll(this, 'getCLINNodes');

			// 1. prefetch clinical nodes
	        $.ajax( {
	                type: this.fetchClinType,
	                url: this.fetchClinURL,
	                dataType: "json",
	                //async: false,
	                data: JSON.stringify( { datalabel: this.name } ),
	                contentType: "application/json",
	                success: function( json )
	                {
	                	this.clinicalNodes = json.nodes;
	                },
	                failure: function( errMsg )
	                {
	                  console.log( errMsg );
	               }
	             } );

	        // 2. prefetch patient sample classifications:
	        $.ajax( {
	                type: fetchSampleType,
	                url: fetchSampleURL,
	                dataType: "json",
	                //async: false,
	                data: JSON.stringify( { datalabel: this.name } ),
	                contentType: "application/json",
	                success: function( json )
	                {
	                	this.samples = json.samples;
	                },
	                failure: function( errMsg )
	                {
	                  console.log( errMsg );
	               }
	             } );

		},
	});

	window.DatasetCollection = Backbone.Model.extend({
		defaults: {
			datasets: [],
			fetchURL: '/graph/getDatasets',
			fetchType: 'GET',

			// selected dset
			active: undefined
		},

		initialize: function() 
		{
			_.bindAll(this, 'getNames', 'find', 'setActive');			

		 	// initialize every dataset
	      $.ajax( {
	        url: this.fetchURL,
	        type: this.fetchType,
	        dataType: 'json',
	        async: false,
	        success: function(json) {
	        	$.each( json.datalabels, function(ind, label)
	        	{
	        		this.datasets.push( new Dataset( label ) );
	        	});
	        }
	    });
	  },

		getNames: function()
		{
			var names = [];
			$.each( this.datasets, function(ind,dset)
			{
				names.push( dset.name );
			});
			return names;
		},

		find: function(attr, value)
		{
			return $.grep( this.datasets, function(ele) { return ele.get(attr) === value } )[0];
		},

		// this will change active dataset and trigger search views to update
		setActive: function( name )
		{
			this.set({ active: this.find('name', name)});
		}

	});

	// node model
	window.Node = Backbone.Model.extend( {
		defaults: {
			fetchPatientsURL: '/graph/getNodePatients',
			fetchType: 'POST',
			patientsDelim: ':'
		},
		
		initialize: function( obj )
		{
			// copy the incoming attributes
			$.extend( this, obj );
			_.bindAll(this, 'fetchPatients');

			// add to collection
			window.nodes.add( this );
		},
		
		fetchPatients: function()
		{
		      $.ajax( {
		        url: this.fetchPatientsURL,
		        type: this.fetchType,
		        dataType: 'json',
		        data: JSON.stringify( { nodeId: this.id } ),
		        async: false,
		        success: function(json) {
		        	this.patientvals = json.patients.split(patientsDelim);
		        }
		    });
		}
	});

	window.Edge = Backbone.Model.extend( {
		defaults: {
		},

		initialize: function(obj)
		{
			$.extend( this, obj );

			// add to collection
			window.edges.add( this );
		}

	});

	window.NodeCollection = Backbone.Collection.extend( {
		model: Node,
		localStorage: new Store("nodes"),

		// initialize: function( nodes ) {
		// 	$.each( nodes, function(ind,node)
		// 	{

		// 	});

		// }

		// comparator: function(node)
		// {
		// 	return node.get.ele.
		// });
	});

	window.EdgeCollection = Backbone.Collection.extend( {
		model: Edge,
		localStorage: new Store("edges"),
	});


	/* CONTROLLERS */
	// TODO, routing



	/* VIEWS */

	// main view to cover the overall functionality of the app:
	window.AppView = Backbone.View.extend({
		defaults: {
			dataset: undefined,

		},
		initialize: function()
		{
			// 1. create datasets, this will populate every dataset with
			// samples etc.

			this.datasets = window.App.Models.datasets = new DatasetCollection;
			this.datasetView = window.App.Views.dataset = new DatasetView( this.datasets );

			// search views
			this.clinSearch = window.App.Views.clinSearch = new ClinicalSearchView( this.datasets );
			this.freeSearch = window.App.Views.freeSearch = new FreeSearchView( this.datasets );
			this.regulatorySearch = window.App.Views.regulatorySearch = new RegulatorySearchView( this.datasets );

			// create collections
			this.nodes = window.App.Models.nodes = new NodeCollection;
			this.edges = window.App.Models.edges = new EdgeCollection;

			// header tab views
			this.graph = window.App.Views.graph = new GraphView(this.datasets);
			this.heatmap = window.App.Views.heatmap = new HeatmapView(this.datasets);
			this.paths = window.App.Views.paths = new PathView(this.datasets);

			this.dialog = window.App.Views.dialog = new DialogView;
		}
	});

	// covers dataset dropdown list
	window.DatasetView = Backbone.View.extend( {
		defaults: {
			el:  $('select#datasetSelection')
		},

		events: {
			// fired when dropdown menu is changed:
			"change select#datasetSelection": "changeDataset"
		},

		initialize: function(model) {
			this.model = model;
			_.bindAll(this, 'render', 'changeDataset');

			// bind all model changes to this -> rerender
			//this.model.bind('change', this.render);
		},

		// render the dataset dropdown
		render: function() {

	      var template = '{{each names}}<option value="${$value}>${$value}</option>{{/each}}';
	      $( this.ele ).html( jQuery.tmpl(
	      	template, 
	      	{ names: this.model.getNames() } ) );

	      $( this.ele ).selectmenu({
	        style:'dropdown', 
	        format: addressFormatting,
	        menuWidth: 200,
	        // change: function() {
	        //   console.log("dataset change");
	        //   heatMapDrawn = false;
	        //   updateClinNodes();
	        //   updatePatientBarcodes();
	        //   updateSampleClassifications();
	        // }
	      });
		},

		changeDataset: function() {
			this.model.setActive( $('select#datasetSelection option:selected').val() );
		}
	});


	/* SEARCH VIEWS */

	window.ClinicalSearchView = Backbone.View.extend({
		defaults: {
			el: $('#clinSelect'),
			template: $('#clinicalSearchTmpl'),
			fetchType: 'POST',
			fetchURL: '/graph/regulatoryPattern'
		},

		events: {
			'submit #clinSelect form': "submitSearch"
		},

		initialize: function(model) {
			this.model = model;

			// when selected dataset name is changed
			window.App.Models.datasets.bind('change:active', this.render);
			_.bindAll(this, 'submitSearch');
		},

		render: function() {
			// draw the html to div
			this.template.tmpl( window.App.Models.datasets.get('active').get('clinicalNodes') );
		},

		submitSearch: function()
		{	
          var query = { 
            datalabel: window.App.Models.datasets.get('active').get('name'),
            clinicalNodeId: $('#regulatory select[name="nodeName"] option:selected').val(),
            middleNodeType: $("#regulatory #middleNodeType option:selected").attr("id"),
            targetType: $('#regulatory select#sourceNodeType option:selected').attr('id'),
            mutatedType: $('#regulatory select#sourceNodeType option:selected').attr('type'),
            distanceThreshold: 100000,
          };

          switch( query.targetType )
          {
          	case 'METH': 
          	query['gexpTargetCorrelationType'] = 'negative';
          	break;
          	case 'CNVR':
          	query['gexpTargetCorrelationType'] = 'positive';
          	break;
          	case 'MIRN':
          	query['gexpTargetCorrelationType'] = 'negative';
          	break;
          	case 'METH':
          	query['gexpTargetCorrelationType'] = 'negative';
          	break;
          };

          window.App.Views.dialog.openLoading();

        $.ajax( {
                type: this.fetchType,
                url: this.fetchURL,
                dataType: "json",
                //async: false,
                data: JSON.stringify( query ),
                contentType: "application/json",
                success: function( json )
                {
                	// will fire update & reset event
                	window.App.Utilities.updateElements( json );
                },
                failure: function( errMsg )
                {
                  console.log( errMsg );
               }
             } );
    	}
	});

	window.FreeSearchView = Backbone.View.extend({
		defaults {
			el: $('#freeSearch'),
			template: $('#clinicalSearchTmpl'),
			fetchExistsType: 'POST',
			fetchExistsURL: '/graph/nodeExists',
			fetchType: 'POST',
			fetchURL: '/graph/neighborhood'
		},

		events: {
			'submit #freeSearch form': "submitSearch"
		},

		initialize: function(model) {
			this.model = model;

			// when active dataset changes
			this.model.bind("change:active", this.render);

			_.bindAll(this, 'submitSearch', 'render');

			this.render();
		},

		render: function() {
			// draw the html to div
			this.template.tmpl( window.App.Models.datasets.get('active').get('clinicalNodes') );
		},

		submitSearch: function()
		{
	        var query = { 
	        	nodeLabel: $('#freeSearch input#labelSearch').val(),
	        	nodeType: $('#freeSearch select#nodeType').val(), 
	        	datalabel: window.App.Models.datasets.get('active').get('name')
	        };


	        $.ajax( {
	          type: fetchExistsType,
	          url: fetchExistsURL,
	          async: false,
	          data: JSON.stringify( query ),
	          dataType: "json",
	          contentType: "application/json",
	          success: function( result )
	          {
	              if( result['nodeExists'] === false )
	              {
	                window.App.Views.dialog.openNodeNotFound();
	                return;
	              }
	          },
	          failure: function(errMsg) {
	          	console.log( errMsg );
	          	window.App.Views.dialog.openNodeNotFound();
	          }
	      });


          var neighborhoodQuery = { 
            nodeLabel: $('#freeSearch > input[id=labelSearch]').val(), 
            nodeType: $('#freeSearch > select[id=nodeType]').val(),
            depth: $('#freeSearch > select[id=depth]').val(),
            nodes: $('#freeSearch > select[id=nodes]').val(),
            edgeType: $('#freeSearch > select[id=edgeType]').val(),
            edgeOrdering: $('#freeSearch > select[id=edgeOrdering]').val(),
            edgeOrderingAttribute: $('#freeSearch > select[id=edgeOrderingAttribute]').val(),
            datalabel: window.App.Models.datasets.get('active').get('name')
          };

          // if( result['nodes'].length > 0 )
          // {
          //   openTableDialog("Several node labels found", "Select suitable node as a starting node", result.nodes );
          //   return;
          // }

          if( $('#freeSearch > select[id="firstEdgeType"]').val() !== 'Any' )
          {
            neighborhoodQuery['firstEdgeType'] = $('#freeSearch > select[id="firstEdgeType"]').val();
          }

          if( $('#freeSearch > select[id="secondEdgeType"]').val() !== 'Any' )
          {
            neighborhoodQuery['secondEdgeType'] = $('#freeSearch > select[id="secondEdgeType"]').val();
          }

          window.App.Views.dialog.openLoading();

          $.ajax( {
                    type: fetchType,
                    url: fetchURL,
                    data: JSON.stringify( neighborhoodQuery ),
                    dataType: "json",
                    contentType: "application/json",
                    success: function( result )
                    {
                        if( result.nodes.length === 0 )
                        {
                        	window.App.Views.dialog.openEmpty();
                        	return;
                        }

                        window.App.Utilities.updateElements( result );
                        window.App.Views.dialog.close();
                    },
                    failure: function( errMsg )
                    {
                      window.App.Views.dialog.close();
                      console.log( errMsg );
                   }
                 } );
		}
	});

	window.RegulatorySearchView = Backbone.View.extend({
		defaults {
			el: $('#regulatory'),
			template: $('#regulatorySearchTmpl'),
			fetchType: 'POST',
			fetchURL: '/graph/regulatoryPattern'
		},

		events: {
			'submit #regulatory form': "submitSearch"
		},

		initialize: function(model) {
			this.model = model;
			_.bindAll(this, 'submitSearch', 'render');

			// when active dataset changes
			this.model.bind("change:active", this.render);
		},

		render: function() {
			// draw the html to div
			this.template.tmpl( window.App.Models.datasets.get('active').get('clinicalNodes') );
		},

		submitSearch: function() {

			window.App.Views.dialog.openLoading();
          $.ajax( {
                    type: fetchType,
                    url: fetchURL,
                    data: JSON.stringify( neighborhoodQuery ),
                    dataType: "json",
                    contentType: "application/json",
                    success: function( result )
                    {
                        if( result.nodes.length === 0 )
                        {
                        	window.App.Views.dialog.openEmpty();
                        	return;
                        }
                        window.App.Utilities.updateElements( result );
                        window.App.Views.dialog.close();
                    },
                    failure: function( errMsg )
                    {
                    	window.App.Views.dialog.close();
                      console.log( errMsg );
                   }
                 } );			

		}
	});


	/* HEADERTABS VIEWS */

	window.GraphView = Backbone.View.extend({
		defaults: {
			el: $('#graphTab.headertab'),
			tabId: 0,
			rendered: false
		},
		events: {
			// when header is pressed, this fires
			'click headertabs > ul > li a[href="#graphTab"]': 'showTab'
		},
		// model is datasets
		initialize: function(model) {
			this.model = model;
			_.bindAll(this, 'render', 'showTab');

			// adding to nodes/edes collections will cause rerendering
			window.App.Models.nodes.bind("add", this.render);

			// reset will allow rendering again
			window.App.Models.nodes.bind("reset", function() {
				this.rendered = false;
			});
		},

		render: function() { 
			// render only if shown
			if( $('#headertabs').tabs('option','selected') === this.tabid ) {
				this.showTab();
			}
		},

		showTab: function() {
			// no use calculating the same view
			if( this.rendered ) return;

			// call to be drawn
			window.App.Graph.initGraph();
			this.rendered = true;
		}
	});

	window.HeatmapView = Backbone.View.extend({
		defaults: {
			el: $('#pathTab'),
			tabId: 1,
			rendered: false
		},
		events: {
			// when header is pressed, this fires
			'click #headertabs > ul > li a[href="#heatmapTab"]': 'showTab'
		},
		initialize: function() {
			_.bindAll(this, 'render', 'showTab');

			// adding to nodes/edes collections will cause rerendering
			window.App.Models.nodes.bind("add", this.render);

			// reset will allow rendering again
			window.App.Models.nodes.bind("reset", function() {
				this.rendered = false;
			});
		},

		render: function() { 
			// when dataset changes, this is no longer rendered
			this.rendered = false;

			// dataset changed while this was active
			if( $('#headertabs').tabs('option','selected') === this.tabid ) {
				this.showTab();
			}
		},

		showTab: function() {
			// no use calculating the same view
			if( this.rendered ) return;

			// call to be drawn
			window.App.Heatmap.initHeatmap();
		}
	});

	window.PathView = Backbone.View.extend({
		defaults: {
			el: $('#pathTab'),
			tabId: 2,
			rendered: false
		},
		events: {
			// when header is pressed, this fires
			'click #headertabs > ul > li a[href="#pathTab"]': 'showTab'
		},
		initialize: function() {
			_.bindAll(this, 'render', 'showTab');

			// adding to nodes/edes collections will cause rerendering
			window.App.Models.nodes.bind("add", this.render);

			// reset will allow rendering again
			window.App.Models.nodes.bind("reset", function() {
				this.rendered = false;
			});
		},

		render: function() { 
			// when dataset changes, this is no longer rendered
			this.rendered = false;

			// dataset changed while this was active
			if( $('#headertabs').tabs('option','selected') === this.tabid ) {
				this.showTab();
			}
		},

		showTab: function() {
			// no use calculating the same view
			if( this.rendered ) return;

			// call to be drawn
			window.App.Paths.initPaths();
		}
	});


	// rewrite this
      // var openTableDialog = function( title, message, aoNodes )
      // {
      //   $('#dialog').html("<p>" + message + "</p>" );
      //   $('#dialog').dialog('option', 'title', title);
      //   // $('#dialog').dialog('option', 'width', '600');
      //   // $('#dialog').dialog('option', 'height', '600');

      //   $('#dialog').css("display", "block");
      //   $('#dialog').append( '<table id="dialogTable" cellpadding="0" cellspacing="0" border="0"></table>' );

      //   var oTable = $('#dialog > table').dataTable( {
      //       // "bFilter": false,
      //       // "bInfo": false,

      //       "bProcessing": true,
      //       "bAutoWidth": false,
      //       "aaData": aoNodes,
      //       "bJQueryUI": true,
      //       "sDom": '<"H"lfr>t<"F"Cip>',
      //       "aoColumns": [
      //           { "sTitle": "Id",
      //             "mData": "id",
      //             "sWidth": '50px' },
      //           { "sTitle": "Label",
      //             "mData": "label",
      //             "sWidth": '200px' },
      //           { "sTitle": "Chromosome",
      //             "mData": "chr",
      //             "sWidth": '50px' },
      //           { "sTitle": "Start",
      //             "mData": "start",
      //             "sWidth": '80px' },
      //           { "sTitle": "Source",
      //             "mData": "source",
      //             "sWidth": '80px' },
      //           { "sTitle": "Type",
      //             "mData": "type",
      //             "sWidth": '50px' }
      //       ]
      //   } );
      //   $('#dialog').dialog("open");        

      // }


	window.DialogView = Backbone.View.extend({
		defaults: {
			el: $('#dialog'),
			active: false,
	        nodeNotFound : { 
	        	title: "Invalid node label",
	        	message: 'Node label does not exist.'
	        },
	        loadingDialog : {
	        	title: "Loading",
	        	message: 'Loading graph data, please wait.<br><br><img src="img/waiting-small.gif" style="display: block; margin-left: auto; margin-right: auto;" />'
	        },
	        empty: {
	        	title: 'Empty graph',
	        	message: 'The resulting graph does not contain any nodes.'
	        }
		},

		initialize: function() {
			_.bindAll(this, 'open', 'openNodeNotFound', 'openLoading', 'openEmpty', 'close');

	      //bind dialog to its div
	      this.el.dialog({
	      autoOpen: false,
	      width: 'auto',//width: 300,
	      height: 'auto',
	      resizable: true,
	      show: {effect: 'fade', duration: 200},
	      hide: {effect: 'fade', duration: 200},
	      modal: true,
	      closeOnEscape: true,
	      // close dialogs if background is clicked
	      open: function(){
	          jQuery('.ui-widget-overlay').bind('click',function(){
	              this.el.dialog('close');
	          })
	      },
	      buttons: {
	        "Close": function() {
	        $(this).dialog("close");
	        },
	      },

	      });

		},

		openNodeNotFound: function() {
			this.open( this.nodeNotFound );
		},

		openLoading: function() {
			this.open( this.loadingDialog );
		},

		openEmpty: function() {
			this.open( this.empty );
		},

		open: function( config ) {
			this.el.dialog( 'option', 'title', config.title );
			this.el.html('<p>' + message + '</p>');
			this.el.dialog('open');
			this.active = true;
		},

		close: function() {
			this.el.dialog('close');
			this.html('');
			this.active = false;
		}

	});



	// Start everything
	window.App.view = new AppView;

}); // jquery ready, end