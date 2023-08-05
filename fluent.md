The fluent API for fncli

fncli(
    function () {
        
    }
)


fncli.

main(
    ({  fixture }) => ({
        ...this object...
    })
).settings(

).entrypoint(
  mainobj
).validate(
    built-in: files, number, integer
).complete(

).run(

)

funcli = (mainobj) => fncli.settings({
    help: true,
    version: true,

}).entrypoint(
    mainobj, function or object of functions as allowed by fncli
).validate(

).complete(

).run(
    argv
);
