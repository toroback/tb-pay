# tb-pay

Módulo que ofrece servicios de pagos. Para ello utiliza servicios de terceros ofrecidos a través de distintos módulos. 

## **Instalación:**
  
Para utilizar los servicios de pago es necesario tener instalada la librería **tb-pay** junto con la librería del servicio que se vaya a utilizar, como por ejemplo **tb-pay-payoneer**, y tener una cuenta creada para dicho servicio.

Además es importante inicializar la librería en el archivo "boot.js" dentro de app para que estén disponibles los distintos modelos que ofrece el módulo. Para ello incluir la siguiente linea de código dentro de la función Boot:

```javscript
App.pay.init();
```

## **Configuración del servicio:**

### **- Servicios disponibles:**
Para poder utilizar un servicio se utilizarán los identificadores de cada uno de ellos.

Los servicios disponibles para pagos son:

- **Payonner**
  + Nombre de módulo: [**tb-pay-payoneer**](https://github.com/toroback/tb-pay-payoneer)
  + Identificador: "payoneer"
  + [Página web](https://www.payoneer.com/)


Los servicios disponibles para cobros son:

- **Stripe**
  + Nombre de módulo: [**tb-pay-stripe**](https://github.com/toroback/tb-pay-stripe)
  + Identificador: "stripe"
  + [Página web](https://www.stripe.com/)

### **- Configuración desde interfaz administrativa:** 

Por el momento la opción de configuración a través de la interfaz de administración no está disponible.

### **- Configuración manual:**

La configuración manual se realiza sobre una colección en la base de datos llamada "tb.configs".

Para ello hay que añadir un nuevo documento cuyo id sea el "payOptions" (Ej. "\_id":"payOptions"). Dicho documento debe tener un objeto para cada uno de los servicios que se quiera configurar cuya clave sea el identificador del servicio. 

#### **- Configuración del servicio Payoneer:**

Para configurar Payoneer se requerirán los siguientes campos:

| Clave | Tipo | Opcional   | Descripción |
|---|---|:---:|---|
|url|String||Url base del api del servicio|
|username|String||Usuario del servicio|
|password|String||Contraseña de acceso al servicio|
|programs|Array||Array con los distintos programas configurados para el servicio|
|programs.id|String||Identificador en el servicio para el programa|
|programs.currency|String||Moneda configurada para el programa. ISO-4217 (alpha 3 currency)|

Un ejemplo de configuración del servicio *Payoneer* sería el siguiente:

```
{
    "_id" : "payOptions",
    "payoneer" : {
        "url" : "https://api.sandbox.payoneer.com/v2/programs",
        "username" : <myServiceUsername>,
        "password" : <myServicePassword>,
        "programs" : [ 
            {
                "id" : "100094XXX",
                "currency" : "USD"
            }
        ]
    }
}
```

#### **- Configuración del servicio Stripe:**

Para configurar Stripe se requerirán los siguientes campos:

| Clave | Tipo | Opcional   | Descripción |
|---|---|:---:|---|
|apiKey|String||Apikey privada proporcionada por el servicio|

Un ejemplo de configuración del servicio *Payoneer* sería el siguiente:

```
{
    "_id" : "payOptions",
    "stripe" : {
        "apiKey" : <myPrivateApiKey>
    }
}
```

## **Funcionalidades**

### **- Obtener de link de registro/login:**

Disponible para los servicios: Payoneer

#### **• REST Api:**

**Petición:**

|HTTP Method|URL|
|:---:|:---|
|GET| `https://[domain]:[port]/api/v[apiVersion]/srv/pay/registrationlink/:service/:uid?login=<forLogin>`|

**Parámetros en la ruta:**

| Clave | Tipo | Opcional   | Descripción  |
|---|---|:---:|---|
|service|String||Servicio de pago a utilizar (valores: payoneer)|
|uid|String||Id del usuario para el que se va a pedir el link|

**Parámetros del query:**

| Clave | Tipo | Opcional   | Descripción  |
|---|---|:---:|---|
|login|boolean|X|`true` para indicar que el link será para realizar login. Por defecto es `false`|
|redirectUrl|String|X|Url de redirección tras registrarse en el servicio|
|redirectTime|Number|X|Tiempo entre que se realiza el registro y el redirect. En segundos. Default es 10 segundos|

**Respuesta:**

| Clave | Tipo | Opcional | Descripción |
|---|---|:---:|---|
|url|String||La url solicidata|

**Ejemplo:**

GET: `https://a2server.a2system.net:1234/api/v1/srv/pay/registrationlink/payoneer/58ad3fe33e13466beefe91e2?login=false&redirectUrl=www.google.com`

* RESPUESTA: 

```javascript
  {
    "url": "https://payouts.sandbox.payoneer.com/partners/lp.aspx?token=6b8d1e788973496239438e81aee28ea4329DCC0A38"
  }
```

#### **• Código Javascript:**

**Parámetros:**

| Clave | Tipo | Opcional   | Descripción  |
|---|---|:---:|---|
|service|String||Identificador del servicio a utilizar (Ej: "payoneer")|
|uid|String||Identificador del usuario para el que se pedirá el link| 
|forLogin|Boolean||Flag que indica si el link será pedido para realizar login o registro. Por defecto es `false`|
|redirectUrl|String|X|Url de redirección tras registrarse en el servicio|
|redirectTime|Number|X|Tiempo entre que se realiza el registro y el redirect. En segundos. Default es 10 segundos|

**Respuesta:**

| Clave | Tipo | Opcional | Descripción |
|---|---|:---:|---|
|url|String||La url solicidata|

**Ejemplo:**

```javascript
var service = "payoneer";

var forLogin = true; //Se pide link para login. false si se quiere para registro
var uid = <myUserId> //Identificador del usuario para el que se pide el link

//Datos opcionales 
let data = {
  redirectUrl: <myRedirectUrl>,
  redirectTime: <myRedirectTimeInSeconds>
}

//Opcion 1 : obteniendo un objeto cliente para el servicio.
App.pay.forService(service)
  .then(client => client.createRegistrationLink(uid, data, forLogin));
  .then(resp => console.log(resp))
  .catch(err => console.log(err));

//Opcion 2 : Sin obtener instancia del cliente del servicio. (Se instancia internamente)
App.pay.createRegistrationLink(service, uid, data, forLogin)
  .then(resp => console.log(resp))
  .catch(err => console.log(err));
```

**Ejemplo Respuesta:**

```
{
  "url": "https://payouts.sandbox.payoneer.com/partners/lp.aspx?token=6b8d1e788973496239438e81aee28ea4329DCC0A38"
}
```

#### **• Modificacion de parámetros:**

Al solicitar el link de registro/login se puede pasar información adicional para que aparezca autocompletada en la página web. Para ello se puede configurar un hook para modificar los parámetros que se enviarán en la consulta al servicio.

Ver sección *Hooks -> Modificacion de parámetros de petición de enlace de registro*

### **- Realizar un pago:**

Disponible para los servicios: Payoneer

#### **• REST Api:**

No disponible.

#### **• Código Javascript:**

**Parámetros:**

| Clave | Tipo | Opcional   | Descripción  |
|---|---|:---:|---|
|service|String||Identificador del servicio a utilizar (Ej: "payoneer")|
|data|Object||Información del pago que se va a realizar|
|data.uid|String||Identificador del usuario al que se le realizará el pago| 
|data.amount|String||Cantidad que se va a pagar|
|data.description|String|X|Descripción del pago|
|data.currency|String||Moneda en la que se realiza el pago. ISO-4217 (alpha 3 currency)|

**Respuesta:**

| Clave | Tipo | Opcional | Descripción |
|---|---|:---:|---|
|transaction|tb.pay-transactions||Objeto con la información de la transacción|

**Ejemplo:**

```javascript
var service = "payoneer";

var data = {
  "amount":"20.00",
  "currency": "USD",
  "description": "Test payout",
  "uid":<theUserId>
}

//Opcion 1 : obteniendo un objeto cliente para el servicio.
App.pay.forService(service)
  .then(client => client.payout(data));
  .then(resp => console.log(resp))
  .catch(err => console.log(err));

//Opcion 2 : Sin obtener instancia del cliente del servicio. (Se instancia internamente)
App.pay.payout(service, data)
  .then(resp => console.log(resp))
  .catch(err => console.log(err));
```

### **- Realizar un cobro:**

Disponible para los servicios: Stripe

Charge a user (tb.pay-transactions: in), from a stored account or with a token

#### **• REST Api:**

|HTTP Method|URL|
|:---:|:---|
|POST| `https://[domain]:[port]/api/v[apiVersion]/srv/pay/charge/:service`|

**Parámetros en la ruta:**

| Clave | Tipo | Opcional   | Descripción  |
|---|---|:---:|---|
|service|String||Servicio de pago para realizar el cobro (valores: stripe)|

**Parámetros del body:**

| Clave | Tipo | Opcional   | Descripción  |
|---|---|:---:|---|
|uid|String||toroback user _id|
|amount|Number||amount to charge. Para ver la cantidad minima ver la documentacion: `https://stripe.com/docs/currencies#minimum-and-maximum-charge-amounts`|
|currency|String||currency of amount. ISO|
|paid|String|X|tb.pay-account _id (required if token is undefined)|
|token|String|X|token representing a temporary account. depends on service (required if paid is undefined)|
|store|Bool|X|store token as a new account for this user. needs token. default: false|
|description|String|X|description for this charge. shown to user in receipt|
|statementDescription|String|X|description for this charge. shown to user in credit card statement. max: 22 characters (on stripe)|

**Respuesta:**

| Clave | Tipo | Opcional | Descripción |
|---|---|:---:|---|
|transaction|tb.pay-transactions||Objeto con la información de la transacción|

##### **- Ejemplo REST 1: Cobro con token sin creación de cuenta**

POST: `https://a2server.a2system.net:1234/api/v1/srv/pay/charge/stripe`

Body:

```js
{
  "uid": "59c43f31aeXX437956fffX2e",
  "amount": 0.39,
  "currency": "USD",
  "token": "tok_1CqjooG5RtxSooBrAUdVWn0K",
  "store": false, //False para no crear cuenta
  "description": "My receipt description",
  "statementDescription": "My card statement description"
}
```

##### **- Ejemplo REST 2: Cobro con token con creación de cuenta**

POST: `https://a2server.a2system.net:1234/api/v1/srv/pay/charge/stripe`

Body:

```js
{
  "uid": "59c43f31aeXX437956fffX2e",
  "amount": 0.39,
  "currency": "USD",
  "token": "tok_1CqjooG5RtxSooBrAUdVWn0K",
  "store": true, //True para crear cuenta
  "description": "My receipt description",
  "statementDescription": "My card statement description"
}
```

##### **- Ejemplo REST 3: Cobro a cuenta**

POST: `https://a2server.a2system.net:1234/api/v1/srv/pay/charge/stripe`

Body:

```js
{
  "uid": "59c43f31aeXX437956fffX2e",
  "amount": 0.39,
  "currency": "USD",
  "paid":"5b54a20af7bde109c8c0e0e2",
  "description": "My receipt description",
  "statementDescription": "My card statement description"
}
```

#### **• Código Javascript:**

**Parámetros:**

| Clave | Tipo | Opcional   | Descripción  |
|---|---|:---:|---|
|service|String||Identificador del servicio a utilizar (Ej: "stripe")|
|data|Object||Información del cobro que se va a realizar|
|data.uid|String||toroback user _id|
|data.amount|Number||amount to charge. Para ver la cantidad minima ver la documentacion: `https://stripe.com/docs/currencies#minimum-and-maximum-charge-amounts`|
|data.currency|String||currency of amount. ISO|
|data.paid|String|X|tb.pay-account _id (required if token is undefined)|
|data.token|String|X|token representing a temporary account. depends on service (required if paid is undefined)|
|data.store|Bool|X|store token as a new account for this user. needs token. default: false|
|data.description|String|X|description for this charge. shown to user in receipt|
|data.statementDescription|String|X|description for this charge. shown to user in credit card statement. max: 22 characters (on stripe)|

**Respuesta:**

| Clave | Tipo | Opcional | Descripción |
|---|---|:---:|---|
|transaction|tb.pay-transactions||Objeto con la información de la transacción|

**Ejemplo:**

```javascript
var service = "stripe";

var data = {
  "uid": "59c43f31aeXX437956fffX2e",
  "amount": 0.39,
  "currency": "USD",
  "token": "tok_1CqjooG5RtxSooBrAUdVWn0K",
  "store": false, //False para no crear cuenta
  "description": "My receipt description",
  "statementDescription": "My card statement description"
}

//Opcion 1 : obteniendo un objeto cliente para el servicio.
App.pay.forService(service)
  .then(client => client.charge(data));
  .then(resp => console.log(resp))
  .catch(err => console.log(err));

//Opcion 2 : Sin obtener instancia del cliente del servicio. (Se instancia internamente)
App.pay.charge(service, data)
  .then(resp => console.log(resp))
  .catch(err => console.log(err));
```

### **- Obtener balance del servicio:**

Disponible para los servicios: Payoneer, Stripe

#### **• REST Api:**

**Petición:**

|HTTP Method|URL|
|:---:|:---|
|GET| `https://[domain]:[port]/api/v[apiVersion]/srv/pay/balance/:service`|

**Parámetros en la ruta:**

| Clave | Tipo | Opcional   | Descripción  |
|---|---|:---:|---|
|service|String||Servicio de pago a utilizar (valores: payoneer, stripe)|

**Parámetros del query:**

| Clave | Tipo | Opcional   | Descripción  |
|---|---|:---:|---|
|programId|String||Solo para Payoneer. Identificador del programa para el que se quiere obtener el balance|

**Respuesta:**

| Clave | Tipo | Opcional | Descripción |
|---|---|:---:|---|
|service|String||Servicio para el que se pidió el balance|
|balance|Object||Objeto con la informacion del balance|
|balance.amount|Number||Cantitad del balance|
|balance.currency|String||Moneda del balance|
|data|Object||Objeto con información específica para cada servicio|

**Ejemplo:**

GET: `https://a2server.a2system.net:1234/api/v1/srv/pay/balance/payoneer?programId=123456789`

* RESPUESTA: 

```javascript
  {
  "data": {
    "audit_id": 42874167,
    "code": 0,
    "description": "Success",
    "balance": 19669.36,
    "currency": "USD",
    "fees_due": 0,
    "programId": "123456789"
  },
  "balance": {
    "amount": 19669.36,
    "currency": "USD"
  },
  "service": "payoneer"
}
```

#### **• Código Javascript:**

**Parámetros:**

| Clave | Tipo | Opcional   | Descripción  |
|---|---|:---:|---|
|service|String||Identificador del servicio a utilizar (Ej: "payoneer")|
|data|Object||Información del pago que se va a realizar|
|data.programId|String||Solo para Payoneer. Identificador del programa para el que se quiere obtener el balance| 

**Respuesta:**

| Clave | Tipo | Opcional | Descripción |
|---|---|:---:|---|
|service|String||Servicio para el que se pidió el balance|
|balance|Object||Objeto con la informacion del balance|
|balance.amount|Number||Cantitad del balance|
|balance.currency|String||Moneda del balance|
|data|Object||Objeto con información específica para cada servicio|


{
  "data": {
    "audit_id": 42875167,
    "code": 0,
    "description": "Success",
    "balance": 19669.36,
    "currency": "USD",
    "fees_due": 0,
    "programId": "100094640"
  },
  "balance": {
    "amount": 19669.36,
    "currency": "USD"
  },
  "service": "payoneer"
}
**Ejemplo:**

```javascript
var service = "payoneer";

var data = {
  "programId":"123456789"
}

//Opcion 1 : obteniendo un objeto cliente para el servicio.
App.pay.forService(service)
  .then(client => client.getBalance(data));
  .then(resp => console.log(resp))
  .catch(err => console.log(err));

//Opcion 2 : Sin obtener instancia del cliente del servicio. (Se instancia internamente)
App.pay.getBalance(service, data)
  .then(resp => console.log(resp))
  .catch(err => console.log(err));
```

* RESPUESTA: 

```javascript
  {
  "data": {
    "audit_id": 42874167,
    "code": 0,
    "description": "Success",
    "balance": 19669.36,
    "currency": "USD",
    "fees_due": 0,
    "programId": "123456789"
  },
  "balance": {
    "amount": 19669.36,
    "currency": "USD"
  },
  "service": "payoneer"
}
```

## **Hooks**

El módulo dispone de algunas funciones a las que se le puede añadir hooks para modificar la información o para conocer que algún documento cambió. 

Para añadir un hook se basta con configurarlo de la siguiente manera, por ejemplo en la función Boot() del archivo `boot.js`:

```
  App.pay.post(theHookedFunction, function(...args){
    //...
    // manejar hook
    //...
  });
```

A continuación se detallarán las distintas funciones a las que se puede añadir un hook.

### **• Modificacion de parámetros de petición de enlace de registro:**

*NOTA:* Hook relacionado con *Funcionalidades -> Obtener de link de registro/login*

Al solicitar el link de registro/login se puede pasar información adicional para que aparezca autocompletada en la página web. Para ello se puede configurar un hook para modificar los parámetros que se enviarán en la consulta al servicio.

Dicho hook se debe realizar a la función `"prepareRequestLinkPayload"` y se puede configurar, por ejemplo, en el momento de inicialización del módulo en el archivo `"boot.js"`, de la siguiente manera:


```
  App.pay.post("prepareRequestLinkPayload", function(data, res,  next){
    //...
    //se modifica el objeto res para añadir/modificar los valores 
    //...
    next(res);
  });
```

Los parámetros que se pueden enviar en la peticion del link son los siguientes:

| Clave | Tipo | Opcional | Descripción |
|---|---|:---:|---|
|uid|String||Identificador del usuario|
|sessionId|String|X|Identificador de la sesión para la petición|
|languageId|Number|X|Id de idioma del landing site. Por ahora ver documentacion del servicio|
|redirectUrl|String|X|Url de redireccionamiento tras registro|
|redirectTime|String|X|Tiempo entre que se realiza el registro y que el usuario es redirigido|
|payoutMethods|Array|X|(Solo para link de registro) Lista de metodos disponibles para el registro. Values: ("PREPAID_CARD", "BANK","PAYPAL" and "PAPER_CHECK")|
|registrationMode|String|X|(Solo para link de registro) “LIMITED” registration mode is supported for accounts that are linked to a local bank account. In this mode, the payee is prompted to fill in minimal details to receive payment. Permitted values: “FULL”, “LIMITED”|
|lockType|String|X|(Solo para link de registro) Enables locking some or all pre-populated fields from being edited by the payee while he completes registration forms Permitted values: “NONE”, “ALL”, “ADDRESS”, “NAMES”, “EMAIL”, “NAME_ADDRESS_EMAIL”, “DATE_OF_BIRTH”, “ALL_NAMES”, “ALL_NAMES_ADDRESS_EMAIL”|
|payee|Object|X|(Solo para link de registro) Objeto con la información del receptor del pago|
|payee.type|String|X|Tipo del receptor (Values: "INDIVIDUAL", "COMPANY")|
|payee.company|Object|X|Objeto con información de compañia si type es "COMPANY"|
|payee.company.legalType|String|X|Type of legal entity Permitted values: “PUBLIC”, “PRIVATE”, “SOLE PROPRIETORSHIP”, “LLC”, “LLP”, “NON PROFIT”|
|payee.company.name|String|X|Nombre de la compañia|
|payee.company.url|String|X|Link al website de la compañia|
|payee.company.incorporatedCountry|String|X|País de la compañia|
|payee.company.incorporatedState|String|X|Estado de la compañia|
|payee.contact|Object|X|Objeto con información de contacto si type es "INDIVIDUAL"|
|payee.contact.firstName|String|X|Nombre del contacto|
|payee.contact.lastName|String|X|Apellido del contacto|
|payee.contact.email|String|X|Email del contacto|
|payee.contact.birthDate|String|X|Fecha de nacimiento del contacto (Formato : YYYY-MM-DD)|
|payee.contact.mobile|String|X|Número de movil del contacto|
|payee.contact.phone|String|X|Telefono fijo del contacto|
|payee.address|Object|X|Dirección de la compañia o del contacto|
|payee.address.country|String|X|Pais|
|payee.address.state|String|X|Estado|
|payee.address.addressLine1|String|X|First address line|
|payee.address.addressLine2|String|X|Second address line|
|payee.address.city|String|X|Ciudad|
|payee.address.zipCode|String|X|Código postal|

**EJEMPLO**

El siguiente ejemplo modifica el nombre y el apellido del contacto y añade una dirección

```
  App.pay.post("prepareRequestLinkPayload", function(data, res,  next){
    res.payee.contact.firstName = usersLoadedFirstName;
    res.payee.contact.lastName = usersLoadedLastName;
    res.payee.address = {
      country: "US",
      state:"NY"
    }
    next(res);
  });
```

### **• Evento de modificación de un objeto tb.pay-transactions:**

Para recibir un evento cada vez que sea actualizado un objeto 'tb.pay-transactions' basta con añadir un hook. 

Dicho hook se debe realizar a la función `transactionUpdated` y se puede configurar, por ejemplo, en el momento de inicialización del módulo en el archivo `"boot.js"`, de la siguiente manera:

```
  App.pay.post("transactionUpdated", function(doc){
    //...
    //Manejar evento de transacción modificada
    //...
  });
```

## **Modelos**

### tb.pay-accounts

Modelo de datos que contiene información sobre una cuenta de pago

| Clave | Tipo | Opcional | Descripción |
|---|---|:---:|---|
|uid|ObjectId||uid Owner user id (a2s.users)|
|service|String||Service type (payoneer, paypal, etc...)|
|originalRequest|Object|X|Original request made by client when creating the account|
|status|String||Account status|
|statusLog|Array||status change logging|
|statusLog.status|String||Account status|
|statusLog.cDate|Date||Account status change timestamp|
|sUserId|String||Service user id (internal reference from <service> service)|
|sAccountId|String||Account id (internal reference from <service> service)|
|originalResponse|Object|X|Original response received by client when creating the account|
|data|Object|X|Specific data from <service> that needs to be kept|
|data.programId|String|X|(SOLO PAYONEER) Program id for service|
|data.type|String|X|(SOLO STRIPE) Transaction account type|
|data.brand|String|X|(SOLO STRIPE) If type is 'card'. Card brand|
|data.country|String|X|(SOLO STRIPE) If type is 'card'. Card country|
|data.endsIn|String|X|(SOLO STRIPE) If type is 'card'. Last 4 digits of Card number |
|data.expires|String|X|(SOLO STRIPE) If type is 'card'. Card expiration (format: "mmdd")|

### tb.pay-transactions

Modelo de datos que contiene información sobre una transacción

| Clave | Tipo | Opcional | Descripción |
|---|---|:---:|---|
|direction|String||Transaction direction: incoming or outgoing|
|service|String||Service type (payoneer, paypal, etc...)|
|uid|ObjectId||User id (a2s.users) owner of this transaction|
|paid|ObjectId||Reference to account (tb.pay-account _id)|
|amount|String||Amount to transfer|
|currency|String||ISO-4217 (alpha 3 currency)|
|description|String|X|Some optional description|
|originalRequest|Object|X|Original request made by client when creating the account|
|status|String||Transaction status|
|statusLog|Array||Status change logging|
|statusLog.status|String||Account status|
|statusLog.cDate|Date||Account status change timestamp|
|sTransId|String||Service transaction id (internal reference from <service> service)|
|originalResponse|Object|X|Original response received by client when creating the account|
|data|Object|X|Specific data from <service> that needs to be kept|



