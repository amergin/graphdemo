def neighborhood(startNodeId, depth, nodeLimit, edgeOrderingAttribute, edgeOrdering, firstNodeType, secondNodeType) {
	/*depth = 4;
	edgeOrderingAttribute = 'distance';
	startNodeId = 12345;
	edgeOrdering = 'ASC';
	nodeLimit = 10;
	firstNodeType = 'GEXP';
	secondNodeType = 'METH';*/

	nodeTypes = [0: firstNodeType, 1: secondNodeType];
	currentVertices = [g.v(startNodeId)];
	currentEdges = [];
	resultEdges = [];
	previousNodes = [:];
	rawEdges = [];
	for( d in 0..depth-1 )
	{
		currentEdges = [];
		for( vertex in currentVertices )
		{
			rawVertices = vertex.outE.filter{
				if( nodeTypes.get(d) )
				{
					return (it.getProperty( edgeOrderingAttribute ) != null) && (it.inV.next().getProperty('source') == nodeTypes.get(d));
				};
				return (it.getProperty( edgeOrderingAttribute ) != null);
			}
			.filter{ previousNodes.get( it.outV.next().id ) != it.inV.next() }
			.sideEffect{ previousNodes[ it.inV.next().id ] = it.outV.next() }.toList();
			if( edgeOrdering == 'DESC' )
			{
				rawEdges = rawVertices.sort{a,b -> a.getProperty(edgeOrderingAttribute) <=> b.getProperty(edgeOrderingAttribute) };
			}
			else
			{
				rawEdges = rawVertices.sort{a,b -> a.getProperty(edgeOrderingAttribute) <=> b.getProperty(edgeOrderingAttribute) };
			};
			currentEdges += rawEdges._().next(nodeLimit);
			resultEdges += rawEdges._().next(nodeLimit);
		};
		currentVertices = currentEdges._().inV;
	};
	return resultEdges;
}