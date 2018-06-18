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
          ret.ref = res.ref;
          let docData = res.data;
          if(res.ref == "account"){
            let uid = docData.uid;
            ret.uid = uid;
            
            let PayAccount = App.db.model('tb.pay-accounts');
            PayAccount.findOne({uid: uid, service: service}, (err,account) =>{
              if(err) reject(err);

              if(!account) account = new PayAccount({service: service, uid: uid, status: "pending"});
              
              account.status = docData.status;
              account.sUserId = docData.sUserId;
              account.originalResponse = data;
              account.save()
                .then(doc => { 
                  ret.rid = doc._id;
                  resolve(ret);
                })
                .catch(err => { 
                  ret.err = err; 
                  reject(ret);
                })
                // .then(res =>{ resolve(ret); });
             });

          }else if(res.ref == "transaction"){

            let uid = docData.uid;
            ret.uid = uid;

            App.db.model('tb.pay-transactions').findOne({_id: docData.paymentId, service: service}, (err,transaction) =>{
              if(err) reject(err);

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
            });
          }
        })
        .catch(err => { 
          ret.err = err; 
          reject(ret);
        })
        // .then(res =>{ resolve(ret); });
        
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
        Promise.all([
          loadServiceAdapter(service),
          loadServiceConfig(service)
          ])
          .then( resp =>{
            let adapter = resp[0];
            let config = resp[1];
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


function loadServiceConfig(service){
  return new Promise((resolve, reject) =>{
    if(payOptions[service]){
      resolve(payOptions[service]);
    }else{
      reject(new Error(service + ' options not configured'));
    }
  });
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

function setupExports(){
  return new Promise((resolve, reject) => {
    let utils = require("./lib/utils");

    Client.serviceList           = utils.serviceList;
    Client.accountStatusList     = utils.accountStatusList;
    Client.transactionStatusList = utils.transactionStatusList;

    exportPayoneerCurrencies()
      .then(resolve)
      .catch(reject);
  });
}

function exportPayoneerCurrencies(){
  return new Promise((resolve, reject) => {
    loadServiceConfig("payoneer")
      .then(payoneerConfig => {
        if(payoneerConfig.programs){
          Client.payoneer = {currencies:  Object.freeze(payoneerConfig.programs.map( e => e.currency ))};
        }else{
          log.info("payoneer programs not configured");
        }
        resolve();
      })
      .catch(reject);
  });
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

// function processWebhook(service, data){
//   return new Promise((resolve, reject) => {
//     let ret = {}
//     adapter.processWebhook(data)
//       .then(res =>{
//         ret.ref = res.ref;
//         var docData = res.data;
//         if(res.ref == "account"){
//           let uid = docData.uid;
//           ret.uid = uid;
//           let PayAccount = App.db.model('tb.pay-accounts');
//           PayAccount.findOne({uid: uid, service: service}, (err,account) =>{
//             if(!account){
//               account = new PayAccount({service: service, uid: uid, status: "pending"});
//             }
//             account.status = docData.status;
//             account.sUserId = docData.sUserId;
//             account.originalResponse = data;
//             account.save()
//               .then(doc => { 
//                 ret.rid = doc._id;
//                 throw new Error("Testing error");
//               })
//               .catch(err => { 
//                 ret.err = err;
//                 // return Promise.resolve();
//               })
//               .then(res =>{
//                 resolve(ret);
//               });
//            });


//         }else if(res.ref == "transaction"){

//         }
//       });
//   });
//   // return new Promise((resolve, reject) => {
//   //   if(service == 'payoneer'){
//   //     processPayoneerWebhook(data)
//   //       .then(resolve)
//   //       .catch(reject);
//   //   }else{
//   //     reject('Invalid service '+service)
//   //   }
//   // });
// }

// function processPayoneerWebhook(data){
//   return new Promise((resolve, reject) => {
//     console.log("processPayoneerWebhook DATA" + JSON.stringify(data));

//     let ref = undefined;
//     let rid = undefined;
//     let uid = data.payeeid;

//     let promise = undefined;
//     if(data.APPROVED || data.DECLINE){
//       ref = "account";
      
//       promise = processPayoneerAccountWebhook(data);


//     }else if(data.PAYMENT){
//       ref = "transaction";
//     }else if(data.LOADCC){
//       ref = "transaction";
//     }else if(data.LOADiACH){
//       ref = "transaction";
//     }else if(data.PaperCheck){
//       ref = "transaction";
//     }else if(data.CancelPayment){
//       ref = "transaction";
//     }else{
//       throw new Error("Unknown webhook type");
//     }
    
//     if(promise){
//       promise.then(resolve).catch(reject);
//     }else{
//       resolve({});  
//     }
    
//   });
// }

// function processPayoneerAccountWebhook(data){
//   return new Promise((resolve, reject) => {
//     let ref = "account";
//     let rid = undefined;
//     let uid = data.payeeid; 

//     let PayAccount = App.db.model('tb.pay-accounts');
//     PayAccount.findOne({uid: uid, service: "payoneer"}, (err,account) =>{
//       if(!account){
//         account = new PayAccount({service: "payoneer", uid: uid, status: "pending"});
//       }
//       account.status = data.APPROVED ? "approved" : "rejected";
//       account.originalResponse = data;
//       account.sUserId = data.Payoneerid;
//       account.save()
//         .then(doc => {
//           rid = doc._id;
//         })
//         .catch(err => {
//            log.info("catch err" + err)
//           return Promise.resolve()
//         })
//         .then(res =>{
//           log.info("2º then")
//           resolve({ref: ref, uid: uid, rid: rid})
//         });
//     });
//   });
// }

module.exports = Client;



