
let log = App.log.child( { module: 'helper_tb.pay-accounts' } );

let mongoose  = require('mongoose');


// transform / hide sensitive data on toJSON
function transform(doc, ret, options) {
  delete ret.originalRequest;
  delete ret.originalResponse;
  delete ret.sAccountId;
  delete ret.sUserId;
  return ret;
}

/// Hooks

// pre validate
// function preValidateHook(doc) {
//   return new Promise( (resolve, reject) => {
//     resolve();
//   });
// }

// pre save
function preSaveHook(doc) {
  return new Promise( (resolve, reject) => {
    doc._postActions = [ ];

    if ( doc.isNew ) {
      doc.markModified('status'); // so it stores in the log...
    }

    console.log('MODIFIED PATHS');
    console.log(doc.modifiedPaths());

    // check property: status
    if ( doc.isModified('status') ) {
      // push to status log if status changed
      // https://github.com/Automattic/mongoose/issues/5670 (milestone 5.0)
      // doc.log.push({ status: doc.status });
      doc.statusLog = doc.statusLog.concat([{ status: doc.status }]); //this uses $set so no problems
      
    }

    resolve( );
  });
}

// post save
// function postSaveHook(doc) {
//    return new Promise( (resolve, reject) => {
//     resolve();
//   });
// }

module.exports = {
  transform: transform,
  // hooks
  // preValidateHook: preValidateHook,
  preSaveHook: preSaveHook,
  // postSaveHook: postSaveHook
};
