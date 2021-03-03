const redis = require('./utils/redisclient');
const logger = require('./utils/logger');

const runCheckinProcessor = async () => {
  const redisClient = redis.getClient();
  const checkinStreamKey = redis.getKeyName('checkins');
  const checkinProcessorIdKey = redis.getKeyName('checkinprocessor', 'lastid');

  // This needs to XREAD from the checkins stream, and perform the
  // following actions for each checkin read:
  //
  // * Update user lastCheckin
  // * Update user lastSeenAt
  // * Update user numCheckins
  // * Update location numCheckins
  // * Update location numStars
  // * Update location averageStars

  let lastIdRead = await redisClient.get(checkinProcessorIdKey);
  if (lastIdRead == null) {
    lastIdRead = 0;
  }

  // TODO logger
  logger.info(`Reading stream from last ID ${lastIdRead}.`);

  /* eslint-disable no-constant-condition */
  while (true) {
    /* eslint-enable */
    /* eslint-disable no-await-in-loop */
    const response = await redisClient.xread('COUNT', '1', 'BLOCK', '5000', 'STREAMS', checkinStreamKey, lastIdRead);
    /* eslint-enable */

    if (response) {
      const checkinData = response[0][1][0];
      const fieldNamesAndValues = checkinData[1];

      const checkin = {
        id: checkinData[0],
      };

      for (let n = 0; n < fieldNamesAndValues.length; n += 2) {
        const k = fieldNamesAndValues[n];
        const v = fieldNamesAndValues[n + 1];
        checkin[k] = v;
      }

      // TODO do the work...

      lastIdRead = checkin.id;
      redisClient.set(checkinProcessorIdKey, lastIdRead);

      logger.debug(`Processed checkin ${checkin.id}.`);
    } else {
      logger.info('Waiting for more checkins...');
    }
  }
};

runCheckinProcessor();
