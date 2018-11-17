const _ = require('lodash');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const googl = require('goo.gl');

module.exports = function(controller) {

  const getUser = async (userId) => {
    return new Promise((resolve, reject) => {
      controller.storage.users.get(userId, function(err, chatUser) {
        if (err) reject(err);
        else resolve(chatUser);
      })
    })
  };

  const getCandidateId = async (userGuid) => {
    return new Promise((resolve, reject) => {
      controller.storage.Candidate.get(userGuid, function(err, candidate) {
        if (err) reject(err);
        else resolve(candidate._id);
      })
    })
  };

  const saveCandidate = async dataToSave => {
    return  new Promise((resolve, reject) => {
      controller.storage.Candidate.save(dataToSave, (err, candidate) => {
        if (err) reject(err);
        // Also update chatter
        else {
          dataToSave.candidateId = candidate._id;
          controller.storage.users.save(dataToSave, (ee, chatter) => {
            if (ee) reject(ee);
            else resolve({candidate, chatter});
          })    
        }
      })
    })
  }

  controller.hears('hello|hi|good morning|good afternoon|good evening|hey','message_received', function(bot, message, req) {
    bot.startConversation(message, async function(err, convo) {

      // create a path for when a user says YES
      convo.addMessage({
        text: 'You said yes! How wonderful.',
      },'yes_thread');

      // create a path for when a user says NO
      convo.addMessage({
        text: 'You said no, that is too bad.',
      },'no_thread');

      let chatUser, chatUserCandidateId;
      try {
        chatUser = await getUser(message.user);
        chatUserCandidateId = await getCandidateId(message.user);
      } catch(e) {
        convo.say('Error getting user info');
      }

      if (chatUser && chatUserCandidateId) {

        // TODO: add recruiter name
        let recruiterName = chatUser.recruiterName;
        if ('conciergeAlias' in chatUser.thisOrg && 'conciergeTitle' in chatUser.thisOrg) {
          recruiterName = `${chatUser.thisOrg.conciergeAlias}, ${chatUser.thisOrg.conciergeTitle}`;
        }
        controller.setTickDelay(1200);
        convo.say(`Hi, Thank you for your interest in ${chatUser.thisOrg.organizationName}.`)
        controller.setTickDelay(1170);
        convo.say(`I’m ${recruiterName} and your Recruiter Concierge!`)
        controller.setTickDelay(2100);
        convo.say(`We’re honored you’ve applied so I’m here to make your application experience amazing.`)

        convo.addMessage({
          text: 'Thank you!',
        }, 'sayThankYou')

        

        const noPhoneThankYou = chatUser => {
          controller.setTickDelay(2500);
          convo.addMessage({
            text: `Ok, I understand ${chatUser.firstName}. `
          }, 'noPhoneThankYou');

          controller.setTickDelay(4350);

          convo.addMessage({
            text: `We’d love to hear back from you once you gain more experience. We’ll keep your resume in our candidate database in case another opportunity that fits you better becomes available. I want to sincerely thank you again for your interest in ${chatUser.thisOrg.organizationName}. Thanks for applying!`
          }, 'noPhoneThankYou');

          controller.setTickDelay(4350);

          convo.addMessage({
            text: `I want to sincerely thank you again for your interest in ${chatUser.thisOrg.organizationName}. Thanks for applying!`
          }, 'noPhoneThankYou');

        };

        const askForPhoneNumber = chatUser => {
          let que = `Great. Please provide me with your best contact phone number.`;

          convo.addQuestion(que, async (response, convo) => {

            let dataToSave = {
              candidateGuid: chatUser.id,
              orgId: chatUser.orgId,
              phoneNumber: response.text
            };
            try {
              await saveCandidate(dataToSave);
              chatUser = await getUser(message.user);
            } catch(e) {
              console.log(e);
            }
            // Thanks for Phone Number
            convo.addMessage({
              text: `Thanks, ${chatUser.firstName}.  One of our talent associates will reach out to you soon.  I want to sincerely thank you again for your interest in ${chatUser.thisOrg.organizationName}.  Goodbye!`,
            }, 'thanksForPhoneNumber')
            convo.changeTopic('thanksForPhoneNumber');

          }, {}, 'askForPhoneNumber')
        };

        const whenCandidateIsInvalid = chatUser => {
          convo.addQuestion(`Did you have any other previous experience in this type of role?  If yes, can you tell me a little bit about that?`, async (response, convo) => {

            let dataToSave = {
              candidateGuid: chatUser.id,
              orgId: chatUser.orgId,
              otherPreviousExperiences: response.text
            };
            try {
              await saveCandidate(dataToSave);
              chatUser = await getUser(message.user);
            } catch(e) {
              console.log(e);
            }

            convo.addMessage({
              text: `Thanks for sharing, ${chatUser.firstName}.  Unfortunately, it looks like your experience does not meet our minimum qualifications.`,
            }, 'invalidCandidate');

            let que = `However, if you’re interested in discussing other opportunities, I can have one of our recruiters reach out to you.  Would you like that?`;

            convo.addQuestion(que, [{
              pattern: bot.utterances.yes,
              callback: function(response, convo) {
                askForPhoneNumber(chatUser);
                convo.changeTopic('askForPhoneNumber');
              }
            }, {
              pattern: bot.utterances.no,
              callback: function(response,convo) {
                noPhoneThankYou(chatUser);
                convo.changeTopic('noPhoneThankYou');
              }
            }, {
              default: true,
              callback: function(response,convo) {
                // just repeat the question
                convo.repeat();
                convo.next();
              }
            }], {}, 'invalidCandidate')

            convo.next();
              
          }, {}, 'invalidCandidate')

          
        }        

        /**
         * Asks for Last role
         * @param  {Object} chatUser 
         * 
         * @return null
         */
        const askForRole = (chatUser) => {
          convo.addQuestion(`Interesting. What was your last role and how long did you do it?`, async (response, convo) => {
            let regExp = /(\D*)\.?\,?\s?(\d*)\s?year/i
            let match = String(response.text).match(regExp);
            if (match) {
              chatUser.lastRoleName = match[1];
              chatUser.lastRoleYearOfExp = match[2];
              let dataToSave = {
                candidateGuid: chatUser.id,
                orgId: chatUser.orgId,
                lastRoleName: chatUser.lastRoleName,
                lastRoleYearOfExp: chatUser.lastRoleYearOfExp,
              };
              try {
                await saveCandidate(dataToSave);
                chatUser = await getUser(message.user);
              } catch(e) {
                console.log(e);
              }

              if (parseInt(chatUser.lastComapnyYearOfExp) >= chatUser.jobAppliedExpRequired) {
                controller.setTickDelay(4500);
                convo.addMessage({
                  text: `That’s good news! This position requires a minimum of ${chatUser.jobAppliedExpRequired} years of experience, so you definitely meet that qualification.`,
                }, 'validCandidate');

                controller.setTickDelay(3000);
                convo.addMessage({
                  text: `I appreciate your transparency. `,
                }, 'validCandidate');

                controller.setTickDelay(3000);
                convo.addMessage({
                  text: `I am connecting you with one of our recruiters. `,
                }, 'validCandidate');

                controller.setTickDelay(3000);
                convo.addMessage({
                  text: `You’ll hear from them within 24 hours. `,
                }, 'validCandidate');

                let que = `Can you please provide your best phone number?`;

                controller.setTickDelay(3000);
                convo.addQuestion(que, async (response, convo) => {

                  let dataToSave = {
                    candidateGuid: chatUser.id,
                    orgId: chatUser.orgId,
                    phoneNumber: response.text

                  };
                  try {
                    await saveCandidate(dataToSave);
                    chatUser = await getUser(message.user);
                  } catch(e) {
                    console.log(e);
                  }

                  convo.next()
                  // convo.changeTopic('thanksForPhoneNumber');

                }, {}, 'validCandidate')

                // Thanks for Phone Number
                controller.setTickDelay(3000);
                convo.addMessage({
                  text: `Thanks!  You can expect a deeper conversation about your experience and goals.`,
                }, 'validCandidate')

                controller.setTickDelay(5000);
                convo.addMessage({
                  text: `Our recruiters are also interested in learning more about you as a person so we ask every prospective candidate to do a quick exercise that gives us more insights on what makes you tick.`,
                }, 'validCandidate')


                controller.setTickDelay(3000);
                convo.addMessage({
                  text: `It helps create a more meaningful conversation!`,
                }, 'validCandidate')

                let surveyUrl;
                if (process.env.NODE_ENV == 'production') {
                  surveyUrl = `https://candidate.hirehumanly.com?orgId=${chatUser.orgId}&candidateId=${chatUserCandidateId}`;
                } else {
                  surveyUrl = `http://localhost:3689?orgId=${chatUser.orgId}&candidateId=${chatUserCandidateId}`;
                }
                googl.setKey(process.env.GOO_GL_API_KEY);
                googl.shorten(surveyUrl).then(async function(shortUrl) {
                  convo.addMessage({
                    text: `Great, ${chatUser.firstName}. Please click on this <${shortUrl}> and follow the onscreen instructions. I want to sincerely thank you again for your interest in ${chatUser.thisOrg.organizationName} and best of luck!`
                  }, 'showSurveyUrl');

                  // Candidate is now screened
                  let dataToSave = {
                    candidateGuid: chatUser.id,
                    orgId: chatUser.orgId,
                    isValid: true,
                  };
                  try {
                    await saveCandidate(dataToSave);
                  } catch(e) {console.log(e);}
                }).catch(e => console.log('Url shortner error', e))

                controller.setTickDelay(2500);
                convo.addMessage({
                  text: `It should take you 15 minutes or less, and you have up to 48 hours to complete it.`
                }, 'validCandidate')

                controller.setTickDelay(3500);
                convo.addMessage({
                  text: `When your done, you’ll get a full report (and an extra helpful bonus) of valuable personal insights to help your career.  `
                }, 'validCandidate')

                controller.setTickDelay(2500);
                que = `Do you have time to take this now?`;
                convo.addQuestion(que, [{
                  pattern: bot.utterances.yes,
                  callback: function(response, convo) {
                    convo.changeTopic('showSurveyUrl');
                  }
                }, {
                  pattern: bot.utterances.no,
                  callback: function(response,convo) {
                    convo.addMessage({
                      text: `Ok, ${chatUser.firstName}. No problem. In a moment, I will send you a text message that includes a link that will take you to a new webpage.  Please click the link and follow the onscreen instructions.  You will have up to 48 hours to complete the survey.`
                    }, 'validCandidate')

                    convo.addMessage({
                      text: `I want to sincerely thank you again for your interest in ${chatUser.thisOrg.organizationName} and best of luck!`
                    }, 'validCandidate')

                    convo.next();
                  }
                }, {
                  default: true,
                  callback: function(response,convo) {
                    // just repeat the question
                    convo.repeat();
                    convo.next();
                  }
                }], {}, 'validCandidate')


                // convo.addMessage({text: 'In a moment I’ll provide a link that will take you to a new webpage.'}, 'validCandidate');
                // convo.addMessage({text: 'Please click on the link and follow the onscreen instructions.'}, 'validCandidate');
                // convo.addMessage({text: `I want to sincerely thank you again for your interest in ${chatUser.thisOrg.organizationName} and best of luck!`, 
                //   action: 'goToSurvey'
                // }, 'validCandidate');
                convo.changeTopic('validCandidate')
              } else {

                whenCandidateIsInvalid(chatUser);
                convo.changeTopic('invalidCandidate')
              }
            } else {
              convo.repeat()
              convo.next()
            }

          }, {}, 'askForRole');
        };

        const askForExperience = (chatUser) => {

          controller.setTickDelay(3000);
          convo.addMessage({
            text: `I understand. A new opportunity might be perfect for you ${chatUser.firstName}.`
          }, 'askExperience');

          controller.setTickDelay(3500);
          convo.addQuestion(`Who was your last company and how long did you work there?`, async function(response, convo) {
            let regExp = /(\D*)\.?\,?\s?(\d*)\s?year/i
            let match = String(response.text).match(regExp);
            if (match) {
              chatUser.lastComapnyName = match[1];
              chatUser.lastComapnyYearOfExp = match[2];

              let dataToSave = {
                candidateGuid: chatUser.id,
                orgId: chatUser.orgId,
                lastComapnyName: match[1],
                lastComapnyYearOfExp: match[2],
              };
              try {
                await saveCandidate(dataToSave);
                chatUser = await getUser(message.user);
              } catch(e) {
                console.log(e);
              }

              askForRole(chatUser);
              convo.changeTopic('askForRole');
            } else {
              convo.repeat()
              convo.next()
            }
          }, {}, 'askExperience');

        }; // end askForExperience()

        let askJob = {text: 'Can you describe the type of role and opportunity you are ideally looking for?', quick_replies: []};
        _.each(chatUser.thisOrgJobs, function(job) {
          askJob.quick_replies.push({title: job.title, payload: job.title});
        });
        convo.addQuestion(askJob, async function(response, convo) {
          chatUser.jobApplied = response.text;
          let jobAppliedExpRequired = 0;
          let jobApplied = _.find(chatUser.thisOrgJobs, {title: response.text});
          let job;
          if (jobApplied) {
            jobAppliedExpRequired = jobApplied.experienceRequiredYear;
            job = jobApplied._id;
          }
          let dataToSave = {
            candidateGuid: chatUser.id,
            orgId: chatUser.orgId,
            jobApplied: response.text,
            jobAppliedExpRequired,
            job
          };
          try {
            await saveCandidate(dataToSave);
            chatUser = await getUser(message.user);
          } catch(e) {
            console.log(e);
          }

          controller.setTickDelay(2500);
          convo.addMessage({
            text: `Thanks for sharing ${chatUser.firstName}!`
          }, 'askJobChangeReason');

          controller.setTickDelay(3000);
          convo.addMessage({
            text: `We’re glad you contacted ${chatUser.thisOrg.organizationName}. `
          }, 'askJobChangeReason');

          controller.setTickDelay(2500);
          convo.addQuestion(`I’m interested in why you’re looking for a new position?`, async function(response, convo) {
            let dataToSave = {
              candidateGuid: chatUser.id,
              orgId: chatUser.orgId,
              reasonForJobChange: response.text
            };
            try {
              await saveCandidate(dataToSave);
              chatUser = await getUser(message.user);
            } catch(e) {
              console.log(e);
            }
            askForExperience(chatUser);
            convo.changeTopic('askExperience');
          }, {}, 'askJobChangeReason')

          convo.changeTopic('askJobChangeReason')
        }, {}, 'askJobToApply');

        convo.addQuestion('What is your name?', async function(response, convo) {
          let name = response.text;
          let regExp = /my\sname\sis\s(.*)/i
          if (regExp.test(name)) {
            let match = name.match(regExp);
            name = match[1];
          }

          let firstName, lastName, middleName;
          let nameArray = name.split(' ');
          switch(_.size(nameArray)) {
            case 3:
              firstName = nameArray[0];
              middleName = nameArray[1];
              lastName = nameArray[2];
              break;
            case 2:
              firstName = nameArray[0];
              lastName = nameArray[1];
              break;
            case 1:
              firstName = nameArray[0];
              break;
          }

          chatUser.name = response.text;
          let dataToSave = {
            candidateGuid: chatUser.id,
            orgId: chatUser.orgId,
            name: response.text,
            firstName,
            lastName,
            middleName,
          };

          try {
            await saveCandidate(dataToSave);
            chatUser = await getUser(message.user);
          } catch(e) {
            // Just shut up
            console.log(e);
          }


          controller.setTickDelay(2500);
          convo.addMessage({
            text: `Hi ${firstName}. It’s a pleasure to meet you.`,
            action: 'askJobToApply',
          }, 'beforeJobToApply');

          controller.setTickDelay(2500);
          convo.addMessage({
            text: `I’d like to get better acquainted. `,
            action: 'askJobToApply',
          }, 'beforeJobToApply');


          controller.setTickDelay(2500);
          convo.addMessage({
            text: `I want to ensure we maximize our time together and support your career search to the best of our abilities.`,
            action: 'askJobToApply',
          }, 'beforeJobToApply');


          convo.changeTopic('beforeJobToApply')
          // convo.next();
        }, {}, 'default');


        

      } else {
        convo.say("Sorry, but unable to get user info");
      }
    });

  });


}