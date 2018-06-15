
var utils    = require("../lib/utils");
var mongoose = require('mongoose'),  
    Schema   = mongoose.Schema;

/** 
 * Modelo de datos que contiene información sobre los webhooks del modulo de pago
 * @class WebhookLogsSchema
 * @memberOf module:tb-pay
 * @property {String} service Service type (payoneer, paypal, etc...)
 * @property {Object} [data] Specific data from <service> received on hook
 * @property {ObjectId} [uid] User id (a2s.users) related to this event
 * @property {String} [ref] Reference type/collection related to this webhook
 * @property {ObjectId} [rid] Related document _id according to ref (tb.pay-accounts, tb.pay-transactions)
 */ 
let schema  = new Schema ({
  // on insert:
  service: { type: String, enum: utils.serviceList, required: true }, // service type (payoneer, paypal, etc...)
  data:  { type: Schema.Types.Mixed },    // optional: specific data from <service> received on hook
  // after hook process, relation with other documents:
  uid:   { type: Schema.Types.ObjectId }, // user id (a2s.users) related to this event
  ref:   { type: String, enum: ['account', 'transaction'] }, // reference type/collection related to this webhook
  rid:   { type: Schema.Types.ObjectId } // related document _id according to ref (tb.pay-accounts, tb.pay-transactions)
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

module.exports = schema; 
