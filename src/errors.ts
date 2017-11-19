export class HttpError extends Error {
    constructor(public code:number, public message: string) {
        super();
    }
}

export class HttpErrors {
    private static create(code: number, message: string): HttpError {
        return new HttpError(code, message);
    }

    static notFound(message: string = 'Not found'): HttpError {
        return this.create(404, message);    
    }

    static badRequest(message: string = 'Bad request'): HttpError {
        return this.create(400, message);    
    }    

    static internalError(message: string = 'Internal error'): HttpError {
        return this.create(500, message);    
    }    
}