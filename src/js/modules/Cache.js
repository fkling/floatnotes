"use strict";

var EXPORTED_SYMBOLS = ['FloaNotesCache'];

/**
 * A simple key value store which keeps track of how often a value was added.
 *
 * @constructor
 */
function Cache () {
    this._counter = {};
    this._cache = {};
}
var FloatNotesCache = Cache;


/**
 * Tests whether cache contains the provided key.
 *
 * @param {string} key
 *
 * @return {boolean}
 */
Cache.prototype.has = function(key) {
    return key in this._counter;
};


/**
 * Adds a key(-value) pair to the cache. Updates the value if provided.
 *
 * @param {string} key
 * @param {?} opt_value
 */
Cache.prototype.set = function(key, opt_value) {
    if (!(key in this._counter)) {
        this._counter[key] = 0;
    }
    if (typeof opt_value !== 'undefined') {
        this._cache[key] = opt_value;
    }
};

/**
 * Adds a key(-value) pair to the cache. Increases the counter by one and
 * sets the value if not already set.
 *
 * @param {string} key
 * @param {?} opt_value
 */
Cache.prototype.retain = function(key, opt_value) {
    if (!(key in this._counter)) {
        this.set(key, opt_value);
    }
    this._counter[key] += 1;
    return this._cache[key];
};


/**
 * Gets the value for the key.
 *
 * @param {string} key
 * @param {?} opt_default Value to return if key does not exit.
 *
 * @return {?}
 */
Cache.prototype.get = function(key, opt_default) {
    return key in this.counter_ ? this._cache[key] : opt_default;
};


/**
 * Decreases the count of the provided key. Removes the key and value if the
 * count reaches 0.
 *
 * @param {string} key
 */
Cache.prototype.release = function(key) {
    if (key in this._counter) {
        this._counter[key] -=1;
    }
    if (this._counter[key] === 0) {
        delete this._counter[key];
        delete this._cache[key];
    }
};


/**
 * Completely removes a key from the cache.
 *
 * @param {string} key
 */
Cache.prototype.remove = function(key) {
    if (key in this._counter) {
        delete this._counter[key];
        delete this._cache[key];
    }
};


/**
 * Gets the count of the key.
 *
 * @param {string} key
 *
 * @return {number}
 */
Cache.prototype.getCount = function(key) {
    return this._counter[key] || 0;
};
