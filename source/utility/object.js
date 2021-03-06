/**
 * @param {*} object
 *
 * @return {string}
 */
export function classNameOf(object) {

    return  Object.prototype.toString.call( object ).slice(8, -1);
}


/**
 * @param {*}      object
 * @param {string} key    - Property name
 *
 * @return {?Object} https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptor#Description
 */
export function getPropertyDescriptor(object, key) {

    var descriptor;  object = Object.create( object );

    while (object = Object.getPrototypeOf( object ))
        if (descriptor = Object.getOwnPropertyDescriptor(object, key))
            return descriptor;
}


/**
 * @typedef {Object} DecoratorDescriptor
 *
 * @property {String}                kind         - `class`, `field` or `method`
 * @property {String}                [key]        - Member name
 * @property {String}                [placement]  - `static` or `prototype`
 * @property {Object}                [descriptor] - Last parameter of `Object.defineProperty()`
 * @property {DecoratorDescriptor[]} [elements]   - Class members
 */

/**
 * @param {Function|Object}   target                          - Class or its prototype
 * @param {String}            key                             - Member name
 * @param {Function|Object|*} value                           - `{ set, get }` for Field accessors
 * @param {Object}            [descriptor={enumerable: true}] - Use for `Object.defineProperty()`
 *
 * @return {DecoratorDescriptor}
 */
export function decoratorOf(target, key, value, descriptor = {enumerable: true}) {

    descriptor = {
        key, descriptor,
        placement:  (target instanceof Function) ? 'static' : 'prototype'
    };

    if (value instanceof Function)
        descriptor.kind = 'method',  descriptor.descriptor.value = value;
    else if (
        (value.constructor === Object)  &&
        ((value.set || value.get) instanceof Function)
    )
        descriptor.kind = 'method',  Object.assign(descriptor.descriptor, value);
    else
        descriptor.kind = 'field',  descriptor.initializer = () => value;

    return descriptor;
}


const Array_iterator = [ ][Symbol.iterator];

/**
 * @param {Object} arrayLike
 *
 * @return {Iterable} `arrayLike`
 */
export function toIterable(arrayLike) {

    if (!(arrayLike[Symbol.iterator] instanceof Function))
        arrayLike[Symbol.iterator] = Array_iterator;

    return arrayLike;
}


/**
 * Iteratable decorator for Class, Method or Getter
 *
 * @param {DecoratorDescriptor} meta
 */
export function arrayLike(meta) {

    const descriptor = meta.descriptor;

    switch ( meta.kind ) {
        case 'class':
            meta.elements.push(
                decoratorOf({ }, Symbol.iterator, Array_iterator)
            );
            break;
        case 'method':
            for (let key  of  ['value', 'get']) {

                let origin;

                if (origin = descriptor[key])
                    descriptor[key] = function () {

                        return  toIterable( origin.apply(this, arguments) );
                    };
            }
    }
}


/**
 * Equivalent to the integration of Array's map() & filter() methods
 *
 * @param {Iterable}                                           list
 * @param {function(item: *, index: number, list:Iterable): *} filter
 *     - Return `item` itself to reserve, `undefined` or `null` to ignore, or Array to merge in.
 *
 * @return {Array}
 */
export function multipleMap(list, filter) {

    toIterable( list );

    filter = (filter instanceof Function)  &&  filter;

    var result = [ ], i = 0;

    for (let item of list) {

        if ( filter )  item = filter(item, i, list);

        if (item != null)
            result.push[
                (item instanceof Array)  ?  'apply'  :  'call'
            ](result, item);
    }

    return result;
}


/**
 * Merge own properties of two or more objects together into the first object
 * by their descriptor
 *
 * @param {Object}    target - An object that will receive the new properties
 *                             if `source` are passed in
 * @param {...Object} source - Additional objects containing properties to merge in
 *                             (Value of `null` or `undefined` will be skipped)
 *
 * @return {Object} The `target` parameter
 */
export function extend(target, ...source) {

    for (let object of source)  if (object instanceof Object) {

        let descriptor = Object.getOwnPropertyDescriptors( object );

        for (let key  of  Object.keys( descriptor ))
            if (
                ('value' in descriptor[key])  &&
                !(descriptor[key].value != null)
            )
                delete descriptor[key];

        if (object instanceof Function) {

            delete descriptor.name;
            delete descriptor.length;
            delete descriptor.prototype;

            let prototype = Object.getOwnPropertyDescriptors( object.prototype );

            delete prototype.constructor;

            Object.defineProperties(target.prototype, prototype);
        }

        Object.defineProperties(target, descriptor);
    }

    return target;
}


var depth = 0;

/**
 * Traverse Object-tree
 *
 * @param {Object} node     - Object tree
 * @param {String} fork_key - Key of children list
 *
 * @yield {Object}
 * @property {?Object} node   - Current node
 * @property {Object}  parent - Parent node
 * @property {Number}  index  - Index of current level
 * @property {Number}  depth  - Level count of current node
 */
export function* mapTree(node, fork_key) {

    const children = node[fork_key];    depth++ ;

    for (var i = 0;  i < children.length;  i++) {

        yield {parent: node,  node: children[i],  index: i,  depth};

        if ((children[i] != null)  &&  (children[i][fork_key] || '')[0])
            yield* mapTree(children[i], fork_key);
    }

    depth-- ;
}
