// @targetType: METH || CNVR
def regulatoryMETHCNVR(clinicalNodeId, distanceThreshold, middleNodeType, targetType, noEdges, correlationComparison) {
	/*clinicalNodeId = 128165;
	distanceThreshold = 100000;
	correlationComparison = 'smaller';
	middleNodeType = 'GEXP';
	targetType = 'METH';
	noEdges = 100;
	middle = null;
	rel2 = null; */

	middle = null;
	rel2 = null;
	return g.v(clinicalNodeId).outE.filter{
		middle = it.inV.next();
		return (middle.getProperty('source') != null) && (middle.getProperty('source') == middleNodeType) && (middle.getProperty('chr') != null);
	}.inV.as('middle').outE.filter{
		rel2 = it;
		target = it.inV.next();
		intermediate = (target.getProperty('chr') != null && middle.getProperty('chr') == target.getProperty('chr')) && 
		(target.getProperty('source') == targetType) && (rel2.getProperty('distance') != null && rel2.getProperty('distance') < distanceThreshold);

		correlationResult = (correlationComparison == 'positive') ? (rel2.getProperty('correlation') > 0) : (rel2.getProperty('correlation') < 0);
		return intermediate && correlationResult;
	}.paths.transform{ it.findAll{ it instanceof Edge } }.toList().flatten().unique().sort{ a,b -> b.getProperty('pvalue') <=> a.getProperty('pvalue') }._().next(noEdges);
}

// @targetType: MIRN
def regulatoryMIRN(clinicalNodeId, middleNodeType, targetType, noEdges, correlationComparison) {
	/* middleNodeType = 'GEXP';
	clinicalNodeId = 137059;
	targetType = 'MIRN';
	correlationComparison = 'smaller'; */
	middle = null;
	rel2 = null;
	target = null;

	return g.v(clinicalNodeId).outE.filter{
		middle = it.inV.next();
		return (middle.getProperty('source') != null) && (middle.getProperty('source') == middleNodeType);
	}.inV.as('middle').outE.filter{
		rel2 = it;
		target = it.inV.next();
		correlationResult = ( correlationComparison == 'positive' ) ? ( target.getProperty('correlation') > 0 ) : ( target.getProperty('correlation') < 0 );
		intermediate = (target.getProperty('source') != null) && (target.getProperty('source') == targetType) && (rel2.getProperty('correlation') != null);
		return intermediate && correlationResult;
	}.paths.transform{ it.findAll{ it instanceof Edge} }.toList().flatten().unique().sort{ a,b -> b.getProperty('pvalue') <=> a.getProperty('pvalue') }._().next(noEdges);
}

// @targetType: GNAB
def regulatoryGNABAberrated(clinicalNodeId, distanceThreshold, middleNodeType, targetType, noEdges) {
	/*distanceThreshold = 100000;
	middleNodeType = 'GEXP';
	clinicalNodeId = 137059;
	mutatedType = 'aberrated';
	targetType = 'GNAB';
	noEdges = 100; */

	middle = null;
	rel2 = null;
	return g.v(clinicalNodeId).outE.filter{ it.inV.next().getProperty('source') == middleNodeType }
	.inV.as('middle').sideEffect{middle = it}.outE.sideEffect{rel2 = it}.inV.filter{
		target = it;
		return ( ( (target.getProperty('label') != null) && (middle.getProperty('label') != null && target.getProperty('label') == middle.getProperty('label') )  && 
				( target.getProperty('chr') == middle.getProperty('chr') ) && ( middle.getProperty('source') == targetType ) ) ||
			( ( target.getProperty('chr') == middle.getProperty('chr') ) && ( target.getProperty('source') == 'CNVR' ) 
				&& ( rel2.getProperty('distance') < distanceThreshold ) && ( rel2.getProperty('correlation') > 0 ) ) ||
			( ( target.getProperty('chr') == middle.getProperty('chr') ) && ( target.getProperty('source') == 'METH' ) && 
				( rel2.getProperty('distance') < distanceThreshold ) && ( rel2.getProperty('correlation') < 0 ) ) ||
			( (target.getProperty('source') == 'MIRN') && (rel2.getProperty('correlation') < 0) )
		);
	}.paths.transform{ it.findAll{ it instanceof Edge} }.toList().flatten().unique().sort{ a,b -> b.getProperty('pvalue') <=> a.getProperty('pvalue') }._().next(noEdges);
}

// @targetType: GNAB
def regulatoryGNABFunctionally(clinicalNodeId, distanceThreshold, middleNodeType, targetType, noEdges) {
	/*distanceThreshold = 100000;
	middleNodeType = 'GEXP';
	clinicalNodeId = 137059;
	targetType = 'GNAB'; */
	middle = null;
	target = null;
	return g.v(clinicalNodeId).outE.filter{
		middle = it.inV.next();
		return ( middle.getProperty('source') == middleNodeType ) && ( middle.getProperty('label') != null );
	}.inV.as('middle').sideEffect{ middle = it }.outE.sideEffect{ rel2 = it }.inV.filter{
		target = it;
		return ( middle.getProperty('label') == target.getProperty('label') ) && 
		( middle.getProperty('chr') == target.getProperty('chr') ) && 
		( target.getProperty('source') == targetType );
	}.paths.transform{ it.findAll{ it instanceof Edge} }.toList().flatten().unique().sort{ a,b -> b.getProperty('pvalue') <=> a.getProperty('pvalue') }._().next(noEdges);
}