const getOrg = async (controller, orgId) => {
	return new Promise((resolve, reject) => {
		controller.storage.Organization.get(orgId, (err, org) => {
			if (err) reject(err);
			else resolve(org);
		})
	});
}


module.exports = (webserver, controller) => {
	webserver.post('/recruiter', function(req, res) {
		if (req.body.org) {
			getOrg(controller, req.body.org.org)
				.then(org => {
					res.json({success: true, recruiter: org});
				})
				.catch(err => {
					res.json({success: false, recruiter: [], error: err});
				})
		} else {
			res.json({success: false, recruiter: [], error: 'no user specified'});
		}
	});
}