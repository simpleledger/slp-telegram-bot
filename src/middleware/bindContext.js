module.exports = function(path = []){
    if(path.length < 1)
        throw new Error('Path must have a length >= 1')

    return async (ctx, next) => {
        let x = ctx;
        for(let i = 0; i < path.length - 1; i++){
            x = x[path[i]];
        }
        x[path[path.length - 1]] = ctx;

        await next();
    };
}