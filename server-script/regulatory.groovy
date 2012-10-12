// @targetType: METH || CNVR
def regulatoryMETHCNVR(clinicalNodeId, distanceThreshold, middleNodeType, targetType, noEdges, correlationComparison) {
	/*clinicalNodeId = 172508;
	distanceThreshold = 100000;
	correlationComparison = 'negative';
	middleNodeType = 'GEXP';
	targetType = 'METH';
	noEdges = 100; */
	
	middle = null;

	return g.v(clinicalNodeId).outE.filter{
		middle = it.inV.next();
		return ( middle.getProperty('source') == middleNodeType ) && (middle.getProperty('chr') != null);
	}.inV.outE.filter{
		target = it.inV.next();
		rel2 = it;
		correlationResult = ( correlationComparison == 'positive' ) ? 
		( (rel2.getProperty('correlation') != null) && (rel2.getProperty('correlation') > 0) ) : 
		( (rel2.getProperty('correlation') != null) && (rel2.getProperty('correlation') < 0) );

		return (middle.getProperty('chr') == target.getProperty('chr')) && 
		( target.getProperty('source') == targetType ) && 
		(rel2.getProperty('distance') != null)  && (rel2.getProperty('distance') < distanceThreshold) && correlationResult;
	}
	.paths.next(noEdges)._().transform{ it.findAll{ it instanceof Edge} }
	.toList().flatten().unique().sort{ a,b -> b.getProperty('pvalue') <=> a.getProperty('pvalue') };
}


// @targetType: MIRN
def regulatoryMIRN(clinicalNodeId, middleNodeType, targetType, noEdges) {
	/*middleNodeType = 'GEXP';
	clinicalNodeId = 174696;
	targetType = 'MIRN';
	correlationComparison = 'negative';
	noEdges = 100; */

	return g.v(clinicalNodeId).outE.filter{ it.inV.next().getProperty('source') == middleNodeType }
	.inV.outE.filter{ 
		( it.inV.next().getProperty('source') == targetType ) && (it.getProperty('correlation') < 0) 
	}
	.paths.next(noEdges)._().transform{ it.findAll{ it instanceof Edge} }
	.toList().flatten().unique().sort{ a,b -> b.getProperty('pvalue') <=> a.getProperty('pvalue') };
}


// @targetType: GNAB
def regulatoryGNABAberrated(clinicalNodeId, distanceThreshold, middleNodeType, targetType, noEdges) {
	/*distanceThreshold = 100000;
	middleNodeType = 'GEXP';
	clinicalNodeId = 196114;
	targetType = 'GNAB';
	noEdges = 100; */

	middle = null;

	return g.v(clinicalNodeId).outE.filter{
		middle = it.inV.next();
		return middle.getProperty('source') == middleNodeType;
	}.inV.outE.filter{
		rel2 = it;
		target = it.inV.next();

		functionally = ( middle.getProperty('label') == target.getProperty('label') ) && ( target.getProperty('label') != null ) && ( middle.getProperty('chr') == target.getProperty('chr') ) && ( target.getProperty('source') == targetType );
		cnvr = ( middle.getProperty('chr') == target.getProperty('chr') ) && ( target.getProperty('source') == 'CNVR' ) && (rel2.getProperty('distance') != null) && (rel2.getProperty('distance') < distanceThreshold) && (rel2.getProperty('correlation') != null) && (rel2.getProperty('correlation') > 0);
		meth = ( middle.getProperty('chr') == target.getProperty('chr') ) && ( target.getProperty('source') == 'METH' ) && (rel2.getProperty('distance') != null) && (rel2.getProperty('distance') < distanceThreshold) && (rel2.getProperty('correlation') != null) && (rel2.getProperty('correlation') < 0);
		mirn = ( target.getProperty('source') == 'MIRN' ) && ( rel2.getProperty('correlation') != null ) && ( rel2.getProperty('correlation') < 0 );
		return functionally || cnvr || meth || mirn;
	}.paths.next(noEdges)._().transform{ it.findAll{ it instanceof Edge} }
	.toList().flatten().unique().sort{ a,b -> b.getProperty('pvalue') <=> a.getProperty('pvalue') };
}


// @targetType: GNAB
def regulatoryGNABFunctionally(clinicalNodeId, distanceThreshold, middleNodeType, targetType, noEdges) {
	/*distanceThreshold = 100000;
	middleNodeType = 'GEXP';
	clinicalNodeId = 126670;
	targetType = 'GNAB'; */
	
	middle = null;

	return g.v(clinicalNodeId).outE.filter{
		middle = it.inV.next();
		return middle.getProperty('source') == middleNodeType;
	}.inV.outE.filter{
		target = it.inV.next();
		return ( middle.getProperty('label') == target.getProperty('label') ) && 
		( middle.getProperty('chr') == target.getProperty('chr') ) &&
		( target.getProperty('source') == targetType );
	}.paths.next(noEdges)._().transform{ it.findAll{ it instanceof Edge} }
	.toList().flatten().unique().sort{ a,b -> b.getProperty('pvalue') <=> a.getProperty('pvalue') };
}