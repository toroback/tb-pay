/** 
 * @module tb-pay
 *
 * @description 
 *
 * Este módulo permite ... COMPLETAR
 *
 * <p>
 * Servicios disponibles:
 * </p>
 * <p>
 * {@link module:tb-pay-payoneer|Payoneer}
 * </p>
 *
 * 
 * <p>
 * @see [Guía de uso]{@tutorial tb-pay} para más información.
 * @see [REST API]{@link module:tb-pay/routes} (API externo).
 * @see [Class API]{@link module:tb-pay.Client} (API interno).
 * @see Repositorio en {@link https://github.com/toroback/tb-pay|GitHub}.
 * </p>
 *
 * 

 * 
 */

let rscPath  = __dirname +'/resources';

var hook = require("./lib/hook");

let moduleConfigId = "payOptions";
let App;
let log;

let payOptions;

let loadedClients = {}; //Objeto que almacena un cliente cargado para cada servicio para evitar que se creen multiples instancias.
/**
 * Clase que representa un gestor de pagos
 * @memberOf module:tb-pay
 */
class Client {

  /**
   * Crea un gestor de pagos. Utilizar los modulos tb-pay-payoneer, etc…
   * @param  {Object} options        Objeto con las credenciales para el servicio.
   * @param  {Object} Adapter        Adapter del servicio que se va a utilizar. 
   */
  constructor(service, options, Adapter) {
    this.service = service;
    this.options = options || {};
    this.adapter = new Adapter(App, this);
  }


  confirm(data){
    return new Promise((resolve,reject)=>{
      let success = true;
      let WebhookLog = App.db.model('tb.pay-webhook-logs');
      let webhookLog = new WebhookLog({service: this.service, data: data});
      webhookLog.save()
        .then(doc =>  this.processWebhook(this.service, data) )
        .catch(res => {
          success = false;
          if(res.err) log.error(res.err);
          return res;
        })
        .then(res => {
          webhookLog.error = !success;
          if(res.ref) webhookLog.ref = res.ref;
          if(res.uid) webhookLog.uid = res.uid;
          if(res.rid) webhookLog.rid = res.rid;
        
          return webhookLog.save();
        })
        .then(res => {
          if(success)
            resolve({status: "ok"});
          else
            reject(new Error("Server error"));
        })
        .catch(reject);

    });
  }


  processWebhook(service, data){
    return new Promise((resolve, reject) => {
      let ret = {}
      this.adapter.processWebhook(data)
        .then(res =>{
          log.debug("processed webhook in service "+ JSON.stringify(res));
          ret.ref = res.ref;
          let docData = res.data;
          if(res.ref == "account"){
            let uid = docData.uid;
            ret.uid = uid;
            
            let PayAccount = App.db.model('tb.pay-accounts');
            PayAccount.findOne({uid: uid, service: service})
              .then(account =>{
                if(!account) account = new PayAccount({service: service, uid: uid, status: "pending"});
                
                account.status = docData.status;
                account.sUserId = docData.sUserId;
                account.originalResponse = data;
                return account.save();              
              })
              .then(doc => { 
                ret.rid = doc._id;
                resolve(ret);
              })
              .catch(err => { 
                ret.err = err; 
                reject(ret);
              });
    
          }else if(res.ref == "transaction"){

            let uid = docData.uid;
            ret.uid = uid;

            App.db.model('tb.pay-transactions').findOne({_id: docData.paymentId, service: service}, (err,transaction) =>{
              if(err) reject(err);
              else{
                if(transaction){
                  transaction.status = docData.status;
                  // transaction.sTransId = docData.payoneerPaymentId;

                  if(docData.status == "rejected"){
                    transaction.data = {
                      code: docData.reasonCode,
                      reason: docData.reasonDesc
                    };
                  }else{
                    transaction.data = {};
                  }

                  transaction.save()
                    .then(doc => { 
                      ret.rid = doc._id;
                      resolve(ret);
                    })
                    .catch(err => { 
                      ret.err = err; 
                      reject(ret);
                    })
                }else{
                  reject(App.err.notFound("Transaction not found"));
                }
              }
            });
          }else{
            resolve(ret)
            // throw App.err.notAcceptable("Unhlanded webhook type");
          }
        })
        .catch(err => { 
          ret.err = err; 
          reject(ret);
        })
        // .then(res =>{ resolve(ret); });
        
    });
  }

