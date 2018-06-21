

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
    let service = req.params.service;
    let uid     = req.params.uid;
    let login   = req.query.login == "true"; 

    Client.registrationLink(service, uid, login)
      .then(resp => res.status(200).json(resp))
      .catch(next);

  });


  // router.post('/payout/:service', (req, res, next) => {
  //   var ctx = req._ctx;
  //   let service = req.params.service;
  //   let payload = ctx.payload;

  //   Client.payout(service, payload)
  //     .then(resp => res.status(200).json(resp))
  //     .catch(next);

  // });

  router.get("/echo/:service/",function(req, res, next){
    let service = req.params.service;
    Client.echo(service)
      .then(resp => res.status(200).json(resp))
      .catch(next);
  }); 

  App.app.use(`${App.baseRoute}/srv/pay`, router);
}


module.exports = setupRoutes;