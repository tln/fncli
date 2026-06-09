import fncli from "fncli";

fncli(async function main( // Greet someone (or many)
  {
    greeting = "Hello", // Greeting prefix
    s: shout = false,   // Capitalize the output
  }: { greeting?: string; s?: boolean },
  ...names: string[]    // Who to greet
) {
  if (names.length === 0) throw "error: pass at least one name";
  for (const name of names) {
    let line = `${greeting} ${name}!`;
    if (shout) line = line.toUpperCase();
    console.log(line);
  }
});
