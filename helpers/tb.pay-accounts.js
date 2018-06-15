
let log = App.log.child( { module: 'helper_tb.pay-accounts' } );

let mongoose  = require('mongoose');


// field hiding from toJSON
function xformFields(doc, ret, options) {
  
}

/// Hooks

// pre validate
function preValidateHook(doc) {
  return new Promise( (resolve, reject) => {
    resolve();
  });
}

// pre save
function preSaveHook(doc) {
  return new Promise( (resolve, reject) => {
    resolve();
  });
}

// post save
function postSaveHook(doc) {
   return new Promise( (resolve, reject) => {
    resolve();
  });
}

module.exports = {
  xformFields: xformFields,
  // hooks
  preValidateHook: preValidateHook,
  preSaveHook: preSaveHook,
  postSaveHook: postSaveHook
};
