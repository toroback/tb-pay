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
Por ahora los servicios disponibles son:

- **Payonner**
  + Nombre de módulo: [**tb-pay-payoneer**](https://github.com/toroback/tb-pay-payoneer)
  + Identificador: "payoneer"
  + [Página web](https://www.payoneer.com/)

### **- Configuración desde interfaz administrativa:** 

Por el momento no la opción de configuración a través de la interfaz de administración no está disponible.

### **- Configuración manual:**

La configuración manual se realiza sobre una colección en la base de datos llamada "tb.configs".

Para ello hay que añadir un nuevo documento cuyo id sea el "payOptions" (Ej. "\_id":"payOptions"). Dicho documento debe tener un objeto para cada uno de los servicios que se quiera configurar cuya clave sea el identificador del servicio. 

Para cada servicio configurado se requerirán los siguientes campos:

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

## **Funcionalidades**

### **- Obtener de link de registro/login:**

#### **• REST Api:**

Por documentar.

#### **• Código Javascript:**

**Parámetros:**

| Clave | Tipo | Opcional   | Descripción  |
|---|---|:---:|---|
|service|String||Identificador del servicio a utilizar (Ej: "payoneer")|
|uid|String||Identificador del usuario para el que se pedirá el link| 
|forLogin|Boolean||Flag que indica si el link será pedido para realizar login o registro|

**Respuesta:**

| Clave | Tipo | Opcional | Descripción |
|---|---|:---:|---|
|url|String||La url solicidata|

**Ejemplo:**

```javascript
var service = "payoneer";

var forLogin = "true"; //Se pide link para login. false si se quiere para registro
var uid = <myUserId> //Identificador del usuario para el que se pide el link

//Opcion 1 : obteniendo un objeto cliente para el servicio.
App.pay.forService(service)
  .then(client => client.createRegistrationLink(uid, forLogin));
  .then(resp => console.log(resp))
  .catch(err => console.log(err));

//Opcion 2 : Sin obtener instancia del cliente del servicio. (Se instancia internamente)
App.pay.createRegistrationLink(service, uid, forLogin)
  .then(resp => console.log(resp))
  .catch(err => console.log(err));
```

**Ejemplo Respuesta:**

```
{
  "url": "https://payouts.sandbox.payoneer.com/partners/lp.aspx?token=6b9d1d799974496239438e81aee28ea2329BCC0A38"
}
```

#### **• Modificacion de parámetros:**

Al solicitar el link de registro/login se puede pasar información adicional para que aparezca autocompletada en la página web. Para ello se puede configurar un hook para modificar los parámetros que se enviarán en la consulta al servicio.

Dicho hook se debe realizar sobre el prototipo del módulo y a la función `"prepareRequestLinkPayload"` y se puede configurar, por ejemplo, en el momento de inicialización del módulo en el archivo `"boot.js"`, de la siguiente manera:

```
  App.pay.prototype.post("prepareRequestLinkPayload", function(data, res,  next){
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
  App.pay.prototype.post("prepareRequestLinkPayload", function(data, res,  next){
    res.payee.firstName = usersLoadedFirstName;
    res.payee.lastName = usersLoadedLastName;
    res.payee.address = {
      country: "US",
      state:"NY"
    }
    next(res);
  });
```

### **- Realizar un pago:**

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
|data.currency|String|X|Moneda en la que se realiza el pago. Si no se pasa se toma la moneda asociada al programa de la cuenta del usuario|

**Respuesta:**

| Clave | Tipo | Opcional | Descripción |
|---|---|:---:|---|
|transaction|tb.pay-transaction||Objeto con la información de la transacción|

**Ejemplo:**

```javascript
var service = "payoneer";

var data = {
  "amount":"20.00",
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

**Ejemplo Respuesta:**

```
{
  "url": "https://payouts.sandbox.payoneer.com/partners/lp.aspx?token=6b9d1d799974496239438e81aee28ea2329BCC0A38"
}
```

