# -*- coding: utf-8 -*-
#!/usr/bin/python

import os
import sys
import random

#from bulbs.neo4jserver import Graph, Config, NEO4j_URI
#from py2neo import neo4j, rest, gremlin, cypher
#from neo4jrestclient.client import GraphDatabase
#from neo4jrestclient import constants

import simplejson as json

import bottle
from bottle import Bottle, run, route, request, abort, get, post, hook, response

from bulbs.neo4jserver import Graph, Neo4jClient, FulltextIndex, ExactIndex
from bulbs.base.index import *
from bulbs.element import *

# use this to parse labels for special characters:
from lucenequerybuilder import Q

@hook('after_request')
def enable_cors():
	response.headers['Access-Control-Allow-Origin'] = '*'
	response.headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS'
	response.headers['Access-Control-Max-Age'] = '1000'
	response.headers['Access-Control-Allow-Headers'] = '*'    
	return response

# allow CORS if needed
@route('/neighborhood', method='OPTIONS')
def options():
	response.headers['Access-Control-Allow-Origin'] = '*'
	response.headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS'
	response.headers['Access-Control-Max-Age'] = '1000'
	response.headers['Access-Control-Allow-Headers'] = '*'
	response.headers['Content-Type'] = 'application/json'
	return response

def validOrderingType( orderType ):
	if orderType not in ['DESC', 'ASC']:
		abort(400, "Invalid ordering type: should be [DESC|ASC].")	

#flatten a list
def flattened(l):
	result = _flatten(l, lambda x: x)
	while type(result) == list and len(result) and callable(result[0]):
		if result[1] != []:
			yield result[1]
		result = result[0]([])
	yield result

def _flatten(l, fn, val=[]):
	if type(l) != list:
		return fn(l)
	if len(l) == 0:
		return fn(val)
	return [lambda x: _flatten(l[0], lambda y: _flatten(l[1:],fn,y), x), val]

'''def flatten(x):
	if not isinstance(x,list):
		return x
	elif len(x) is 0:
		return []
	elif isinstance(x[0],list):
		return flatten(x[0]) + flatten(x[1:])
	else:
		return [x[0]] + flatten(x[1:])'''

#uniquefy list
def unique(listSeq):
	# not order preserving
	set = {}
	map(set.__setitem__, listSeq, [])
	return set.keys()

