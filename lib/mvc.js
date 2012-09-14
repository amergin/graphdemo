// namespace the app
window.App = {
  Controllers: {},
  Models: {},
  Views: {},

  Graph: {},
  Heatmap: {},
  Paths: {},
  Sidebar: { Plot: {} },

  Utilities: {}
};

// initialized later
App.Graph.initGraph = function() {};
App.Heatmap.initHeatmap = function() {};
App.Paths.initPaths = function() {};


// only after page is loaded
jQuery( function($) 
{

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
		// name: "",
		// samples: [],
		// clinicalNodes: [], // only names, not actual Nodes; {id: 1234, name: 'sth' }
		// referenceNodeId: undefined,

		defaults: {
			fetchClinType: 'POST',
			fetchClinURL: '/graph/getCLINNodes',
			fetchSampleType: 'POST',
			fetchSampleURL: '/graph/getSampleData',
			fetchBarcodesType: 'POST',
			fetchBarcodesURL: '/graph/getPatientBarcodes',
		},

		initialize: function(options)
		{
			console.log("creating Dataset ", this.get('name'));

			// _.bindAll(this, 'getCLINNodes');

			var self = this;
			// 1. prefetch clinical nodes
	        $.ajax( {
	                type: this.attributes.fetchClinType,
	                url: this.attributes.fetchClinURL,
	                dataType: "json",
	                async: false,
	                data: JSON.stringify( { datalabel: this.get('name') } ),
	                contentType: "application/json",
	                success: function( json )
	                {
	                	self.set(
	                		{ 
	                			clinicalNodes: _.sortBy(json.nodes, function(item) 
	                				{ 
	                					return item.label.toLowerCase();
	                				} ) 
	                		});
	                },
	                failure: function( errMsg )
	                {
	                  console.log( errMsg );
	               }
	             } );

	        // 2. prefetch patient sample classifications:
	        $.ajax( {
	                type: this.attributes.fetchSampleType,
	                url: this.attributes.fetchSampleURL,
	                dataType: "json",
	                //async: false,
	                data: JSON.stringify( { datalabel: this.get('name') } ),
	                contentType: "application/json",
	                success: function( json )
	                {
	                	self.set({ samples: json.samples });
	                },
	                failure: function( errMsg )
	                {
	                  console.log( errMsg );
	               }
	             } );

	        // 3. prefetch patient barcodes
	        $.ajax( {
	                type: this.attributes.fetchBarcodesType,
	                url: this.attributes.fetchBarcodesURL,
	                dataType: "json",
	                //async: false,
	                data: JSON.stringify( { datalabel: this.get('name') } ),
	                contentType: "application/json",
	                success: function( json )
	                {
	                	self.set({ barcodes: json.barcodes.split(":") });
	                },
	                failure: function( errMsg )
	                {
	                  console.log( errMsg );
	               }
	             } );
		},
	});

	window.DatasetCollection = Backbone.Model.extend({
		datasets: [],
		// selected dset
		active: undefined,

		defaults: {
			fetchURL: '/graph/getDatasets',
			fetchType: 'GET',
		},

		// options is unchanged parameters passed to constructor
		initialize: function(options) 
		{
			console.log("creating DatasetCollection");

			_.bindAll(this, 'getNames', 'find', 'setActive');			

			var self = this;
		 	// initialize every dataset
	      $.ajax( {
	        url: this.attributes.fetchURL,
	        type: this.attributes.fetchType,
	        dataType: 'json',
	        async: false,
	        success: function(json) {
	        	$.each( json.datalabels, function(ind, label)
	        	{
	        		self.datasets.push( new Dataset( { name: label } ) );
	        	});
	        }
	    });
	  },

		getNames: function()
		{
			var names = [];
			$.each( this.datasets, function(ind,dset)
			{
				names.push( dset.get('name') );
			});
			return _.sortBy( names, function(ele) { return ele.toLowerCase(); } );
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
			// $.extend( this, obj );
			_.bindAll(this);

			this.bind('change:patientvals', this.splitPatients, this);
		},

		getRaw: function() {
			// leave out non-pertinent attributes
			return _.objFilter( this.toJSON(), function(val,att) { return !this.defaults.hasOwnProperty(att); }, this );
		},

		splitPatients: function() {
			if( _.isArray( this.get('patientvals')) ) this.set({ patientvals: this.patientvals.split(this.attributes.patientsDelim) });
		},

		fetchPatients: function(options)
		{
		      $.ajax( {
		        url: this.attributes.fetchPatientsURL,
		        type: this.attributes.fetchType,
		        dataType: 'json',
		        data: JSON.stringify( { nodeId: this.id } ),
		        async: false,
		        success: function(json) {
		        	this.set( { patientvals: json.patients.split(options.patientsDelim) } );
		        }
		    });
		}
	});

	window.Edge = Backbone.Model.extend( {
		defaults: {
		},

		getRaw: function() {
			return this.toJSON();
			//_.objFilter(  this.toJSON(), function(val,att) {  return !this.defaults.hasOwnProperty(att);  }, this )
		},

		initialize: function(options)
		{
			_.bindAll(this);
			// console.log("creating new edge ", obj.id);
			// $.extend( this, obj );

		}

	});

	window.NodeCollection = Backbone.Collection.extend( {
		model: Node,
		localStorage: new Store("nodes"),

		initialize: function() {
			_.bindAll(this);
		},

		getNodes: function() {
			var objects = {};
			this.each( function(ele) 
			{ 
				objects[ele.get('id')] = ele.getRaw();
			}, this );
			return objects;
		},

		find: function(attr, value) {
			var search = {};
			search[attr] = value;
			return this.where(search);
		},

		  comparator: function(node) {
		  	return node.get('id');
		  },


	});

	window.EdgeCollection = Backbone.Collection.extend( {
		model: Edge,
		localStorage: new Store("edges"),
		initialize: function() {
			_.bindAll(this);
		},

		getEdges: function() {
			var objects = {};
			this.each( function(ele) 
			{ 
				objects[ele.get('id')] = ele.getRaw();
			}, this );
			return objects;
		},

		find: function(attr, value) {
			var search = {};
			search[attr] = value;
			return this.where(search);
		},

		  comparator: function(edge) {
		  	// note minus -> DESC
		  	return -edge.get('pvalue');
		  },

	});


	window.SidebarModel = Backbone.Model.extend({
		nodeA: undefined,
		nodeB: undefined,
		edge: undefined,

		initialize: function(options)
		{
			_.bindAll(this);
		},

		reset: function() {
			this.unset('nodeA');
			this.unset('nodeB');
			this.unset('edge');
		}
	});


	/* CONTROLLERS */
	// TODO, routing



	/* VIEWS */

	// main view to cover the overall functionality of the app:
	window.AppView = Backbone.View.extend({

		initialize: function()
		{
			// 0. initialize basic jquery ui structures:

	      // header tabs; default is graph
	      $( "#headertabs" ).tabs({ selected: 0 });

	      // search accordion with multiple plugin
	      $('#sidebar').multiAccordion( { 
	      	active: 0,
	      	// click: function(event,ui) { console.log(event,ui); }
	      });

	      // search tabs
	      $('#filter').tabs( { selected: '#clinSearch' });	      


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

			// views
			this.graph = window.App.Views.graph = new HeaderTabView( { model: this.datasets, el: $('#graphTab.headertab'), tabId: 0 } );
			this.graph.tabFunction = App.Graph.initGraph;

			this.heatmap = window.App.Views.heatmap = new HeaderTabView( { model: this.datasets, el: $('#heatmapTab.headertab'), tabId: 1 } );
			this.heatmap.tabFunction = App.Heatmap.initHeatmap;

			this.paths = window.App.Views.paths = new HeaderTabView( { model: this.datasets, el: $('#pathTab.headertab'), tabId: 2 } );
			this.paths.tabFunction = App.Paths.initPaths;

			// main view controlling the program instantiation
			var views = {};
			views[App.Views.graph.el.attr('id')] = App.Views.graph;
			views[App.Views.heatmap.el.attr('id')] = App.Views.heatmap;
			views[App.Views.paths.el.attr('id')] = App.Views.paths;
			this.header = window.App.Views.header = new HeaderView( views );

			// dialog view
			this.dialog = window.App.Views.dialog = new DialogView;

			this.sidebarMenu = window.App.Models.sidebar = new SidebarModel;
			this.sidebarView = window.App.Views.sidebar = new SidebarView({ model: this.sidebarMenu });
		}
	});

	// covers dataset dropdown list
	window.DatasetView = Backbone.View.extend( {
		el:  $('#dataset'),
		templateEl: $('#datasetTmpl'),

		events: {
			// fired when dropdown menu is changed:
			"change select": "changeDataset"
		},


		// render the dataset dropdown
		render: function() {
			$(this.el).html( this.templateCompiled( { names: this.model.getNames() } ) );

	      // $(this.el).selectmenu({
	      //   style:'dropdown', 
	      //   menuWidth: 200,
	      //   // change: function() {
	      //   //   console.log("dataset change");
	      //   //   heatMapDrawn = false;
	      //   //   updateClinNodes();
	      //   //   updatePatientBarcodes();
	      //   //   updateSampleClassifications();
	      //   // }
	      // });

	      this.changeDataset();
		},

		changeDataset: function() {
			this.model.setActive( $('#dataset select option:selected').val() );
		},

		initialize: function(model) {
			this.model = model;
			_.bindAll(this);

			this.templateCompiled = Handlebars.compile( this.templateEl.html() );

			// render dropdown and set default active
			this.render();

		},
	});

	/* SIDEBAR VIEWS */
	window.SidebarView = Backbone.View.extend({
		el: $('#sidebar'),
		tabs: {
			filter: 0,
			nodeA: 1,
			nodeB: 2,
			link: 3,
			plot: 4,
			boxplotinfo: 5
		},
		defPlotText: 'Plot',
		boxPlotText: 'Box plot',
		nodeTemplate: Handlebars.compile( $('#selectinfoNodeTmpl').html() ),
		edgeTemplate: Handlebars.compile( $('#selectinfoEdgeTmpl').html() ),

		initialize: function(options) {
			_.bindAll(this);

			this.model.bind('change', this.render, this);

			// remove all when new dataset is incoming
			App.Models.nodes.bind('reset', this._hide, this);

			// changing dataset will empty all
			App.Models.datasets.bind('change:active', this._hide, this);
		},

		render: function() {

			// change triggered by reset
			if( !this.model.get('nodeA') ) { this._hide(); }
			else { this._show(); }
		},
		      	

		_show: function() {
			var source = this.model.get('nodeA');
			var target = this.model.get('nodeB');
			var edge = this.model.get('edge');
			var sourceType = source.type;
			var targetType = target.type;
			this._showSelectInfo();

		      if( ( sourceType === 'N' && targetType === 'C' ) || ( sourceType === 'C' && targetType === 'N' ) || 
		        ( sourceType === 'N' && targetType === 'B' ) || ( sourceType === 'B' && targetType === 'N' ) )
		      {     	
		      	// show box plot info box if samples present
		      	if( App.Models.datasets.get('active').get('samples').length > 0 )
		      	{
		      		$('#sidebar').multiAccordion( { 'active': [ this.tabs['link'], this.tabs['plot'], this.tabs['boxplotinfo'] ] } );
					this.$('#plot').prev().children('a').fadeOut( function() { $(this).text(this.boxPlotText).fadeIn(); } );
		      		App.Sidebar.boxPlot();
		      		App.Sidebar.BoxPlotInfo();
		      	}
		      	else
		      	{
		      		$('#sidebar').multiAccordion( { 'active': [ this.tabs['link'], this.tabs['plot'] ] } );	      		
					this.$('#plot').prev().children('a').fadeOut( function() { $(this).text(this.boxPlotText).fadeIn(); } );
		      		App.Sidebar.boxPlot();
		      	}
		      }
		      else if( ( sourceType ===  'B' && targetType === 'B' ) || ( sourceType ===  'B' && targetType === 'C' ) ||
		        ( sourceType ===  'C' && targetType === 'B' ) || ( sourceType ===  'C' && targetType === 'C' ) )
		      {
		      	$('#sidebar').multiAccordion( { 'active': [ this.tabs['link'], this.tabs['plot'] ] } );
		      	App.Sidebar.Plot.categorical();
		      }

		},

		_hide: function() {
			this.$('#plot').prev().children('a').fadeOut( function() { $(this).text(this.defPlotText).fadeIn(); } );
			this.$('#boxplotinfo').prev().hide();
			this.$('.sidetab:not(#filter').html('');
		},

		_showSelectInfo: function() {
			this.$('#nodeA').html( this.nodeTemplate( this.model.get('nodeA') ) );
			this.$('#nodeB').html( this.nodeTemplate( this.model.get('nodeB') ) );
			this.$('#link').html( this.nodeTemplate( this.model.get('edge') ) );
		}
	});

	window.SidebarMenuView = Backbone.View.extend({

		render: function() {
			// render using template
		},

		initialize: function(options) {
			_.bindAll(this);

			$.extend( this, options );

			// when selected dataset name is changed, use view as context!
			this.model.bind('change:active', _.bind(this.render, this) );
		},

		select: function(edgeO) {

		}
	});


	/* SEARCH VIEWS */
	window.ClinicalSearchView = Backbone.View.extend({
		el: $('#clinSelect'),
		templateEl: $('#clinicalSearchTmpl'),
		fetchType: 'POST',
		fetchURL: '/graph/neighborhood',

		events: {
			'submit form': "submitSearch"
		},

		render: function() {
			// render using template
			$(this.el).html( this.templateCompiled( { clinicalNodes: this.model.get('active').get('clinicalNodes') } ) );
		},

		submitSearch: function(event)
		{	
			// don't refresh page cause of form submit
			event.preventDefault();

              var neighborhoodQuery = { 
                nodeId:  $("#clinSelect select[name='node'] option:selected").attr('value'),
                nodeType: 'CLIN',
                depth: $('#clinSelect select[id=depth]').val(),
                nodes: $('#clinSelect select[id=nodes]').val(),
                edgeOrdering: $('#clinSelect select[id=edgeOrdering]').val(),
                edgeOrderingAttribute: $('#clinSelect select[id=edgeOrderingAttribute]').val(),
                datalabel: window.App.Models.datasets.get('active').get('name'),
              };

              if( $('#clinSelect select[id="firstEdgeType"]').val() !== 'Any' )
              {
                neighborhoodQuery['firstEdgeType'] = $('#clinSelect > select[id="firstEdgeType"]').val();
              }

              if( $('#clinSelect select[id="secondEdgeType"]').val() !== 'Any' )
              {
                neighborhoodQuery['secondEdgeType'] = $('#clinSelect > select[id="secondEdgeType"]').val();
              }

          window.App.Views.dialog.openLoading();

        $.ajax( {
                type: this.fetchType,
                url: this.fetchURL,
                dataType: "json",
                //async: false,
                data: JSON.stringify( neighborhoodQuery ),
                contentType: "application/json",
                success: function( json )
                {
                	// will fire update & reset event
                	window.App.Utilities.updateElements( json );
                	window.App.Views.dialog.close();
                },
                failure: function( errMsg )
                {
                  console.log( errMsg );
               }
             } );
    	},

		initialize: function(model) {
			this.model = model;

			this.templateCompiled = Handlebars.compile( this.templateEl.html() );

			// when selected dataset name is changed, use view as context!
			this.model.bind('change:active', _.bind(this.render, this) );

			_.bindAll(this, 'submitSearch', 'render');

			this.render();
		},
	});

	window.FreeSearchView = Backbone.View.extend({
		el: $('#freeSearch'),
		fetchExistsType: 'POST',
		fetchExistsURL: '/graph/nodeExists',
		fetchType: 'POST',
		fetchURL: '/graph/neighborhood',

		events: {
			'submit form': "submitSearch"
		},

		render: function() {
			// empty, no changing parts
		},

		submitSearch: function(event)
		{
			// don't refresh page cause of form submit
			event.preventDefault();

	        var query = { 
	        	nodeLabel: $('#freeSearch input#labelSearch').val(),
	        	nodeType: $('#freeSearch select#nodeType').val(), 
	        	datalabel: window.App.Models.datasets.get('active').get('name')
	        };

	        $.ajax( {
	          type: this.fetchExistsType,
	          url: this.fetchExistsURL,
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
            	window.App.Utilities.updateElements( json );
            	window.App.Views.dialog.close();	              

	          },
	          failure: function(errMsg) {
	          	console.log( errMsg );
	          }
	      });

          var neighborhoodQuery = { 
            nodeLabel: $('#freeSearch input[id=labelSearch]').val(), 
            nodeType: $('#freeSearch select[id=nodeType]').val(),
            depth: $('#freeSearch select[id=depth]').val(),
            nodes: $('#freeSearch select[id=nodes]').val(),
            edgeOrdering: $('#freeSearch select[id=edgeOrdering]').val(),
            edgeOrderingAttribute: $('#freeSearch select[id=edgeOrderingAttribute]').val(),
            datalabel: window.App.Models.datasets.get('active').get('name')
          };

          if( $('#freeSearch select[id="firstEdgeType"]').val() !== 'Any' )
          {
            neighborhoodQuery['firstEdgeType'] = $('#freeSearch > select[id="firstEdgeType"]').val();
          }

          if( $('#freeSearch select[id="secondEdgeType"]').val() !== 'Any' )
          {
            neighborhoodQuery['secondEdgeType'] = $('#freeSearch > select[id="secondEdgeType"]').val();
          }

          window.App.Views.dialog.openLoading();

          $.ajax( {
                    type: this.fetchType,
                    url: this.fetchURL,
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
		},

		initialize: function(model) {
			this.model = model;

			_.bindAll(this);

			this.render();
		},

	});

	window.RegulatorySearchView = Backbone.View.extend({

		el: $('#regulatory'),
		templateEl: $('#regulatorySearchTmpl'),
		fetchType: 'POST',
		fetchURL: '/graph/regulatoryPattern',

		events: {
			'submit form': "submitSearch"
		},

		render: function() {
			// render using template
			$(this.el).html( this.templateCompiled( { clinicalNodes: this.model.get('active').get('clinicalNodes') } ) );
		},

		submitSearch: function(event) {
			// don't refresh page cause of form submit
			event.preventDefault();

			window.App.Views.dialog.openLoading();

          var query = { 
            datalabel: this.model.get('active').get('name'),
            clinicalNodeId: $('#regulatory select[name="node"] option:selected').attr('value'),
            middleNodeType: $("#regulatory #middleNodeType option:selected").attr("id"),
            targetType: $('#regulatory select#sourceNodeType option:selected').attr('id'),
            mutatedType: $('#regulatory select#sourceNodeType option:selected').attr('type'),
            distanceThreshold: 100000,
          };

          if( query.targetType === 'METH' )
          {
            query['gexpTargetCorrelationType'] = 'negative';
          }
          else if( query.targetType === 'CNVR' )
          {
            query['gexpTargetCorrelationType'] = 'positive';
          }
          else if( query.targetType === 'MIRN' )
          {
            query['gexpTargetCorrelationType'] = 'negative';
          }

          $.ajax( {
                    type: this.fetchType,
                    url: this.fetchURL,
                    data: JSON.stringify( query ),
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

		},

		initialize: function(model) {
			this.model = model;

			this.templateCompiled = Handlebars.compile( this.templateEl.html() );
			_.bindAll(this);

			// when active dataset changes
			this.model.bind('change:active', _.bind(this.render, this) );

			this.render();
		}

	});


	/* HEADERTABS VIEWS */

	window.HeaderView =  Backbone.View.extend({
		el: $('#headertabs'),

		initialize: function(views) {

			this.views = views;

			// bind to selecting tab and delegate the drawing to corresponding view
			$(this.el).bind('tabsshow', _.bind( function(event,ui) {
				// delegate the action to the correct view

				if( App.Models.nodes.size() === 0 || App.Models.edges.size() === 0 )
				{
					App.Views.dialog.openEmpty();
					return true;
				}
				this.views[ui.panel.id].showTab();
				// console.log(event,ui);
			}, this) );
			
		},

	});

	window.HeaderTabView = Backbone.View.extend({
		rendered: false,

		initialize: function(options) {

			// add all options
			$.extend( this, options );

			_.bindAll(this);
			// notice the order: bind always the latter of the collections to 
			// the event, otherwise nodes/edges will be left undefined
			window.App.Models.edges.bind("add", _.bind(this.render, this) );

			// reset will allow rendering again
			window.App.Models.nodes.bind("reset", function() {
				this.rendered = false;
			}, this);
		},

		render: function() { 
			// render only if shown
			if( $('#headertabs').tabs('option','selected') === this.tabId ) {
				this.showTab();
			}
		},

		showTab: function() {
			// remember to return booleans to jquery.tabs

			// no use calculating the same view
			if( this.rendered ) return true;

			// call to be drawn
			this.tabFunction();
			this.rendered = true;
			return true;
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
		el: $('#dialog'),
		active: false,
        nodeNotFound : { 
        	title: "Invalid node label",
        	message: 'Node label does not exist.'
        },
        loadingDialog : {
        	title: "Loading",
        	message: 'Loading graph data, please wait.<br/><br/><img src="img/waiting-small.gif" style="display: block; margin-left: auto; margin-right: auto;" />'
        },
        empty: {
        	title: 'Empty graph',
        	message: 'The graph does not contain any nodes.'
        },

		initialize: function() {

			// all functions
			_.bindAll(this);
			//_.bindAll(this, 'open', 'openNodeNotFound', 'openLoading', 'openEmpty', 'close');

	      //bind dialog to its div
	      var self = this;
	      $(this.el).dialog({
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
	          	self.close();
	          })
	      },
	      buttons: {
	        "Close": function() {
	        	self.close();
	        // $(this).dialog("close");
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
			var element = $(this.el);
			element.dialog( 'option', 'title', config.title );
			element.html('<p>' + config.message + '</p>');
			element.dialog('open');
			this.active = true;
		},

		close: function() {
			var element = $(this.el);
			element.dialog('close');
			element.html('');
			this.active = false;
		}

	});

	// Start everything
	window.App.view = new AppView;

}); // jquery ready, end