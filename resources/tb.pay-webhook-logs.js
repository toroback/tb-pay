
var utils    = require("../lib/utils");
var mongoose = require('mongoose'),  
    Schema   = mongoose.Schema;

var helper   = require("../helpers/tb.pay-webhook-logs");

/** 
 * Modelo de datos que contiene información sobre los webhooks del modulo de pago
 * @class WebhookLogsSchema
 * @memberOf module:tb-pay
 * @property {String} service Service type (payoneer, paypal, etc...)
 * @property {Object} [data] Specific data from <service> received on hook
 * @property {ObjectId} [uid] User id (a2s.users) related to this event
 * @property {String} [ref] Reference type/collection related to this webhook
 * @property {ObjectId} [rid] Related document _id according to ref (tb.pay-accounts, tb.pay-transactions)
 * @property {Boolean} [error] Flag that existed an error
 */ 
let schema  = new Schema ({
  // on insert:
  service: { type: String, enum: utils.serviceList, required: true }, // service type (payoneer, paypal, etc...)
  data:  { type: Schema.Types.Mixed },    // optional: specific data from <service> received on hook
  // after hook process, relation with other documents:
  uid:   { type: Schema.Types.ObjectId }, // user id (a2s.users) related to this event
  ref:   { type: String, enum: ['account', 'transaction'] }, // reference type/collection related to this webhook
  rid:   { type: Schema.Types.ObjectId },  // related document _id according to ref (tb.pay-accounts, tb.pay-transactions)
  error: { type: Boolean, default: false } // flag that existed an error
},
{ timestamps: { createdAt: 'cDate', updatedAt: 'uDate' } }
);

// ---> Indexes:
schema.index({ service: 1 });
schema.index({ uid: 1 }, { sparse: true });
schema.index({ rid: 1 }, { sparse: true });

// ---> Output:
schema.set('toJSON', { virtuals: true });
// schema.set('toJSON', { virtuals: true, transform: helper.transform });

// ---> Virtuals:
schema.virtual('user', { ref: 'a2s.user', localField: 'uid', foreignField: '_id', justOne: true });
schema.virtual('account', { ref: 'tb.pay-accounts', localField: 'rid', foreignField: '_id', justOne: true });
schema.virtual('transaction', { ref: 'tb.pay-transactions', localField: 'rid', foreignField: '_id', justOne: true });

// //hooks  
// schema.pre('validate', function(next, ctx) {  // this can NOT be an arrow function
//   console.log('========>>> HOOK: pre validate (tb.pay-accounts)');
//   helper.preValidateHook(this)
//     .then(next)
//     .catch(next);
// });

// schema.pre('save', function(next, ctx) {  // this can NOT be an arrow function
//   console.log('========>>> HOOK: pre save (tb.pay-accounts)');
//   helper.preSaveHook(this)
//     .then(next)
//     .catch(next);
// });

// schema.post('save', function(doc) {  // this can NOT be an arrow function
//   console.log('========>>> HOOK: post save (tb.pay-accounts)');
//   helper.postSaveHook(doc);
// });


module.exports = schema; 
