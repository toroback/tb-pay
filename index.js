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
    // this.adapter = new Adapter(this);
  }


  confirm(data){
    return new Promise((resolve,reject)=>{
      let WebhookLog = App.db.model('tb.pay-webhook-logs');
      let webhookLog = new WebhookLog({service: this.service, data: data});
      webhookLog.save()
        .then(resolve)
        .catch(reject);

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

      service = service || "payoneer";

      Promise.all([
        loadServiceAdapter(service),
        loadServiceConfig(service)
        ])
        .then( (adapter, config) =>{
          resolve( new Client(service,config,adapter));
        })
        .catch(reject);
      
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
      resolve({});
      // var adapter = require(moduleName);
      // resolve(adapter);
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
  });
}
module.exports = Client;



