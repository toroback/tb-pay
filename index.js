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


/**
 * Clase que representa un gestor de pagos
 * @memberOf module:tb-pay
 */
class Client {

  /**
   * Crea un gestor de pagos. Utilizar los modulos tb-pay-payoneer, etc…
   * @param  {Object} options               Objeto con las credenciales para el servicio.
   * @param  {Object} Adapter        Adapter del servicio que se va a utilizar. 
   */
  constructor(options, Adapter) {
    this.options = options || {};
    this.adapter = new Adapter(this);
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

      require("./routes")(app);
    
      resolve();

    });
  }


  /**
   * Inicializa los modelos del módulo
   * @return {Promise} Una promesa
   */
  static  init(){
    return new Promise( (resolve, reject) => {
      // App.db.setModel('tb.payments-transaction',rscPath + '/tb.payments-transaction');
      // App.db.setModel('tb.payments-register',rscPath + '/tb.payments-register');
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
          resolve( new Client(config,adapter));
        })
        .catch(reject);
      
    });
  }

  
}


function loadServiceConfig(service){
  return new Promise((resolve, reject) =>{
    let Config = App.db.model('tb.configs');
    Config.findById(moduleConfigId)
     .then( payOptions => { 
        if(!pushOptions){
          reject(new Error(moduleConfigId +' not configured'));
        }else{
          if(pushOptions[service]){
            resolve(pushOptions[service]);
          }else{
            reject(new Error(service + ' options not configured'));
          }
        }
     })
    .catch(reject);
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
      var adapter = require(moduleName);
      resolve(adapter);
    }else{
      reject("Module not found for service " + service);
    }
  });
}

module.exports = Client;



