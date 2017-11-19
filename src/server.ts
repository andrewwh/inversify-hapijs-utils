import * as inversify from "inversify";
import * as hapi from "hapi";
import { interfaces } from "./interfaces";
import { TYPE, METADATA_KEY } from "./constants";
import {HttpError, HttpErrors} from './errors';

/**
 * Wrapper for the hapi server.
 */
export class InversifyHapiServer {
    private container: inversify.interfaces.Container;
    private app: hapi.Server;
    private configFn: interfaces.ConfigFunction;
    private defaultRoot: string | null = null;

    /**
     * Wrapper for the hapi server.
     *
     * @param container Container loaded with all controllers and their dependencies.
     */
    constructor(container: inversify.interfaces.Container, opts?: (hapi.ServerOptions & interfaces.ServerOptions)) {
        this.container = container;
        
        if (
            opts &&
            opts.hasOwnProperty("defaultRoot") &&
            typeof (opts as interfaces.ServerOptions).defaultRoot === "string"
        ) {
            this.defaultRoot = opts.defaultRoot as string;
            delete opts.defaultRoot;
        }

        this.app = new hapi.Server(opts as hapi.ServerOptions);
    }

    /**
     * Sets the configuration function to be applied to the application.
     * Note that the config function is not actually executed until a call to InversifyHapiServer.build().
     *
     * This method is chainable.
     *
     * @param fn Function in which app-level middleware can be registered.
     */
    public setConfig(fn: interfaces.ConfigFunction): InversifyHapiServer {
        this.configFn = fn;
        return this;
    }

    /**
     * Applies all routes and configuration to the server, returning the hapi application.
     */
    public build(): hapi.Server {
        // register server-level middleware before anything else
        if (this.configFn) {
            this.configFn.apply(undefined, [this.app]);
        }

        this.registerControllers();

        return this.app;
    }

    private registerControllers() {

        let controllers: interfaces.Controller[] = this.container.getAll<interfaces.Controller>(TYPE.Controller);

        controllers.forEach((controller: interfaces.Controller) => {

            let controllerMetadata: interfaces.ControllerMetadata = Reflect.getOwnMetadata(
                METADATA_KEY.controller,
                controller.constructor
            );

            if (this.defaultRoot !== null && typeof controllerMetadata.path === "string") {
                controllerMetadata.path = this.defaultRoot + controllerMetadata.path;
            } else if (this.defaultRoot !== null) {
                controllerMetadata.path = this.defaultRoot;
            }

            let methodMetadata: interfaces.ControllerMethodMetadata[] = Reflect.getOwnMetadata(
                METADATA_KEY.controllerMethod,
                controller.constructor
            );

            if (controllerMetadata && methodMetadata) {
                methodMetadata.forEach((metadata: interfaces.ControllerMethodMetadata) => {
                    let handler: hapi.RouteHandler = this.handlerFactory(controllerMetadata.target.name, metadata.key);
                    let routeOptions: any = typeof metadata.options === "string" ? { path: metadata.options } : metadata.options;
                    
                    if (typeof routeOptions.path === "string" && typeof controllerMetadata.path === "string" && controllerMetadata.path !== "/") {
                        routeOptions.path = controllerMetadata.path + routeOptions.path;
                    } else if (routeOptions.path instanceof RegExp && controllerMetadata.path !== "/") {
                        routeOptions.path = new RegExp(controllerMetadata.path + routeOptions.path.source);
                    }

                    this.app.route({
                        method: metadata.method.toUpperCase() as hapi.HTTP_METHODS_PARTIAL,
                        path: routeOptions.path,
                        handler: handler
                    });
                });
            }
        });
    }

    private sendReply(reply: hapi.ReplyNoContinue, value: any): hapi.ReplyValue {
        if (value instanceof HttpError) {
            const error = value as HttpError;
            return reply(
                {
                    code: error.code,
                    message: error.message
                }
            )
            .code(error.code)
            .message(error.message);
        } else {
            return reply(value);
        }
    }

    private handlerFactory(controllerName: any, key: string): hapi.RouteHandler {
        return (req: hapi.Request, reply: hapi.ReplyNoContinue) => {

            let result: any = (this.container.getNamed(TYPE.Controller, controllerName) as any)[key](req);

            if (result && result instanceof Promise) {
                result.then((value: any) => {
                    if (value) {
                        this.sendReply(reply ,value);
                    }
                })
                .catch((error: any) => {
                    return this.sendReply(reply, HttpErrors.internalError(error.message));
                });

            } else if (result) {
                return this.sendReply(reply, result);
            }
        };
    }

}
