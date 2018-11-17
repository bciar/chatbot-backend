// const recruiterDb = require(__dirname + '/recruiter.db.js')({});

module.exports = function(controller) {

	const saveCandidate = async (userProfile) => {
		return new Promise((resolve, reject) => {
			let dataToSave = {
				candidateGuid: userProfile.candidate_guid,
				orgId: userProfile.org,
				timezoneOffset: userProfile.timezone_offset,
				recuiterName: userProfile.recruiterName
			};
			controller.storage.Candidate.save(dataToSave, function(err, candidate) {
				if (err) reject(err);
				else resolve(candidate);
			})
		});
	};

	const getOrg = async (orgId) => {
		return new Promise((resolve, reject) => {
			controller.storage.Organization.get(orgId, (err, org) => {
				if (err) reject(err);
				else resolve(org);
			})
		});
	}
	const getOrgJobs = async (orgId) => {
		return new Promise((resolve, reject) => {
			controller.storage.Job.find({orgId}, (err, jobs) => {
				if (err) reject(err);
				else resolve(jobs);
			})
		});
	}
	const getRecruiters = async (orgId) => {
		return new Promise((resolve, reject) => {
			controller.storage.Recruiter.find({orgId}, (err, recruiter) => {
				if (err) reject(err);
				else resolve(recruiter);
			})
		});
	}

    controller.middleware.ingest.use(async function(bot, message, res, next) {
		if (message.type == 'hello' || message.type == 'welcome_back' || message.type == 'reconnect') {

			try {
				// console.log("Got Welcome Back", {message});
				let thisOrg = await getOrg(message.user_profile.org);
				if (thisOrg) {
					message.user_profile.thisOrg = thisOrg;
					message.user_profile.orgId = thisOrg._id;

					let thisOrgJobs = await getOrgJobs(message.user_profile.org);
					
					message.user_profile.thisOrgJobs = thisOrgJobs;
					message.user_profile.candidateGuid = message.user;

					let thisRecruiter = await getRecruiters(message.user_profile.org);
					if (thisRecruiter && 'profile' in thisRecruiter && 'name' in thisRecruiter.profile) {
						message.user_profile.recruiterName = thisRecruiter.profile.name;
					} else {
						console.log("Org does not have recruiter");
					}

					await saveCandidate(message.user_profile);
				} else {
					bot.say('Invalid chatbot configurations. Please contact site admin.')
				}
			} catch(e) {
				console.log(e);
				bot.say('Invalid chatbot configurations. Please contact site admin.')
			}
	        next();
        } else {
        	next();
        }
    });

}