  createRegistrationLink(uid, data, forLogin){
    return new Promise((resolve,reject)=>{
      let service = this.service;
      // let PayAccount = App.db.model('tb.pay-accounts');
      //Se busca usuario y cuenta asociada al usuario para el servicio

      findUserAndAccount(uid, service)
        .then(res =>{
          let user = res.user;
          let account = res.account;

          if(!user) throw App.err.notFound("user not foud");

          if(account && account.status == "approved"){
            //Si existe cuenta y está aprovada se devuelve la cuenta
            resolve({
              account:{
                uid: account.uid,
                service: account.service,
                status: account.status
              }
            });

          }else{
            //Si no existe cuenta o no está aprobada se pedirá el link al servicio
            let linkUrl = undefined;

            this.requestLink(user, account, data, forLogin)
              .then(res => {
                linkUrl = res.response.link;
                
                if(!account) account = new App.db.model('tb.pay-accounts')({service: service, uid: user._id});
                if(!account.data) account.data = {};
                Object.assign(account.data, res.response.data); //Se asigna la información específica del servicio

                account.status = "pending";
                account.originalRequest = res.request;
                account.originalResponse = res.response;
                
                if(account._id) account.uDate = new Date();

                return account.save();
              })
              .then(doc => resolve({url: linkUrl}))
              .catch(reject);
            
          }
        })
        .catch(reject);
       
    });
  }

  requestLink(user, account, data, forLogin){
    return new Promise((resolve,reject)=>{
      let payload = undefined;
      Client.prepareRequestLinkPayload({service: this.service, user: user, account: account, data: data, forLogin: forLogin})
        .then(res =>{
          payload = res;
          return  this.adapter.createRegistrationLink({forLogin: forLogin, account: account, payload: payload})
        })
        .then(res =>{
          log.debug("requestLink -" + JSON.stringify(res));
          resolve({
            response: res,
            request: payload
          });
        })
        .catch(reject);
      
    });
  }

  payout(data){
    //Procedimiento del pago:
    // 1- Se buscan usuario y cuenta
    // 2- Se comprueba que existan usuario y cuenta
    // 3- Se crea un documento "transaction" y se guarda como pending
    // 4- Se realiza el pago en el servicio 
    // 5- Si todo fue bien se guarda como "processing", sino se guarda como "rejected"
    return new Promise((resolve,reject)=>{
      if(!data) throw App.err.badRequest("Payout data required");
      if(!data.uid) throw App.err.badRequest("uid required");

      let user, account, transaction;
      let service = this.service;
      let error = undefined;
      //Se buscan usuario y cuenta de pago
      findUserAndAccount(data.uid, service)
        .then(res =>{
          user = res.user;
          account = res.account;

          if(!user) throw App.err.notFound("User not found");
          if(!account) throw App.err.notFound("Account for user not found");

          let PayTransaction = App.db.model('tb.pay-transactions');
          transaction = new PayTransaction({ 
            direction: "out",
            service: service,
            uid: user ? user._id: undefined,
            paid: account? account._id: undefined,
            originalRequest: data,
            amount: data.amount,
            currency: data.currency,
            description: data.description,
            status: "pending"
          });
          return transaction.save();
        })
        .then(doc =>{
          
          //Comentado para que el estado sea tratado por el servicio
          // if(account.status != "approved") throw App.err.notAcceptable("Account is not approved");

          return this.adapter.payout({account: account, payout: doc})
            .then(res =>{
              doc.originalResponse = res.response;
              doc.sTransId = res.payoutId;
              doc.status = "processing";
              if(res.data) doc.data = res.data; //se le asignan los datos específicos del servicio
            })
            .catch(ret =>{
              error = ret.error;
              doc.originalResponse = ret.response;
              doc.status = "rejected";
              if(ret.data) doc.data = ret.data; //se le asignan los datos específicos del servicio
            })
            .then(res => {return doc.save()});
        })
        .then(doc =>{
          // if(!error)
            resolve(doc)
          // else{
          //   reject(error);
          // }
        })
        .catch(reject);
     
    });
  }


  echo(){
    return new Promise((resolve,reject)=>{
  
      this.adapter.echo()   
        .then(res =>{
          log.debug("echo -" + JSON.stringify(res));
          resolve(res);
        })
        .catch(reject)
  
    });
  }

  /**
   * Setup del módulo. Debe ser llamado antes de crear una instancia
   * @param {Object} _app Objeto App del servidor
   * @return {Promise} Una promesa
   */
  static setup(app){
    return new Promise((resolve,reject)=>{
      App = app;
      log = App.log.child({module:'pay'});

      log.debug("iniciando Módulo Pay");

      loadConfigOptions()
        .then(setupExports)
        .then(res => require("./routes")(app))
        .then(resolve)
        .catch(reject);
    });
  }


