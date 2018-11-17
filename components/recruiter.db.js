const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const debug = require('debug')('botkit:db');

module.exports = function(config) {
	mongoose.Promise = global.Promise;
	mongoose.connect(process.env.RECRUITER_MONGODB_URI, {useMongoClient: true });
	const db = mongoose.connection;
	db.on('error', (err) => {
	  console.log('MongoDB connection error while connecting Recruiter DB');
	  console.error(err);
	  process.exit();
	});
	db.once('open', function() {
		debug('CONNECTED TO RECRUITER DB!');
	});

	// Schemas
	const organizationSchema = new mongoose.Schema({
	  organizationName: {type: String, unique: true},
	  notes: String
	}, {timestamps: true});

	const jobSchema = new mongoose.Schema({
	  title: {type: String},
	  orgId: {type: String},
	  city: String,
	  type: String
	}, {timestamps: true});

	const candidateSchema = new mongoose.Schema({
		email: { type: String},
		name: String,
		firstName: String,
		middleName: String,
		lastName: String,
		candidateGuid: String,
		orgId: String,
		jobApplied: String,
		job: { type: Schema.Types.ObjectId, ref: 'Job' },
		jobAppliedExpRequired: {type: Number, default: 0},
		yearsOfExperience: {type: Number, default: 0},
		recruiterName: String,
		lastRoleName: String,
		lastComapnyName: String,
		lastRoleYearOfExp: {type: Number, default: 0},
		lastComapnyYearOfExp: {type: Number, default: 0},
		reasonForJobChange: String,
		timezoneOffset: Number,
		isShortlisted: Boolean,
	    isArchieved: Boolean,
	    isScreened: Boolean,
	    phoneNumber: String,
	    otherPreviousExperiences: String,
	    isValid: Boolean,
	}, { timestamps: true });

	const chatterSchema = new Schema({
		id: {type: String, index: true},
		name: String,
		firstName: String,
		middleName: String,
		lastName: String,
		jobApplied: String,
		job: { type: Schema.Types.ObjectId, ref: 'Job' },
		jobAppliedExpRequired: {type: Number, default: 0},
		yearsOfExperience: {type: Number, default: 0},
		orgName: String,
		orgId: String,
		candidateGuid: String,
		recruiterName: String,
		lastRoleName: String,
		lastComapnyName: String,
		lastRoleYearOfExp: {type: Number, default: 0},
		lastComapnyYearOfExp: {type: Number, default: 0},
		reasonForJobChange: String,
		isShortlisted: Boolean,
	    isArchieved: Boolean,
	    isScreened: Boolean,
	    phoneNumber: String,
	    otherPreviousExperiences: String,
	    isValid: Boolean,
		thisOrg: {type: Object, default: {}, },
		thisOrgJobs: {type: Array, default: [], },
		attributes: {type: Object, default: {}, },
	}, {timestamps: true})

	const historySchema = new Schema({
	  chatterId: {type: String, index: true, },
	  message: {},
	  date: {type: Date, default: Date.now, }
	}, {timestamps: true});


	const recruiterSchema = new mongoose.Schema({
	  email: { type: String, unique: true },
	  profile: {
	    name: String,
	    gender: String,
	    location: String,
	    website: String,
	    picture: String
	  },
	  group: String,
	  orgId: String,
	}, { timestamps: true });



	// Models
	const Job = mongoose.model('Job', jobSchema);
	const Organization = mongoose.model('Organization', organizationSchema);
	const Candidate = mongoose.model('Candidate', candidateSchema);
	const History = mongoose.model('History', historySchema);
	const Chatter = mongoose.model('Chatter', chatterSchema);
	const Recruiter = mongoose.model('User', recruiterSchema);

	return {
		Recruiter: {
			find: function(data, cb) {
				return Recruiter.findOne(data, cb);
		    },
			get: function(id, cb) {},
			save: function(data, cb) {},
			all: function(cb) {},
		},
		teams: {
		  get: function(id, cb) {},
		  save: function(data, cb) {},
		  all: function(cb) {},
		  count: function(cb) {},
		  find: function(data, cb) {}
		},
		channels: {
		  get: function(id, cb) {},
		  save: function(data, cb) {},
		  all: function(cb) {},
		  find: function(data, cb) {}
		},
		history: {
		  addToHistory: function(message, user) {
		    return new Promise(function(resolve, reject) {
		      var hist = new History({chatterId: user, message: message});
		      hist.save(function(err) {
		        if (err) { return reject(err) }
		        resolve(hist);
		      });
		    });
		  },
		  getHistoryForUser: function(user, limit) {
		    return new Promise(function(resolve, reject) {
		      History.find({chatterId: user}).sort({date: -1}).limit(limit).exec(function(err, history) {
		        if (err) {  return reject(err) }
		        resolve(history.reverse());
		      });
		    });
		  }
		},
		users: {
			get: function(id, cb) {
				return Chatter.findOne({id: id }, cb);
			},
			save: function(data, cb) {
				Chatter.findOne({candidateGuid: data.candidateGuid, orgId: data.orgId}, function(err, chatter) {
					if (err) {
						if (cb) return cb(err);
					}
					if (!chatter) {
						chatter = new Chatter(data);
					}
					// copy values
					for (var key in data) {
						chatter[key] = data[key];
					}
					chatter.save(function(err) {
						if (cb) cb(err, chatter);
					});
				});
			},
			all: function(cb) {
				return chatter.find({}, cb);
			},
			find: function(data, cb) {
				return chatter.find(data, cb);
			},
		},
		Candidate: {
			get: function(guid, cb) {
				return Candidate.findOne({candidateGuid: guid}, cb);
			},
			save: function(data, cb) {
				Candidate.findOne({candidateGuid: data.candidateGuid, orgId: data.orgId}, function(err, candidate) {
					if (err && cb) return cb(err);

					if (!candidate) {
						candidate = new Candidate(data);
					}
					// Copy Values
					for (let key in data) {
						candidate[key] = data[key];
					}
					candidate.save(function(err) {
						if (cb) cb(err, candidate);
					})
				})
			},
			all: function(cb) {
				return Candidate.find({}, cb);
			},
			find: function(data, cb) {
				return Candidate.find(data, cb);
			},
		},
		Organization: {
			get: function(id, cb) {
				return Organization.findOne({_id: id}, cb);
			},
			all: function(cb) {
				return Organization.find({}, cb);
			},
			find: function(data, cb) {
				return Organization.find(data, cb);
			},
		},
		Job: {
			get: function(id, cb) {
				return Job.findOne({_id: id}, cb);
			},
			all: function(cb) {
				return Job.find({}, cb);
			},
			find: function(data, cb) {
				return Job.find(data, cb);
			},
		},
	}
}