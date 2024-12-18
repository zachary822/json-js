import {
  apList,
  Cons,
  Nil,
  pureList,
  replicate,
  satisfyP,
  zip,
} from "./main.ts";
import { charP, eof, fst, listToStr, snd, stringP, strToList } from "./main.ts";
import {
  assertSpyCall,
  assertSpyCallArgs,
  assertSpyCalls,
  spy,
} from "@std/testing/mock";
import { assert } from "@std/assert";

Deno.test("apList works as expected", () => {
  const func = (a: number) => a + 1;

  const fs = replicate(2, func);
  const xs = Cons(1, Cons(2, Cons(3, Nil)));
  assert(
    zip(
      apList(fs, xs),
      Cons(2, Cons(3, Cons(4, Cons(2, Cons(3, pureList(4)))))),
    )((h, t) => h((a, b) => a === b) && t, true),
  );
});

Deno.test("charP matches input", () => {
  const func = spy();

  charP("a")(strToList("abc"))(null, (result) => {
    func(listToStr(fst(result)), snd(result));
  });

  assertSpyCallArgs(func, 0, ["bc", "a"]);
});

Deno.test("stringP matches input", () => {
  const func = spy();

  stringP(strToList("ab"))(strToList("abc"))(null, (result) => {
    func(listToStr(fst(result)), listToStr(snd(result)));
  });

  assertSpyCallArgs(func, 0, ["c", "ab"]);
});

Deno.test("sastisfyP matches input", () => {
  const testFunc = spy((a) => a === "a");
  const func = spy();

  satisfyP(testFunc)(strToList("abc"))(
    null,
    (result) => {
      func(listToStr(fst(result)), snd(result));
    },
  );

  assertSpyCall(testFunc, 0, { args: ["a"], returned: true });
  assertSpyCallArgs(func, 0, ["bc", "a"]);
});

Deno.test("eof match with no input", () => {
  const func = spy();

  eof(strToList(""))(
    null,
    func,
  );

  assertSpyCalls(func, 1);
});

Deno.test("eof match with no input", () => {
  const func = spy();

  eof(strToList("abc"))(
    null,
    func,
  );

  assertSpyCalls(func, 0);
});
