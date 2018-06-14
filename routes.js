

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


  router.get("/ping",function(req, res, next){
     log.debug("Pay module ping request"); 
     res.status(200).json("pong")
  }); 

  App.app.use(`${App.baseRoute}/srv/pay`, router);
}


module.exports = setupRoutes;