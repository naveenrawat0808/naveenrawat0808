class apiError extends Error{
    constructor(
        statusCode,
        message = "somethings went wrong!",
        stack ="" ,
        errors = []
    ){
        super(message),
        this.statusCode = statusCode,
        this.message = message,
        this.errors = errors,
        this.success = false,
        this.data = null
        
        if(stack){
            this.stack = stack
        }else{
            apiError.captureStackTrace(this,this.constructor)
        }
    }
}

export {apiError}