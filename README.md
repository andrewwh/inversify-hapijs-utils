# inversify-hapijs-utils

Some utilities for the development of hapijs application with Inversify. Based on the inversify-restify.utils. If you're starting writing restful api's then I suggest you use Restify (and the inversify-restify-utils). If you want to use hapi (or you have to) then this project can help you in the same way that inversify-restify.utils does. 

> Note: this project is still a work in progress and does not have any test coverage.

## Installation
You can install `inversify-hapijs-utils` using npm:

```
$ npm install inversify inversify-hapijs-utils reflect-metadata --save
```

The `inversify-hapijs-utils` type definitions are included in the npm module and require TypeScript 2.0.
Please refer to the [InversifyJS documentation](https://github.com/inversify/InversifyJS#installation) to learn more about the installation process.

## The Basics

### Step 1: Decorate your controllers
To use a class as a "controller" for your hapijs app, simply add the `@Controller` decorator to the class. Similarly, decorate methods of the class to serve as request handlers. 
The following example will declare a controller that responds to `GET /foo'.

```ts
import { Request } from 'hapijs';
import { Controller, Get, interfaces } from 'inversify-hapijs-utils';
import { injectable, inject } from 'inversify';

@Controller('/foo')
@injectable()
export class FooController implements interfaces.Controller {
    
    constructor( @inject('FooService') private fooService: FooService ) {}
    
    @Get('/')
    private index(req: Request): string {
        return this.fooService.get(req.query.id);
    }
}
```

### Step 2: Configure container and server
Configure the inversify container in your composition root as usual.

Then, pass the container to the InversifyHapiServer constructor. This will allow it to register all controllers and their dependencies from your container and attach them to the hapi app.
Then just call server.build() to prepare your app.

In order for the InversifyHapiServer to find your controllers, you must bind them to the `TYPE.Controller` service identifier and tag the binding with the controller's name.
The `Controller` interface exported by inversify-hapijs-utils is empty and solely for convenience, so feel free to implement your own if you want.

```ts
import { Container } from 'inversify';
import { interfaces, InversifyHapiServer, TYPE } from 'inversify-hapijs-utils';

// set up container
let container = new Container();

// note that you *must* bind your controllers to Controller 
container.bind<interfaces.Controller>(TYPE.Controller).to(FooController).whenTargetNamed('FooController');
container.bind<FooService>('FooService').to(FooService);

// create server
let server = new InversifyHapiServer(container);

server
    .build()
    .start(
        (err) => {
            if (err) {
                console.log(err);
            }
        }
    );
```

hapijs ServerOptions can be provided as a second parameter to the InversifyHapiServer constructor:

```let server = new InversifyHapiServer(container, { name: "my-server" });```

hapijs ServerOptions can be extended with `defaultRoot` where one can define a default path that will be prepended to all your controllers:

```let server = new InversifyHapiServer(container, { name: "my-server", defaultRoot: "/v1" });```

## InversifyHapiServer
A wrapper for a hapijs Application.

### `.setConfig(configFn)`
Optional - exposes the hapijs application object for convenient loading of server-level middleware.

```ts
import * as morgan from 'morgan';
// ...
let server = new InversifyHapiServer(container);
server.setConfig((app) => {
    app.connection({port: 8080});
});
```

### `.build()`
Attaches all registered controllers and middleware to the hapijs application. Returns the application instance.

```ts
// ...
let server = new InversifyHapiServer(container);
server
    .setConfig(configFn)
    .build()
    .start(err => {});
```

## Decorators

### `@Controller(path, [middleware, ...])`

Registers the decorated class as a controller with a root path, and optionally registers any global middleware for this controller.

### `@Method(method, path, [middleware, ...])`

Registers the decorated controller method as a request handler for a particular path and method, where the method name is a valid hapijs routing method.

### `@SHORTCUT(path, [middleware, ...])`

Shortcut decorators which are simply wrappers for `@Method`. Right now these include `@Get`, `@Post`, `@Put`, `@Patch`, `@Head`, `@Delete`, and `@Options`. For anything more obscure, use `@Method` (Or make a PR :smile:).

## Middleware
Middleware can be either an instance of `RoutePrerequisiteRequestHandler` or an InversifyJS service idenifier. This is attached as a route 'pre' method. To stop processing you will need to return an Error or HttpError.

The simplest way to use middleware is to define a `RoutePrerequisiteRequestHandler` instance and pass that handler as decorator parameter.

```ts
// ...
const loggingHandler = (req: Request) => {
  console.log(req);
};

@Controller('/foo', loggingHandler)
@injectable()
export class FooController {
    
    constructor( @inject('FooService') private fooService: FooService ) {}
    
    @Get('/', loggingHandler)
    private index(req: Request): string {
        return this.fooService.get(req.query.id);
    }
}
```

But if you wish to take full advantage of InversifyJS you can bind the same handler to your IOC container and pass the handler's service identifier to decorators.

```ts
// ...
import { TYPES } from 'types';
// ...
const loggingHandler = (req: Request, reply: ReplyNoContinue) => {
  console.log(req);
};
container.bind<RequestHandler>(TYPES.LoggingMiddleware).toConstantValue(loggingHandler);
// ...
@Controller('/foo', TYPES.LoggingMiddleware)
@injectable()
export class FooController implements interfaces.Controller {
    
    constructor( @inject('FooService') private fooService: FooService ) {}
    
    @Get('/', TYPES.LoggingMiddleware)
    private index(req: Request): string {
        return this.fooService.get(req.query.id);
    }
}
```