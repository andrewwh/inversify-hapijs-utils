import * as hapi from "hapi";
import { interfaces as inversifyInterfaces } from "inversify";

namespace interfaces {

    export type Middleware = (inversifyInterfaces.ServiceIdentifier<any> | hapi.RouteHandler);

    export interface ControllerMetadata {
        path: string;
        middleware: Middleware[];
        target: any;
    }

    export type StrOrRegex = string | RegExp;
    export type RouteOptions = StrOrRegex | { path: StrOrRegex  } | { options: Object, path: StrOrRegex } & Object;

    export interface ControllerMethodMetadata {
        options: RouteOptions;
        middleware: Middleware[];
        target: any;
        method: string;
        key: string;
    }

    export interface Controller {}

    export interface HandlerDecorator {
        (target: any, key: string, value: any): void;
    }

    export interface ConfigFunction {
        (app: hapi.Server): void;
    }

    export interface ServerOptions extends hapi.ServerOptions {
      defaultRoot?: string;
    }
}

export { interfaces };
