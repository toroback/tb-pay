
var utils    = require("../lib/utils");
var mongoose = require('mongoose'),  
    Schema   = mongoose.Schema;

var helper   = require("../helpers/tb.pay-transactions");

/** 
 * Modelo de datos que contiene información sobre una transacción
 * @class PayTransactionSchema
 * @memberOf module:tb-pay
 * @property {String}   direction Transaction direction: incoming or outgoing
 * @property {String}   service Service type (payoneer, paypal, etc...)
 * @property {ObjectId} uid User id (a2s.users) owner of this transaction
 * @property {ObjectId} paid Reference to account (tb.pay-account _id)
 * @property {String}   amount Amount to transfer
 * @property {String}   currency ISO-4217 (alpha 3 currency)
 * @property {String}   [description] Some optional description
 * @property {Object}   [originalRequest] Original request made by client when creating the account
 * @property {String}   status Transaction status
 * @property {Array}    statusLog Status change logging
 * @property {String}   statusLog.status Account status
 * @property {String}   statusLog.cDate Fecha de cambio de estado
 * @property {String}   sTransId Service transaction id (internal reference from <service> service)
 * @property {Object}   [originalResponse] Original response received by client when creating the account
 * @property {Object}   [data] Specific data from <service> that needs to be kept
 */ 
let schema  = new Schema ({
  // on insert:
  direction:        { type: String, enum: ['in', 'out'], required: true }, // transaction direction: incoming or outgoing
  service:          { type: String, enum: utils.serviceList, required: true }, // service type (payoneer, paypal, etc...)
  uid:              { type: Schema.Types.ObjectId, required: true }, // user id (a2s.users) owner of this transaction
  paid:             { type: Schema.Types.ObjectId }, // reference to account (tb.pay-account _id). no reference if payment method is not stored
  amount:           { type: String, required: true, match: /^\d+(\.\d{1,2})?$/  },  // amount to transfer (regex: positive, optionaly float, 1 or 2 decimals)
  currency:         { type: String, required: true },   // ISO-4217 (alpha 3 currency)
  description:      { type: String },   // some optional description
  originalRequest:  { type: Schema.Types.Mixed },  // optional: original request made by client when creating the account
  status:           { type: String, enum: utils.transactionStatusList, default: 'pending' },
  // auto-fill:
  statusLog: [ new Schema({
    status: { type: String, required: true },
    cDate:  { type: Date, default: Date.now }
  }, { _id: false }) ],
  // on response or hooks:
  sTransId:         { type: String }, // service transaction id (internal reference from <service> service)
  originalResponse: { type: Schema.Types.Mixed },  // optional: original response received by client when creating the account
  data:             { type: Schema.Types.Mixed }   // optional: specific data from <service> that needs to be kept
},
{ timestamps: { createdAt: 'cDate', updatedAt: 'uDate' } }
);

// ---> Indexes:
schema.index({ uid: 1 });
schema.index({ service: 1 });
schema.index({ status: 1 });

// ---> Output:
schema.set('toJSON', { virtuals: true });

// ---> Virtuals:
schema.virtual('user', { ref: 'a2s.user', localField: 'uid', foreignField: '_id', justOne: true });
schema.virtual('account', { ref: 'tb.pay-accounts', localField: 'paid', foreignField: '_id', justOne: true });

//hooks  
// schema.pre('validate', function(next, ctx) {  // this can NOT be an arrow function
//   console.log('========>>> HOOK: pre validate (tb.pay-transactions)');
//   helper.preValidateHook(this)
//     .then(next)
//     .catch(next);
// });

schema.pre('save', function(next, ctx) {  // this can NOT be an arrow function
  console.log('========>>> HOOK: pre save (tb.pay-transactions)');
  helper.preSaveHook(this)
    .then(next)
    .catch(next);
});

schema.post('save', function(doc) {  // this can NOT be an arrow function
  console.log('========>>> HOOK: post save (tb.pay-transactions)');
  helper.postSaveHook(doc);
});


module.exports = schema; 
