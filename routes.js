

let router = new require('express').Router();
let path = require('path');

let Client = require('./index.js');


let log;

/**
 * @module tb-payments/routes
 */
function setupRoutes(App){

  log = App.log.child({module:'payRoute'});

  log.debug("Setup routes pay");


  router.use(function(req, res, next){
    req._ctx['service']  = "pay";
    req._ctx['resource']  = req.query.service;
    next();
  });

  router.get("/webhook/:service/confirm",function(req, res, next){
    let service = req.params.service;

    Client.confirm(service, req.query)
      .then(resp => res.status(200).json(resp))
      .catch(next);
  }); 


  router.get('/registrationlink/:service/:uid([0-9a-f]{24})', (req, res, next) => {
    let service     = req.params.service;
    let uid         = req.params.uid;
    let login       = req.query.login == "true"; 
    let redirectUrl = req.query.redirectUrl;
    let redirectTime = req.query.redirectTime;

    let data = {
      redirectUrl: redirectUrl,
      redirectTime: redirectTime
    }
    // Client.registrationLink(service, uid, redirectUrl, login)
    Client.registrationLink(service, uid, data, login)
      .then(resp => res.status(200).json(resp))
      .catch(next);

  });

  router.get('/balance/:service', (req, res, next) => {
    let service  = req.params.service;
    let data     = req.query;

    // Client.registrationLink(service, uid, redirectUrl, login)
    Client.getBalance(service, data)
      .then(resp => res.status(200).json(resp))
      .catch(next);

  });


  router.get('/echo/:service',function(req, res, next){
    let service = req.params.service;
    Client.echo(service)
      .then(resp => res.status(200).json(resp))
      .catch(next);
  }); 

/*
 * Charge a user (tb.pay-transaction: in), from a stored account or with a token
 * service:    String,   // so far... 'stripe'
 * body: {
 *   uid:         ObjectId, // toroback user _id
 *   amount:      Number,   // amount to charge
 *   currency:    String,   // currency of amount. ISO
 *   paid:        ObjectId, // (optional.R) tb.pay-account _id (required if token is undefined)
 *   token:       String,   // (optional.R) token representing a temporary account. depends on service (required if paid is undefined)
 *   store:       Bool,     // (optional) store token as a new account for this user. needs token. default: false
 *   description: String,   // (optional) description for this charge. shown to user in receipt
 *   statementDescription: String, // (optional) description for this charge. shown to user in credit card statement. max: 22 characters (on stripe)
 * }
 */
  router.post('/charge/:service', function(req, res, next){
    let service = req.params.service;
    let data = req.body;

    Client.charge( service, data )
      .then( resp => res.json( resp ) )
      .catch( next );
  }); 

  App.app.use(`${App.baseRoute}/srv/pay`, router);
}


module.exports = setupRoutes;