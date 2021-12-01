class HttpError extends Error{
    constructor(message,errorCode){
        super(message);
        this.code = errorCode; // add a code property to class 
    }
}
module.exports= HttpError;