  /**
   * Inicializa los modelos del módulo
   * @return {Promise} Una promesa
   */
  static  init(){
    return new Promise( (resolve, reject) => {
      App.db.setModel('tb.pay-transactions',rscPath + '/tb.pay-transactions');
      App.db.setModel('tb.pay-accounts',rscPath + '/tb.pay-accounts');
      App.db.setModel('tb.pay-webhook-logs',rscPath + '/tb.pay-webhook-logs');
      resolve();
    });
  }


   /**
   * Obtiene un gestor de pagos ya configurado para un servicio indicado tomando la configuración del servidor
   * @param  {String} service      El servicio para el que se quiere crear el gestor
   * @return {Promise<Object>} Una promesa con el gestor
   */
  static forService(service){
    return new Promise((resolve, reject) => {

      if (!App)
        throw new Error('setup() needs to be called first');

      if (!service)
        throw new Error('a service must be provided');

      //Se busca un cliente ya creado para el servicio indicado y si no hay se instancia uno nuevo y se almacena en el objeto de clientes creados
      let client = loadedClients[service];
      if(!client){
        loadServiceAdapter(service)
          .then(adapter =>{
            let config = getServiceConfig(service);
            let newClient =  new Client(service,config,adapter);
            loadedClients[service] = newClient;
            resolve(newClient);
          })
          .catch(reject);
      }else{
        resolve(client);
      }
      
    });
  }


  static confirm(service, data){
    return Client.forService(service)
      .then(client => client.confirm(data));
  }

  static registrationLink(service, uid, redirectUrl, login){
    return Client.forService(service)
      .then(client => client.createRegistrationLink(uid, redirectUrl, login));
  }

  static payout(service, data){
    return Client.forService(service)
      .then(client => client.payout(data));
  }


  static echo(service){
    return Client.forService(service)
      .then(client => client.echo());
  }

  /**
   * INFO: Esta funcion se hizo estática para que se le pueda poner un hook de la manera "App.pay.post()" sino seria "App.pay.prototype.post()"
   * Prepara la información para solicitar la creación de un link de registro/login
   * @param  {[type]} data      [description]
   * @param  {[type]} data.service   [description]
   * @param  {[type]} data.user      [description]
   * @param  {[type]} data.account   [description]
   * @param  {[type]} data.forLogin  [description]
   * @return {[type]}           [description]
   */
  static prepareRequestLinkPayload(data){
    // let mobile = data.user.tel && data.user.tel.id ? "+"+data.user.tel.id : undefined;
    // log.debug("Request link payload "+ mobile);
    return new Promise((resolve,reject)=>{
      var payload = {
        uid: data.user._id, 
        payee:{
          type: "INDIVIDUAL",
          contact: {
            firstName: data.user.name
            // email: data.user.email ? data.user.email.login : undefined,
            // mobile: data.user.tel && data.user.tel.id ? "+"+data.user.tel.id : undefined 
          }
        }
      }
      if(data.user.email) payload.payee.contact.email = data.user.email.login;
      if(data.user.tel && data.user.tel.id) payload.payee.contact.mobile =  "+"+data.user.tel.id;
      if(data.data.redirectUrl) payload.redirectUrl = data.data.redirectUrl;
      if(data.data.redirectTime) payload.redirectTime = data.data.redirectTime;
      resolve(payload);
    });
  }

  /*
    Función a la que se le puede añadir un hook para enterarse de que un documento transaction fué modificado
    Para añadir hook "App.pay.post("transactionUpdated", function(doc){})"
   */
  static transactionUpdated(doc){
    return new Promise((resolve, reject) => {
      log.debug("transaction updated " + JSON.stringify(doc) );
      resolve();
    });
  }
  /**
   * Metodo que permite llamar a cualquier otro metodo del modulo comprobando con aterioridad si el usuario tiene permisos para acceder a este.
   * @param {ctx} CTX Contexto donde se indicará el resource y el method a ejecutar
   * @param {Object} CTX.client Aplicación cliente sobre la que se realizará la acción
   * @return {Promise<Object>} Promesa con el resultado del metodo llamado
  */
  // static do(ctx){
  //   return new Promise((resolve,reject) => {
  //     var service  = ctx.resource || _defaultService;
  //     App.acl.checkActions(ctx, ctx.model, ctx.method)
  //       .then(() => {
  //         //Hace la llamada al método correspondiente
  //         return this[ctx.method](ctx.client,ctx.payload); 
  //       })
  //       .then(resolve)
  //       .catch(reject);
  //   });
  // },
}


