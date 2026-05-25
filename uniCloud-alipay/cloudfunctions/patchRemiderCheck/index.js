"use strict";

const db = uniCloud.database();

exports.main = async (event, context) => {
	const res = await db
	    .collection("medication_plan")
			.where({
				status: "sdfasdf"
			})
			.limit(1000)
	    .get()
			
			
	const data = res.data.filter(item => new Date(item.end_date).getTime() >= 1772985600000)
	
	console.log(data)
}
