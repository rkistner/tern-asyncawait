var acorn = require('acorn');
require('acorn-es7-plugin')(acorn);
var fs = require('fs');
var walk = require('acorn/dist/walk');

var tern = require('tern');
var infer = require('tern/lib/infer');


var parser = {options: {}};

function makePromise(argument) {
  var child = new acorn.Node(parser);
  child.type = 'CallExpression';
  child.callee = new acorn.Node(parser);
  child.callee.type = 'MemberExpression';
  child.callee.computed = false;

  child.callee.object = new acorn.Node(parser);
  child.callee.object.type = 'Identifier';
  child.callee.object.name = 'Promise';

  child.callee.property = new acorn.Node(parser);
  child.callee.property.type = 'Identifier';
  child.callee.property.name = 'resolve';

  if(argument) {
    child.arguments = [argument];
  } else {
    child.arguments = [];
  }

  return child;
}

function addFakeReturn(node) {
	var block = node.body;
	if(block == null || block.type != 'BlockStatement') {
		// TODO: can this happen?
		return;
	}
	var fakeReturn = new acorn.Node(parser);

	fakeReturn.type = 'ReturnStatement';
	fakeReturn.argument = makePromise();

	block.body.push(fakeReturn);
}
var transformVisitor = {
  FunctionDeclaration: function(node, state, ancestors) {
    if(node.async) {
			addFakeReturn(node);
    }
  },
	ArrowFunctionExpression: function(node, state, ancestors) {
		if(node.async) {
			if(node.expression) {
				// Implicit return
				node.body = makePromise(node.body);
			} else {
				// Explicit return. Add a return statement in case there is none.
				addFakeReturn(node);
			}
		}
	},
  ReturnStatement: function(node, state, ancestors) {
    var isAsync = false;

    // TODO: is this the correct way to get the current function?
    for(var i = ancestors.length - 1; i >= 0; i--) {
      var ancestor = ancestors[i];
      if(ancestor.type == 'FunctionDeclaration' || ancestor.type == 'ArrowFunctionExpression') {
        isAsync = ancestor.async;
        break;
      }
    }

    if(!isAsync) {
      return;
    }

    // Transform `return <expression>` into `return Promise.resolve(expression)`

    node.argument = makePromise(node.argument);
  },

  AwaitExpression: function(node, state, ancestors) {
    var expression = node.argument;

    // Replace the current node with a call
    // `await <expression>` => `__Promise_value(<expression>)`
    node.type = 'CallExpression';
		delete node.argument;
    node.await = true;

    node.callee = new acorn.Node(parser);
    node.callee.type = 'Identifier';
    node.callee.name = '__Promise_value';

    node.callee.start = node.start;
 		node.callee.end = node.end;

    node.arguments = [expression];
  }
};

function AwaitExpression(node, st, c) {
	c(node.argument, st, 'Expression');
}

// Since other walks may be performed before we had a chance to replace the
// AwaitExpression, we need to add this on the base one.
if(walk.base.AwaitExpression == null) {
	walk.base.AwaitExpression = AwaitExpression;
}

var baseVisitor = Object.create(walk.base);
baseVisitor.AwaitExpression = AwaitExpression;


var asyncAwaitDefs = {
	'!name': 'AsyncAwait',
	'__Promise_value': {
		"!type": "fn(value: ?) -> !custom:Promise_value"
	}
};

tern.registerPlugin("asyncawait", function(server, options) {
	server.on("preParse", function(text, options) {
		// Set acorn parser options
		if(!options.plugins) {
			options.plugins = {};
		}
		options.plugins.asyncawait = true;
		options.ecmaVersion = 7;
	});

	server.on('postParse', function(ast, text) {
		// Transform the AST
		walk.ancestor(ast, transformVisitor, baseVisitor, {});
	});
	server.addDefs(asyncAwaitDefs);

  var PromiseResolvesTo = infer.constraint({
    construct: function(output) { this.output = output; },
    addType: function(tp) {
      if (tp.constructor == infer.Obj && tp.name == "Promise") {
        tp.getProp(":t").propagate(this.output);
      } else {
        tp.propagate(this.output);
      }
    }
  });

  infer.registerFunction("Promise_value", function(_self, args, argNodes) {
    var self = new infer.AVal;
    if (args.length) {
	    var aval = args[0];
      aval.propagate(new PromiseResolvesTo(self));
    }
    return self;
  });
});