class GraphServer(object):
	def __init__(self):
		self.g = self._getGraph()
		self.client = self._getClient()
		self.metaNode = self.g.factory.get_index(Vertex, ExactIndex, 'meta').query('meta', 'meta').next()  #self.g.vertices.get(0)
		self.indices = dict()
		self.patientBarcodes = dict()
		self.nodeTypes = ['CLIN', 'GEXP', 'CNVR', 'METH', 'GNAB', 'SAMP', 'MIRN', 'RPPA']
		self.edgeTypes = ['DISTANCE', 'ASSOCIATION']

		self._initIndices()
		self._initPatientBarcodes()

		print "Start by warming cache..."
		# load elements into memory to speed up queries, this might take a while
		self.g.warm_cache()
		print "...done"

	def _validNodeType(self, nodeType):
		if nodeType not in self.nodeTypes:
			abort(400, "Invalid nodeType.")

	def _initIndices(self):
		for edge in self.metaNode.outE(label='DATASET'):
			label = edge.data().get('label')
			self.indices[ label ] = dict()
			for node_type in self.nodeTypes:
				self.indices[label][node_type] = self.g.factory.get_index( Vertex, FulltextIndex, label + "_i_n_" + node_type )

			edgeProxy = self.g.factory.build_index_proxy( Edge, FulltextIndex )
			for edge_type in self.edgeTypes:
				if edgeProxy.get( label + "_i_e" + edge_type ):
					self.indices[label][edge_type] = self.g.factory.get_index( Edge, FulltextIndex, label + "_i_e_" + edge_type )

	def _initPatientBarcodes(self):
		for datasetNode in self.metaNode.outV(label='DATASET'):
			label = datasetNode.get('datalabel')
			self.patientBarcodes[label] = datasetNode.get('barcode')

	def _getGraph(self):
		g = Graph()
		return g

	def _getClient(self):
		return Neo4jClient()

	def _getJSONPost(self):
		try:
			return json.load(request.body)#, parse_int=True)
		except ValueError:
			abort(400, 'Bad request: Could not decode request body. Post JSON.')

	#@get('/getDatasets')
	def getDatasets(self):
		return json.dumps( { 'datalabels': self.indices.keys() } )

	#@post('/getSampleData')
	def getSampleData(self):
		g = self._getGraph()
		data = self._getJSONPost()
		try:
			label = data['datalabel']
		except KeyError:
			abort(400, "Invalid parameters. datalabel: datalabelName")

		if not self.indices.get(label):
			abort(400, "Invalid datasetlabel name.")
		index = self.indices.get(label)['CLIN']

		samples = []
		#if index.index_name == 'cbm_pc_quantrev_0706_i_n_CLIN':
		if label == 'cbm_pc_quantrev_0706':
			vertex = index.query('label:SampleClass').next()
			samples = vertex.get('patient_values').split(":")

		elif label == 'crc_noroi_1807':
			vertex = index.query('label:disease_code').next()
			samples = vertex.get('patient_values').split(":")

		return json.dumps({ 'samples': samples })

	#@post('/nodeExists')
	def nodeExists(self):
		data = self._getJSONPost()
		try:
			nodeLabel = str( Q( data['nodeLabel'] ) )
			nodeType = data['nodeType']
			label = data['datalabel']
		except KeyError:
			abort(400, "Invalid parameters. nodeLabel: something, nodeType:[GEXP|CNVR|METH|CLIN]")

		if( nodeLabel == '' ):
			return json.dumps( { 'nodeExists': False } )

		c = self._getClient()
		g = self._getGraph()

		index = self.indices[ label ][ nodeType.upper() ]
		if not index:
			abort(400, "Index type for %s does not exist" %nodeType )
		#assert( index.one().index_class() is 'vertex' )

		resultNodes = list( index.query('label:%s' %nodeLabel) )

		if len( resultNodes ) == 1:
			return json.dumps( {'nodeExists': True, 'nodes': []} )
		elif len( resultNodes ) > 1:
			return json.dumps( { 'nodeExists': True, 
				'nodes': [ {
				'id': node._id, 
				'source': node.get('source'),
				'label': node.get('label'),
				'chr': node.get('chr'), 
				'start': node.get('start'),
				'end': node.get('end'),
				'type': node.get('type')
				 } for node in resultNodes ] } )
		else:
			return json.dumps( { 'nodeExists': False } )


	def _getElementIdStrings(self,elementList):
		ids = []
		for rel in elementList: ids.append( rel._id )
		return ", ".join(["%s" % el for el in ids])

	# @post('getPatientSamples')
	def getPatientSamples(self):
		g = self._getGraph()
		data = self._getJSONPost()
		try:
			sourceNodeId = int( data['source'] )
			targetNodeId = int( data['target'] )
		except KeyError:
			abort(400, "Invalid arguments specified.")

		sourceNode = g.vertices.get(sourceNodeId)
		targetNode = g.vertices.get(targetNodeId)
		if not sourceNode or not targetNode:
			abort(400, "Source or targetnode does not exist.")

		return json.dumps( { 
			'sourcePatientValues': sourceNode.get('patient_values'), 
			'targetPatientValues': targetNode.get('patient_values') } )



	#@post('/getPatientBarcodes')
	def getPatientBarcodes(self):
		g = self._getGraph()
		data = self._getJSONPost()
		try:
			label = data['datalabel']
		except KeyError:
			abort(400, "No datalabel specified.")

		return json.dumps( { 'barcodes': self.patientBarcodes[label] } )

	#@post('/getCLINNodes')
	def getCLINNodes(self):
		c = self._getClient()
		g = self._getGraph()
		data = self._getJSONPost()
		try:
			label = data['datalabel']
		except KeyError:
			abort(400, "No datalabel specified.")

		index = self.indices[label]['CLIN']
		if not index:
			abort(400, "Index type for CLIN does not exist")

		nodeList = []
		for node in index.query('label:*'):
			nodeList.append( { 'id': node._id, 'label': node.get('label') } )
		return json.dumps( { 'nodes': nodeList } )

	#@post('/neighborhood')
	def traverseNodeNeighborhood(self):
		data = self._getJSONPost()
		try:
			datalabel = data['datalabel']
			nodeId = None
			nodeLabel = None
			if not data.get('nodeLabel') and data.get('nodeId'):
				nodeId = int( data['nodeId'] )
			elif data.get('nodeLabel'):
				# escape possible special characters
				nodeLabel = str( Q( data['nodeLabel'] ) )
			else:
				abort(400, "Submit either nodeLabel or nodeId")

			nodeType = data['nodeType']
			depth = int( data['depth'] )
			nodes = int( data['nodes'] )
			edgeOrdering = data['edgeOrdering']
			edgeOrderingAttribute = str( data['edgeOrderingAttribute']).lower()
		except KeyError, ValueError:
			abort(400, "Invalid JSON parameters received. For example: nodeLabel='tmprss2_erg'," \
				+ "nodeType='CLIN', depth=3, nodes=5, edgeType='ASSOCIATION', edgeOrdering='DESC', edgeOrderingAttribute='pvalue'")

		edgeType = 'ASSOCIATION'

		# optional parameters:
		firstEdgeType = None
		secondEdgeType = None
		try:
			firstEdgeType = data['firstEdgeType']
			secondEdgeType = data['secondEdgeType']
		except KeyError:
			pass

		#if edgeType not in ['ASSOCIATION']: #, 'DISTANCE']:
		#	abort(400, "Invalid edgeType.")

		self._validNodeType( nodeType )
		validOrderingType( edgeOrdering )

		if edgeOrderingAttribute not in ['pvalue', 'correlation', 'importance', 'distance']:
			abort(400, "Invalid edgeOrderingAttribute")


		g = self._getGraph()
		c = self._getClient()

		index = self.indices[datalabel][nodeType.upper()]
		if not index:
			abort(400, "Index type for %s does not exist" %nodeType )

		if nodeId:
			startNode = g.vertices.get( nodeId )
		else:
			startNode = index.query('label:%s' %nodeLabel).next() #index.get_unique('label', nodeLabel)
		if not startNode:
			abort(400, "nodeLabel does not exist" )

		currentVertices = [ startNode ]
		resultEdges = []

		querystr = ""


		# do not fetch the same edges twice!
		excludedEdgeIds = dict()

		for d in range(0,depth):
			currentEdges = []

			for node in currentVertices:
				if( firstEdgeType and d is 0 ):
					querystr = "START a=node(%s)" %(node._id)
					querystr += " MATCH a-[rel:%s]->b WHERE b.source = '%s'" %(edgeType, firstEdgeType)
					querystr += " RETURN rel ORDER BY rel.%s! %s LIMIT %i" %(edgeOrderingAttribute, edgeOrdering, nodes)
					#edges = list( g.cypher.query( "START a=node(%s) MATCH a-[rel:%s]->b WHERE b.source = %s RETURN rel ORDER BY \
					#	rel.%s! %s LIMIT %i" %( node._id, edgeType, "'" + firstEdgeType + "'", edgeOrderingAttribute, edgeOrdering, nodes ) ) )

				elif( secondEdgeType and d is 1 ):
					querystr = "START a=node(%s)" %(node._id)
					querystr += " MATCH a-[rel:%s]->b WHERE b.source = '%s'" %(edgeType, secondEdgeType)
					querystr += " RETURN rel ORDER BY rel.%s! %s LIMIT %i" %(edgeOrderingAttribute,edgeOrdering,nodes)
					#edges = list( g.cypher.query( "START a=node(%s) MATCH a-[rel:%s]->b WHERE b.source = %s RETURN rel ORDER BY \
					#	rel.%s! %s LIMIT %i" %( node._id, edgeType, "'" + secondEdgeType + "'", edgeOrderingAttribute, edgeOrdering, nodes ) ) )

				# free search without depth edge type filtering:
				else:
					querystr = "START a=node(%s)" %(node._id)
					querystr += " MATCH a-[rel:%s]->()" %(edgeType)
					querystr += " RETURN rel ORDER BY rel.%s! %s LIMIT %i" %(edgeOrderingAttribute, edgeOrdering, nodes)
					#edges = list( g.cypher.query( "START a=node(%s) MATCH a-[rel:%s]->() RETURN rel ORDER BY \
					#	rel.%s! %s LIMIT %i" %( node._id, edgeType, edgeOrderingAttribute, edgeOrdering, nodes ) ) )
				edges = list(g.cypher.query(querystr))
				currentEdges.extend( edges )

			resultEdges.extend( currentEdges )
			currentVertices = []
			if currentEdges:
				querystr = "START rel=relationship(%s)" %( self._getElementIdStrings( currentEdges ) )
				querystr += " MATCH ()-[rel]->b"
				querystr += " RETURN DISTINCT b"
				currentVertices = list( g.cypher.query(querystr) )
				#currentVertices = list( g.cypher.query("START rel=relationship(%s) MATCH ()-[rel]->b RETURN DISTINCT b" %( self._getElementIdStrings( currentEdges ) ) ) )

		# post-processing to get the right json output:
		nodes_dict = dict()
		nodelist = []
		edgelist = []
		for edge in resultEdges:
			edgedict = { 'id': 'e' + str(edge._id), 'edgeType': edgeType.upper(), 'source': 'n' + str(edge._outV), \
				'target': 'n' + str(edge._inV), 'pvalue': edge.get('pvalue'), 'importance': edge.get('importance'), 'correlation': edge.get('correlation')  }
			distance = edge.get('distance')
			if distance:
				edgedict['distance'] = distance
			edgelist.append( edgedict )

			# in case duplicates exist:
			nodes_dict[ edge._outV ] = edge.outV()
			nodes_dict[ edge._inV ] = edge.inV()

		for key in nodes_dict.keys():
			node = nodes_dict[key]
			nodelist.append( \
				{'id': 'n' + str(node._id), 'source': node.get('source'), 'label': node.get('label'), 'chr': node.get('chr'), \
				'patientvals': node.get('patient_values'), 'start': node.get('start'), 'end': node.get('end'), 'gene_interesting_score': node.get('gene_interesting_score'), 
				'type': node.get('type') } )

		return json.dumps( { 'nodes': nodelist, 'links': edgelist, 'referenceNode': startNode._id } )

	# @post('/regulatoryPattern')
	def regulatoryPattern(self):
		data = self._getJSONPost()
		gexpTargetCorrelationType = None
		try:
			datalabel = data['datalabel']
			clinicalNodeId = int( data['clinicalNodeId'] )
			middleNodeType = data['middleNodeType']
			# METH, CNVR, MIRN, GNAB
			targetNodeType = data['targetType']
			distanceThreshold = int( data['distanceThreshold'] )
			if not targetNodeType == 'GNAB':
				gexpTargetCorrelationType = data['gexpTargetCorrelationType']
		except LookupError:
			abort(400, "Invalid JSON parameters received.")

		if middleNodeType not in ['RPPA','GEXP']:
			abort(400, "Invalid middleNodeType")

		if targetNodeType == 'GNAB':
			mutatedType = data.get('mutatedType')
			if mutatedType not in ['aberrated','functionallyMutated']:
				abort(400, "Invalid mutatedType")

		if gexpTargetCorrelationType and gexpTargetCorrelationType not in ['positive', 'negative']:
			abort(400, "Invalid gexpTargetCorrelationType.")

		g = self._getGraph()

		if( distanceThreshold < 0 ):
			abort(400, "Invalid distanceThreshold.")

		try:
			index = self.indices.get(datalabel).get('CLIN')
		except AttributeError, KeyError:
			abort(400, 'Invalid datalabel or index for CLIN does not exist.')

		startNode = g.vertices.get( clinicalNodeId )
		if not startNode:
			abort(400, "Invalid CLINical node")

		resultEdges = []

		# constants for this type of query
		edgeType = 'ASSOCIATION'
		firstSourceType = 'GEXP'
		firstOrderAttribute  = 'pvalue'
		firstEdgeOrdering = 'DESC'
		noNodes = 80
		correlationComparison = ''

		edges = list()

		if( gexpTargetCorrelationType):
			if( gexpTargetCorrelationType == 'positive' ):
				correlationComparison = '>'
			else:
				correlationComparison = '<'

		targetEdgeOrderAttr1 = 'pvalue'
		targetEdgeOrdering1 = 'DESC'

		querystr = ""

		if( targetNodeType == 'METH' or targetNodeType == 'CNVR' ):
			# output should be [search name, [ids, nested]]
			querystr = "START clin=node(%s)" %(startNode._id)
			querystr += " MATCH path = clin-[rel1]->middle-[rel2]->target"
			querystr += " WHERE (middle.source! = '%s') AND (middle.chr! = target.chr!)" %(middleNodeType)
			querystr += " AND (target.source! = '%s') AND (rel2.distance! < %i) AND (rel2.correlation! %s 0)" %(targetNodeType, distanceThreshold, correlationComparison)
			querystr += " RETURN EXTRACT( r in relationships(path) : ID(r) ) ORDER BY rel2.%s %s LIMIT %i" %(targetEdgeOrderAttr1, targetEdgeOrdering1, noNodes)

			# tableData = g.cypher.table( "START clin=node(%s) MATCH path = clin-[rel1]->middle-[rel2]->target WHERE (middle.source! = '%s') \
			# 	AND (target.source! = '%s') AND (middle.chr! = target.chr!) AND (rel2.distance! < %i) AND (rel2.correlation! %s 0) \
			# 	RETURN EXTRACT( r in relationships(path) : ID(r) ) ORDER BY rel2.%s %s LIMIT %i" \
			# 	% ( startNode._id, middleNodeType, targetNodeType, distanceThreshold, \
			# 		correlationComparison, targetEdgeOrderAttr1, targetEdgeOrdering1, noNodes ) )
			# if tableData[1]:
			# 	edges = unique( flattened( tableData[1] ) )

		elif( targetNodeType == 'MIRN' ):
			querystr = "START clin=node(%s)" %(startNode._id)
			querystr += " MATCH path = clin-[rel1]->middle-[rel2]->target"
			querystr += " WHERE (middle.source! = '%s') AND (target.source! = '%s') AND (rel2.correlation! %s 0)" %(middleNodeType, targetNodeType, correlationComparison)
			querystr += " RETURN EXTRACT( r in relationships(path) : ID(r) ) ORDER BY rel2.%s %s LIMIT %i" %(targetEdgeOrderAttr1, targetEdgeOrdering1, noNodes)

			# tableData = g.cypher.table("START clin=node(%s) MATCH path = clin-[rel1]->middle-[rel2]->target WHERE \
			# 	(middle.source! = '%s') \
			# 	AND (target.source! = '%s') AND (rel2.correlation! %s 0) \
			# 	RETURN EXTRACT( r in relationships(path) : ID(r) ) ORDER BY rel2.%s %s LIMIT %i" \
			# 	% ( startNode._id, middleNodeType, targetNodeType, correlationComparison, \
			# 		targetEdgeOrderAttr1, targetEdgeOrdering1, noNodes ) )
			# if tableData[1]:
			# 	edges = unique( flattened( tableData[1] ) )

		elif( targetNodeType == 'GNAB' ):
			if mutatedType == 'functionallyMutated':
				querystr += "START clin=node(%s)" %(startNode._id)
				querystr += " MATCH path = clin-[rel1]->middle-[rel2]->target"
				querystr += " WHERE (middle.source! = '%s') AND (middle.label! = target.label!) AND (middle.chr! = target.chr!) AND (target.source! = '%s')" %(middleNodeType, targetNodeType)
				querystr += " RETURN EXTRACT( r in relationships(path) : ID(r) ) ORDER BY rel2.%s %s LIMIT %i" %(targetEdgeOrderAttr1, targetEdgeOrdering1, noNodes)
				# tableData = g.cypher.table("START clin=node(%s) MATCH path = clin-[rel1]->middle-[rel2]->target WHERE \
				# 	(middle.source! = '%s') AND \
				# 	(middle.label! = target.label!) AND (middle.chr! = target.chr!) AND (target.source! = '%s') \
				# 	RETURN EXTRACT( r in relationships(path) : ID(r) ) ORDER BY rel2.%s %s LIMIT %i" \
				# 	% ( startNode._id, middleNodeType, targetNodeType, targetEdgeOrderAttr1, targetEdgeOrdering1, noNodes ) )
				# if tableData[1]:
				# 	edges = unique( flattened( tableData[1] ) )

			elif( mutatedType == 'aberrated' ):
				querystr = "START clin=node(%s) MATCH path = clin-[rel1]->middle-[rel2]->target WHERE (middle.source! = '%s') AND " %(startNode._id, middleNodeType)
				querystr += "("
				querystr += "( (middle.label! = target.label!) AND (middle.chr! = target.chr!) AND (target.source! = '%s') ) OR " % (targetNodeType)
				querystr += "( (middle.chr! = target.chr!) AND (target.source! = 'CNVR') AND ( rel2.distance! < %i ) AND ( rel2.correlation! > 0 ) ) OR " %(distanceThreshold)
				querystr += "( (middle.chr! = target.chr!) AND (target.source! = 'METH') AND ( rel2.distance! < %i ) AND ( rel2.correlation! < 0 ) ) OR " %(distanceThreshold)
				querystr += "( (target.source! = 'MIRN') AND ( rel2.correlation! < 0 ) )"
				querystr += ")"
				querystr += "RETURN EXTRACT( r in relationships(path) : ID(r) ) ORDER BY rel2.%s %s LIMIT %i" %(targetEdgeOrderAttr1, targetEdgeOrdering1, noNodes)
		tableData = g.cypher.table( querystr )
		if tableData[1]:
			edges = unique( flattened( tableData[1] ) )

		for eID in edges:
			resultEdges.append( g.edges.get(eID) )

		# post-processing to get the right json output:
		nodes_dict = dict()
		nodelist = []
		edgelist = []
		for edge in resultEdges:
			edgedict = { 'id': 'e' + str(edge._id), 'edgeType': edgeType.upper(), 'source': 'n' + str(edge._outV), \
				'target': 'n' + str(edge._inV), 'pvalue': edge.get('pvalue'), 'importance': edge.get('importance'), 'correlation': edge.get('correlation')  }
			distance = edge.get('distance')
			if distance:
				edgedict['distance'] = distance
			edgelist.append( edgedict )

			# in case duplicates exist:
			nodes_dict[ edge._outV ] = edge.outV()
			nodes_dict[ edge._inV ] = edge.inV()

		for key in nodes_dict.keys():
			node = nodes_dict[key]
			nodelist.append( \
				{'id': 'n' + str(node._id), 'source': node.get('source'), 'label': node.get('label'), 'chr': node.get('chr'), \
				'patientvals': node.get('patient_values'), 'start': node.get('start'), 'end': node.get('end'), 'gene_interesting_score': node.get('gene_interesting_score'), 
				'type': node.get('type') } )

		return json.dumps( { 'nodes': nodelist, 'links': edgelist, 'referenceNode': startNode._id } )

if __name__ == "__main__":

	gserver = GraphServer()

	bottle.route("/getDatasets", method='GET')(gserver.getDatasets)
	bottle.route("/nodeExists", method='POST')(gserver.nodeExists)
	bottle.route("/getPatientBarcodes", method='POST')(gserver.getPatientBarcodes)
	bottle.route("/getCLINNodes", method='POST')(gserver.getCLINNodes)
	bottle.route("/neighborhood", method='POST')(gserver.traverseNodeNeighborhood)
	bottle.route("/getSampleData", method='POST')(gserver.getSampleData)
	bottle.route("/getPatientSamples", method='POST')(gserver.getPatientSamples)
	bottle.route("/regulatoryPattern", method='POST')(gserver.regulatoryPattern)

	# start bottlepy. use paste to enable threading
	run(host='localhost', port=7575, server='paste')