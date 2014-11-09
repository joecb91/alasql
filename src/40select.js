
/*
//
// Select run-time part for Alasql.js
// Date: 03.11.2014
// (c) 2014, Andrey Gershun
//
*/

//
// Main part of SELECT procedure
//

yy.Select = function (params) { return yy.extend(this, params); }
yy.Select.prototype.toString = function() {
	var s = 'SELECT ';
	if(this.top) s += 'TOP '+this.top.value+' ';
	s += this.columns.map(function(col){
		var s = col.toString();
	//	console.log(col);
		if(col.as) s += ' AS '+col.as;
		return s;
	}).join(',');
	s += ' FROM '+this.from.map(function(f){return f.toString()}).join(',');

	if(this.where) s += ' WHERE '+this.where.toString();
	if(this.group) s += ' GROUP BY '+this.group.toString();
	if(this.having) s += ' HAVING '+this.having.toString();
	if(this.order) s += ' ORDER BY '+this.order.toString();
	if(this.union) s += ' UNION '+this.union.toString();
	if(this.unionall) s += ' UNION ALL '+this.unionall.toString();
	if(this.except) s += ' EXCEPT '+this.except.toString();
	if(this.intersect) s += ' INTERSECT '+this.intersect.toString();
	if(this.limit) s += ' LIMIT '+this.limit.value;
	if(this.offset) s += ' OFFSET '+this.offset.value;
	return s;
};

// Compile SELECT statement
yy.Select.prototype.compile = function(db) {
	// Create variable for query
	var query = {};

	query.database = db;
	// 0. Precompile whereexists
	this.compileWhereExists(query);

	// 0. Precompile queries for IN, NOT IN, ANY and ALL operators
	this.compileQueries(query);
	
	// 1. Compile FROM clause
	query.fromfn = this.compileFrom(query);
	// 2. Compile JOIN clauses
	if(this.joins) this.compileJoins(query);
	// 3. Compile SELECT clause
	query.selectfn = this.compileSelect(query);
	// 5. Optimize WHERE and JOINS
	if(this.where) this.compileWhereJoins(query);

	// 4. Compile WHERE clause
	query.wherefn = this.compileWhere(query);


	// 6. Compile GROUP BY
	if(this.group) query.groupfn = this.compileGroup(query);
	// 7. Compile DISTINCT, LIMIT and OFFSET
	query.distinct = this.distinct;

	if(this.top) {
		query.limit = this.top.value;
	} else if(this.limit) {
		query.limit = this.limit.value;
		if(this.offset) {
			query.offset = this.offset.value;
		}
	}
	// 8. Compile ORDER BY clause
	if(this.order) query.orderfn = this.compileOrder(query);

	// 9. Compile ordering function for UNION and UNIONALL
	if(this.union) {
		query.unionfn = this.union.compile(db);
		if(this.union.order) {
			query.orderfn = this.union.compileOrder(query);
		} else {
			query.orderfn = null;
		}
	} else if(this.unionall) {
		query.unionallfn = this.unionall.compile(db);
		if(this.unionall.order) {
			query.orderfn = this.unionall.compileOrder(query);
		} else {
			query.orderfn = null;
		}
	} else if(this.except) {
		query.exceptfn = this.except.compile(db);
		if(this.except.order) {
			query.orderfn = this.except.compileOrder(query);
		} else {
			query.orderfn = null;
		}
	} else if(this.intersect) {
		query.intersectfn = this.intersect.compile(db);
		if(this.intersect.order) {
			query.intersectfn = this.intersect.compileOrder(query);
		} else {
			query.orderfn = null;
		}
	};

//console.log(query);

	// Now, compile all togeather into one function with query object in scope
	return function(params, cb, oldscope) {
		query.params = params;
		var res = queryfn(query,oldscope); 
		if(cb) cb(res); 
		return res;
	}
};



