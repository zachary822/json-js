import { assertEquals, assertStrictEquals } from "@std/assert";
import { strToList, jsonValue, snd, fst, listToStr } from "./main.ts";

const sentinel = new Object();

Deno.test("should return null for bad input", () => {
  const thing = strToList('"yay');

  assertStrictEquals(
    jsonValue(thing)(sentinel, (x) => snd(x)),
    sentinel,
  );
});

Deno.test("should return string for good input", () => {
  const thing = strToList('"yay2"');

  assertEquals(
    jsonValue(thing)(sentinel, (x) => snd(x)),
    "yay2",
  );
});

Deno.test("should return remaining input", () => {
  const thing = strToList('"yay2"rest');

  assertEquals(
    jsonValue(thing)(sentinel, (x) => listToStr(fst(x))),
    "rest",
  );
});

Deno.test("should return null for good input", () => {
  const thing = strToList("null");

  assertEquals(
    jsonValue(thing)(sentinel, (x) => snd(x)),
    null,
  );
});

for (const s of ["true", "false"]) {
  Deno.test(`should return ${s}`, () => {
    const thing = strToList(s);

    assertEquals(
      jsonValue(thing)(sentinel, (x) => snd(x)),
      JSON.parse(s),
    );
  });
}
