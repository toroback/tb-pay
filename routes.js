

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
    var ctx = req._ctx;
    let service = req.params.service;
    let payload = ctx.payload;
    ctx.model = "pay";
    // ctx.method = 'confirm';

    Client.confirm(service, req.query)
    // Client.forService(service)
      // .then(client => client.payRegistered(payload.data, payload.options))
      .then(resp => res.status(200).json(resp))
      .catch(next);

     // log.debug("Confirm for service "+ service); 
     // res.status(200).json("Confirm for service "+ service);
  }); 

  router.get("/ping",function(req, res, next){
     log.debug("Pay module ping request"); 
     res.status(200).json("pong")
  }); 

  App.app.use(`${App.baseRoute}/srv/pay`, router);
}


module.exports = setupRoutes;