import { assertEquals, assertStrictEquals } from "@std/assert";
import {
  strToList,
  jsonValue,
  snd,
  fst,
  listToStr,
  JsonValue,
} from "./main.ts";

const sentinel = {} as JsonValue;

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

for (const [input, result] of [
  ['"yay\\n"', "yay\n"],
  ['"\\u0061"', "a"],
  ['"\\u0061bc"', "abc"],
  ['"\\u0061bc"aa', "abc"],
]) {
  Deno.test(
    `should return string '${result}' for input with escape '${input}'`,
    () => {
      const thing = strToList(input);

      assertEquals(
        jsonValue(thing)(sentinel, (x) => snd(x)),
        result,
      );
    },
  );
}

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

Deno.test("should return array for good input", () => {
  const thing = strToList('[  true, "yay", 12, -12 ]');

  assertEquals(
    jsonValue(thing)(sentinel, (x) => snd(x)),
    [true, "yay", 12, -12],
  );
});

Deno.test("should return int for good input", () => {
  const thing = strToList("123abc");

  assertEquals(
    jsonValue(thing)(sentinel, (x) => snd(x)),
    123,
  );
});

Deno.test("should return float for good input", () => {
  const thing = strToList("123.25abc");

  assertEquals(
    jsonValue(thing)(sentinel, (x) => snd(x)),
    123.25,
  );
});

Deno.test("should return float with exponent for good input", () => {
  const thing = strToList("1.2e-2abc");

  assertEquals(
    jsonValue(thing)(sentinel, (x) => snd(x)),
    0.012,
  );
});

Deno.test("should return object for good input", () => {
  const thing = strToList('{ "abc" : 123   }');

  assertEquals(
    jsonValue(thing)(sentinel, (x) => snd(x)),
    { abc: 123 },
  );
});

Deno.test("should return sentinel for bad input", () => {
  const thing = strToList('{"abc": }');

  assertStrictEquals(
    jsonValue(thing)(sentinel, (x) => snd(x)),
    sentinel,
  );
});
