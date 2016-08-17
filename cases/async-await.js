// plugin=asyncawait

function foo() {
  return Promise.resolve("foo");
}

async function foo2() {
  return await "foo";
}

var it = foo()
it //: Promise
it //:: {:t: string}
var it2 = foo2()
it2 //: Promise
it2 //:: {:t: string}

async function async_return_string() {
  return "something"
}

var r1 = async_return_string();
r1 //: Promise
r1.then(function(value) {
  value //: string
})

function sync_return_string() {
  return 'something'
}

sync_return_string()  //: string

async function async_empty() {  }

async_empty() //: Promise

async function async_blank_return() { return }
async_blank_return() //: Promise

async function await_test() {
  var s = await Promise.resolve([0, "a"]);
  s[0]  //: number
  s[1]  //: string
}


async function async_return_arg(arg) {
  return arg
}

async_return_arg('s') //: Promise
async_return_arg(4) //: Promise
async_return_arg('s') //:: {:t: string|number}
async_return_arg(4) //:: {:t: string|number}

async function test_return_arg() {
  async_return_arg('s'); //:: {:t: string|number}
  var t = await async_return_arg('s');
  t //: string|number
  var t2 = await async_return_arg(4);
  t2 //: string|number
}

var async_arrow_function1 = async () => { return 'something' };
var async_arrow_function2 = async () => 'something';
var async_arrow_function3 = async () => { };

var normal_arrow_function1 = () => { return 'something' };
var normal_arrow_function2 = () => 'something';

async_arrow_function1() //: Promise
async_arrow_function2() //: Promise
async_arrow_function3() //: Promise

normal_arrow_function1() //: string
normal_arrow_function2() //: string

async function init() {
  var r1 = await async_arrow_function1();
  r1 //: string
  var r2 = await async_arrow_function2();
  r2 //: string
  var r3 = await async_arrow_function3();
  r3 //: ?
}
