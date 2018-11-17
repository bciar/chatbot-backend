module.exports = function(controller) {

  controller.middleware.spawn.use(function(bot, next) {

    if (controller.studio_identity) {
      bot.identity = controller.studio_identity;
      bot.identity.id = controller.studio_identity.botkit_studio_id;
    } else {
      bot.identity = {
          name: 'Hire Humanly Bot',
          id: 'web',
      }
    }
    next();

  })


  controller.middleware.receive.use(function(bot, message, next) {

    if (!message.user_profile) {
      next();
    } else {
      controller.storage.users.get(message.user, function(err, user) {
        if (!user) {
          user = {id: message.user}
        }

        user.name = message.user_profile.name;

        for (var key in message.user_profile) {
          if (key != 'name' && key != 'id') {
            user[key] = message.user_profile[key];
          }
        }

        controller.storage.users.save(user, function(err) {
          // log the updated user profile info from this user.
          // FIXME: Figure out analytics
          // controller.metrics.user(bot, message);

          next();

        });

      });
    }

  });


}
