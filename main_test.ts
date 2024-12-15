import { assertEquals } from "@std/assert";
import { strToList, jsonValue, snd } from "./main.ts";

Deno.test("should return null for bad input", () => {
  const thing = strToList('"yay2');

  assertEquals(
    null,
    jsonValue(thing)(null, (x) => snd(x)),
  );
});

Deno.test("should return string for good input", () => {
  const thing = strToList('"yay2"');

  assertEquals(
    "yay2",
    jsonValue(thing)(null, (x) => snd(x)),
  );
});
