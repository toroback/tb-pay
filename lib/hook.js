/*creará un objeto _hooksObj
  {
    methodName :{

      pre:[],
      fn:function,
      post:[]
    }
  }

*/

/****
USO:
se declara en el módulo la variable hook
  var hook = require("./hook");
objeto que se le quiera agregar las opciones hook se le asignará las siguientes propiedades
  hooks: {miFuncion:"promise",miFuncion3:"promise"},
  pre: hook.pre,
  post: hook.post,


var miLib = require("./module_test");
miLib.pre('miFuncion', function(par1, par2, ..., next){
  next(); o next(par1, par2) para modificar su valor
  //throw new Error("Invalid") o next(new Error("Invalid en blabla")); para generar algun error
  return result, termina todo y devuelve result
}

miLib.pre(....

miLib.post('miFuncion', function(par1, par2, ..., result, next){
  //next() con parametros sustituye results sin parametros deja el resultado igual
  //return valor, termina toda la secuencia de post y devuelve el resultado valor
  //throw new Error("Invalid") o next(new Error("Invalid en blabla")); para generar algun error

}
miLib.post(...


****/

function pre(name, cb){
  if(this.hooks[name]){
    //console.log(name);
    this._hooksObj = this._hooksObj ? this._hooksObj: {};
    if (this._hooksObj[name]==null){
      this._hooksObj[name] = this._hooksObj[name] ? this._hooksObj[name]: {};
      this._hooksObj[name].fn = this[name];
      this._hooksObj[name].pre =[cb];
      this._hooksObj[name].post =[];
      this._hooksObj[name].that = this;
      this[name] = function(){

        //Asignamos los arrgumentos a la funcion original
        // TODO: optimizar el pase de argumentos
        var arrArg=[];
        for (var i = 0; i < arguments.length ; i++) {
          arrArg[i] = arguments[i];
        };
        //Asignamos la funcion correspondiente a next al ultimo argumento
        arrArg[arguments.length] = this._hooksObj[name];

        return hook.apply(this, arrArg);
        //return hook("nombre", "edad", this._hooksObj[name].fn) 
      }
    } else this._hooksObj[name].pre.push(cb);



  }else{
    //console.log("errror no");
    return new Error("no hook for this method");
  }

}

function post(name, cb){
  //console.log("ok");
  if(this.hooks[name]){
    //console.log(name);
    this._hooksObj = this._hooksObj ? this._hooksObj: {};
    if (this._hooksObj[name]==null){
      this._hooksObj[name] = this._hooksObj[name] ? this._hooksObj[name]: {};
      this._hooksObj[name].fn = this[name];
      this._hooksObj[name].pre =[];
      this._hooksObj[name].post =[cb];
      this._hooksObj[name].that = this;
      this[name] = function(){

        //Asignamos los arrgumentos a la funcion original
        // TODO: optimizar el pase de argumentos
        var arrArg=[];
        for (var i = 0; i < arguments.length ; i++) {
          arrArg[i] = arguments[i];
        };
        //Asignamos la funcion correspondiente a next al ultimo argumento
        arrArg[arguments.length] = this._hooksObj[name];

        return hook.apply(this, arrArg);
        //return hook("nombre", "edad", this._hooksObj[name].fn) 
      }
    } else this._hooksObj[name].post.push(cb);

  }else{
    //console.log("errror no");
    return new Error("no hook for this method");
  }  
}

