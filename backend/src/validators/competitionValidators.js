const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const getCompetitionParamsSchema = Joi.object({
  id: objectId.required(),
});

const listCompetitionsQuerySchema = Joi.object({
  category: Joi.string().trim().max(50),
  status: Joi.string().valid(
    'UPCOMING',
    'REGISTRATION_OPEN',
    'REGISTRATION_CLOSED',
    'ONGOING',
    'ENDED'
  ),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

const leaderboardQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

function validate(schema, source = 'params') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid request',
          details: error.details.map((d) => d.message),
        },
      });
    }
    req[source] = value;
    next();
  };
}

module.exports = {
  getCompetitionParamsSchema,
  listCompetitionsQuerySchema,
  leaderboardQuerySchema,
  validate,
};
