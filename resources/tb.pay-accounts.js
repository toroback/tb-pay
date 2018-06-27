
var utils    = require("../lib/utils");
var mongoose = require('mongoose'),  
    Schema   = mongoose.Schema;

var helper   = require("../helpers/tb.pay-accounts");

/** 
 * Modelo de datos que contiene información sobre una cuenta de pago
 * @class PayAccountSchema
 * @memberOf module:tb-pay
 * @property {ObjectId} uid Owner user id (a2s.users)
 * @property {String} service Service type (payoneer, paypal, etc...)
 * @property {Object} [originalRequest] Original request made by client when creating the account
 * @property {String} status Account status
 * @property {Array}  statusLog status change logging
 * @property {String} statusLog.status Account status
 * @property {String} sUserId Service user id (internal reference from <service> service)
 * @property {Object} [originalResponse] Original response received by client when creating the account
 * @property {Object} [data] Specific data from <service> that needs to be kept
 */ 
let schema  = new Schema ({
  // on insert:
  uid:              { type: Schema.Types.ObjectId, required: true },  // owner user id (a2s.users)
  service:          { type: String, enum: utils.serviceList, required: true }, // service type (payoneer, paypal, etc...)
  originalRequest:  { type: Schema.Types.Mixed },  // optional: original request made by client when creating the account
  status:           { type: String, enum: utils.accountStatusList, default: 'pending' },
  // auto-fill:
  statusLog: [ new Schema({
    status: { type: String, required: true },
    cDate:  { type: Date, default: Date.now }
  }, { _id: false })],
  // on response or hooks:
  sUserId:          { type: String }, // service user id (internal reference from <service> service)
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


//hooks  
// schema.pre('validate', function(next, ctx) {  // this can NOT be an arrow function
//   console.log('========>>> HOOK: pre validate (tb.pay-accounts)');
//   helper.preValidateHook(this)
//     .then(next)
//     .catch(next);
// });

schema.pre('save', function(next, ctx) {  // this can NOT be an arrow function
  console.log('========>>> HOOK: pre save (tb.pay-accounts)');
  helper.preSaveHook(this)
    .then(next)
    .catch(next);
});

// schema.post('save', function(doc) {  // this can NOT be an arrow function
//   console.log('========>>> HOOK: post save (tb.pay-accounts)');
//   helper.postSaveHook(doc);
// });



module.exports = schema; 