function hook(){
  var argumentos = arguments;
  var prePos = 0;
  var postPos = 0;
  var reto;

  //console.log("-en hook----")  
  var hookObj = arguments[arguments.length -1];
  var preObject = hookObj.pre;
  var postObject = hookObj.post;
  var arrArg=[];
  for (var i = 0; i < arguments.length - 1 ; i++) {
    arrArg[i] = arguments[i];
  };
  arrArg.push(nextPre);


  //Ejecuta el ciclo de Pre
  //TODO: llevar el manejo de Pre de la misma forma en que se realiza en Post
  function nextPre(){

    reto = false; 
    //Si llega un error retornamos el reject
    if (arguments[0] instanceof Error) {
      reto = arguments[0];
      //return reto;
    }else{
      //Si llegan argumentos, se asignan los valores correspondientes
      if (arguments.length > 0 ){
        //Hacemos esta validacion por la 1era llamada que llegan todos los parametros
        var tot = arguments.length >= argumentos.length  ? argumentos.length -1 : arguments.length;
        for (var i = 0; i < tot; i++) {
          argumentos[i] =  (arguments[i] == null) ? argumentos[i] : arguments[i];
        };      
      }

      if (prePos < preObject.length  ) { //Validar segun los pres que tenga cargado
        //Asignamos los arrgumentos a la funcion pre
        var arrArg=[];
        for (var i = 0; i < argumentos.length - 1; i++) {
          arrArg[i] = argumentos[i];
        };
        //Asignamos la funcion correspondiente a next al ultimo argumento
        arrArg[argumentos.length - 1] = nextPre 
        //se hace la llamada a la funcion pre
        reto = new Error("Error missing next");
        var ret =preObject[prePos++].apply(this, arrArg); 
        //Si el pre devuelve algo resolvemos con la respuesta
        if (ret) reto = Promise.resolve(ret); 
      }  
    }
    if (reto instanceof Error) reto = Promise.reject(reto);
    return reto;
  }



  return new Promise(function(resolve, reject){

    var ret = nextPre.apply(this, arrArg); //Se inicia el ciclo de llamadas a pre
    if (ret) ret.then(resolve, reject); //Se ejecutarán todos los Pre hasta que haya un error o un retorno de valor
    else {
      //si todo ok en los Pre se ejectuta la funcion principal
      hookObj.fn.apply(hookObj.that, argumentos).then(function(result){
        //Se inicia el ciclo de hooks post
        argumentos[argumentos.length-1] = result;
        argumentos[argumentos.length] = function(){};   
        argumentos.length++;
        var it = new iterator(argumentos, hookObj.post)
        argumentos[argumentos.length-1] = it.next;  
        resolve(it.next());
      }).catch(reject);           
    }
  })
}
/*
// TODO: este va ser el iterator para los Pre luego intentaremos factorizar con el de Post.
// El principal problema es que post recibe tambien results
function iteratorPre(initParm, arrFunction){
  var that = this;
  this.nextIndex = 0;
  this.initParm = initParm;
  this.arrFunction = arrFunction;
  
  this.next = function(){
    if (arguments[0] instanceof Error) {
      throw(arguments[0]);
    }else{
      //if(arguments[0])that.initParm[that.initParm.length-2] = arguments[0];

      var ret = "";
      if (that.nextIndex < that.arrFunction.length){
        ret =  that.initParm[that.initParm.length-2];
        var tt = that.arrFunction[that.nextIndex++].apply(this,that.initParm)
        if(tt) that.initParm[that.initParm.length-2] = tt;
        ret =  that.initParm[that.initParm.length-2];
        return ret;
      } else {
        return that.initParm[that.initParm.length-2];
      }
    }
  }
}
*/
// TODO: falta factorizar un poco mas  sobre todo el cambio den initParm, documentar y verificar el caso de return vacio
function iterator(initParm, arrFunction){
  var that = this;
  this.nextIndex = 0;
  this.initParm = initParm;
  this.arrFunction = arrFunction;
  
  this.next = function(){
    if (arguments[0] instanceof Error) {
      throw(arguments[0]);
    }else{
      if(arguments[0])that.initParm[that.initParm.length-2] = arguments[0];

      var ret = "";
      if (that.nextIndex < that.arrFunction.length){
        ret =  that.initParm[that.initParm.length-2];
        var tt = that.arrFunction[that.nextIndex++].apply(this,that.initParm)
        if(tt) that.initParm[that.initParm.length-2] = tt;
        ret =  that.initParm[that.initParm.length-2];
        return ret;
      } else {
        return that.initParm[that.initParm.length-2];
      }
    }
  }
}


///---fin funcion hook
module.exports.pre = pre;
module.exports.post = post;