// function loadServiceConfig(service){
//   return new Promise((resolve, reject) =>{
//     if(payOptions[service]){
//       resolve(payOptions[service]);
//     }else{
//       reject(new Error(service + ' options not configured'));
//     }
//   });
// }

function getServiceConfig(service){
  if(payOptions[service]){
    return payOptions[service];
  }else{
    throw new Error(service + ' options not configured');
  }
}

function loadServiceAdapter(service){
  return new Promise((resolve, reject) => {
    //Primero se mapea el servicio indicado con le nombre del módulo a cargar
    var moduleName = undefined;
    if(service){
      switch (service) {
        case "payoneer":
          moduleName = "tb-pay-payoneer";
          break;
        default:
          // statements_def
          break;
      }
    }

    if(moduleName){
      // resolve({})
      var adapter = require(moduleName);
      resolve(adapter);
    }else{
      reject("Module not found for service " + service);
    }
  });
}

// function getProgram(service, id){
//   let config = getServiceConfig(service);
//   let program = undefined;
//   if(config && config.programs){
//     program = config.programs[0];

//     config.programs.forEach(p =>{
//       if(p.id == id){
//         program = p;
//       }
//     });

//     return program;
//   }
// }

function setupExports(){
  return new Promise((resolve, reject) => {
    let utils = require("./lib/utils");

    Client.serviceList           = utils.serviceList;
    Client.accountStatusList     = utils.accountStatusList;
    Client.transactionStatusList = utils.transactionStatusList;

    exportPayoneerCurrencies();
    resolve();
      // .then(resolve)
      // .catch(reject);
  });
}

function exportPayoneerCurrencies(){
  // return new Promise((resolve, reject) => {
    let config = getServiceConfig("payoneer");
    if(config && config.programs && config.programs.length){
      Client.payoneer = {currencies:  Object.freeze(config.programs.map( e => e.currency ))};
    }else{
      log.warn("Payoneer programs not configured");
    }
    // resolve();
    // loadServiceConfig("payoneer")
    //   .then(payoneerConfig => {
    //     if(payoneerConfig.programs){
    //       Client.payoneer = {currencies:  Object.freeze(payoneerConfig.programs.map( e => e.currency ))};
    //     }else{
    //       log.info("payoneer programs not configured");
    //     }
    //     resolve();
    //   })
    //   .catch(reject);
  // });
}

function loadConfigOptions(){
  return new Promise((resolve, reject) => {
    if(!payOptions){
      let Config = App.db.model('tb.configs');
      Config.findById(moduleConfigId)
       .then( options => { 
        if(!options){
          reject(new Error(moduleConfigId +' not configured'));
        }else{
          payOptions = options.toJSON();
          resolve(options);
        }
      })
   }else{
    resolve(payOptions);
   }
  });
}

function findUserAndAccount(uid, service){
  return new Promise((resolve, reject) => {
    Promise.all([
        App.db.model('users').findById(uid),
        App.db.model('tb.pay-accounts').findOne({uid: uid, service: service})
      ])
      .then(res =>{
        resolve({user: res[0], account: res[1]})
      })
      .catch(reject);
  });
}

//Esto añade los hooks a las funciones de la clase, es decir, a las estáticas
Client.hooks = {prepareRequestLinkPayload:"promise", transactionUpdated:"promise"};
Client.pre = hook.pre;
Client.post = hook.post;

//Esto añade los hooks a las funcines de las instancias de la clase.
// Client.prototype.hooks = {prepareRequestLinkPayload: "promise"};
// Client.prototype.pre = hook.pre;
// Client.prototype.post = hook.post;

module.exports = Client;

//EJEMPLO de llamada a pre hook. Tiene que hacer un parámetro más que la función a la que se le aplica el hook. Dicho parámetro extra es la función next que hay que llamar
// Client.pre("echo", function(service, next){
//   console.log("echo pre hook called for service " + service);
//   next();
// });

// Client.post("echo", function(service, res,  next){
//   console.log("echo post hook called for service " + service);
//   console.log("echo post hook res" + JSON.stringify(res));

//   next();
// });


// Client.prototype.post("prepareRegistrationLinkPayload", function(data, res,  next){
//   console.log("prepareRegistrationLinkPayload post hook data" + JSON.stringify(data));
//   console.log("prepareRegistrationLinkPayload post hook res" + JSON.stringify(res));
//   // res.payee = {type: "INDIVIDUAL"};
//   // res.payee.contact = {firstName: data.user.name};
//   next(res);
// });


