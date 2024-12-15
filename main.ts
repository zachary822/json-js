// Church encoded types

export type Maybe<A> = <R>(nothing: R, just: (r: A) => R) => R;
export const Just =
  <A>(x: A): Maybe<A> =>
  (_nothing, just) =>
    just(x);
// deno-lint-ignore no-explicit-any
export const Nothing: Maybe<any> = (nothing, _just) => nothing;

export const fmapMaybe = <A, R>(f: (a: A) => R, m: Maybe<A>): Maybe<R> =>
  m(Nothing as Maybe<R>, (x) => Just(f(x)));

export const emptyMaybe = Nothing;
export const altMaybe = <A>(ma: Maybe<A>, mb: Maybe<A>): Maybe<A> =>
  ma(mb, (x) => Just(x));

export type Pair<A, B> = <R>(f: (a: A, b: B) => R) => R;
export const pair =
  <A, B>(a: A, b: B): Pair<A, B> =>
  (f) =>
    f(a, b);

export const fst = <A, B>(p: Pair<A, B>) => p((a, _b) => a);
export const snd = <A, B>(p: Pair<A, B>) => p((_a, b) => b);
export const fmapPair = <A, B, R>(f: (a: B) => R, p: Pair<A, B>): Pair<A, R> =>
  pair(fst(p), f(snd(p)));

export type List<A> = <R>(cons: (a: A, r: R) => R, nil: R) => R;
// deno-lint-ignore no-explicit-any
export const Nil: List<any> = (_cons, nil) => nil;
export const Cons =
  <A>(x: A, xs: List<A>): List<A> =>
  (cons, nil) =>
    cons(x, xs(cons, nil));

export const maybeHead = <A>(xs: List<A>): Maybe<A> =>
  xs((h, _t) => Just(h), Nothing);
export const tail = <A>(xs: List<A>): List<A> =>
  xs(
    (x: A, acc: (flag: boolean) => List<A>) => (flag: boolean) =>
      flag ? acc(false) : Cons(x, acc(false)),
    (_flag: boolean) => Nil,
  )(true);
export const length = <A>(xs: List<A>): number => xs((_h, t) => 1 + t, 0);
export const append =
  <A>(xs: List<A>, ys: List<A>): List<A> =>
  (cons, nil) =>
    xs(cons, ys(cons, nil));
export const reverse = <A>(xs: List<A>): List<A> =>
  xs((h, t) => append(t, Cons(h, Nil)), Nil);
export const take = <A>(n: number, xs: List<A>): List<A> =>
  n === 0 ? Nil : xs((h, t) => Cons(h, take(n - 1, t)), Nil);
export const drop = <A>(n: number, xs: List<A>): List<A> =>
  xs(
    (x: A, f: (n: number) => List<A>) => (i: number) =>
      i < n ? f(i + 1) : Cons(x, f(i + 1)),
    (_n) => Nil,
  )(0);

export const fmapList = <A, B>(f: (a: A) => B, xs: List<A>): List<B> =>
  xs((h, t) => Cons(f(h), t), Nil);

export const arrayToList = <A>(arr: A[]): List<A> =>
  arr.toReversed().reduce((xs, x) => Cons(x, xs), Nil as List<A>);
export const listToArray = <A>(list: List<A>): A[] =>
  list((x, xs) => [x].concat(xs), [] as A[]);

export const strToList = (s: string): List<string> =>
  arrayToList(Array.from(s));
export const listToStr = (xs: List<string>) => xs((y, ys) => y + ys, "");

// Parser combinator

export type Parser<A> = (input: List<string>) => Maybe<Pair<List<string>, A>>;

export const fmapParser =
  <A, R>(f: (a: A) => R, p: Parser<A>): Parser<R> =>
  (input: List<string>) =>
    fmapMaybe((b) => fmapPair(f, b), p(input));

const flip =
  <A, B, R>(f: (a: A) => (b: B) => R) =>
  (b: B) =>
  (a: A) =>
    f(a)(b);
const constFunc =
  <A, B>(a: A) =>
  (_b: B): A =>
    a;

export const pureParser =
  <A>(a: A): Parser<A> =>
  (input) =>
    Just(pair(input, a));
export const apParser =
  <A, B>(pf: Parser<(a: A) => B>, px: Parser<A>): Parser<B> =>
  (input) =>
    pf(input)(Nothing, (a) =>
      px(fst(a))(Nothing, (b) => Just(pair(fst(b), snd(a)(snd(b))))),
    );

export const apLeftParser = <A, B>(pa: Parser<A>, pb: Parser<B>): Parser<A> =>
  apParser(fmapParser(constFunc, pa), pb);
export const apRightParser = <A, B>(pa: Parser<A>, pb: Parser<B>): Parser<B> =>
  apParser(fmapParser(flip(constFunc), pa), pb);

export const emptyParser = (_input: List<string>) => Nothing;
export const altParser =
  <A>(p1: Parser<A>, p2: Parser<A>): Parser<A> =>
  (input: List<string>) =>
    altMaybe(p1(input), p2(input));
export const manyParser = <A>(v: Parser<A>): Parser<List<A>> =>
  altParser(someParser(v), pureParser(Nil));
export const someParser =
  <A>(v: Parser<A>): Parser<List<A>> =>
  (input) =>
    v(input)(Nothing, (first) => {
      const remainingInput = fst(first);

      return length(remainingInput) >= length(input)
        ? Nothing
        : manyParser(v)(remainingInput)(
            Just(pair(remainingInput, Cons(snd(first), Nil))),
            (rest) => Just(pair(fst(rest), Cons(snd(first), snd(rest)))),
          );
    });

export const satisfyP =
  (f: (a: string) => boolean): Parser<string> =>
  (input) =>
    maybeHead(input)(Nothing, (h) =>
      f(h) ? Just(pair(tail(input), h)) : Nothing,
    );

export const sequenceAListParser = <A>(xs: List<Parser<A>>): Parser<List<A>> =>
  xs(
    (h, t) =>
      apParser(
        fmapParser((a) => (as) => Cons(a, as), h),
        t,
      ),
    pureParser(Nil as List<A>),
  );

export const charP = (x: string) => satisfyP((i) => x === i);
export const stringP = (xs: List<string>): Parser<List<string>> =>
  sequenceAListParser(fmapList(charP, xs));

const sepBy = <A, B>(element: Parser<A>, sep: Parser<B>): Parser<List<A>> =>
  apParser(
    fmapParser((x) => (xs: List<A>) => Cons(x, xs), element),
    manyParser(apRightParser(sep, element)),
  );

export const optional = <A>(p: Parser<A>): Parser<Maybe<A>> =>
  altParser(fmapParser(Just, p), pureParser(Nothing));
export const lookahead =
  <A>(p: Parser<A>): Parser<A> =>
  (input) =>
    p(input)(Nothing, (r) => Just(pair(input, snd(r))));

// helper parsers

const isSpace = (x: string) => /\s/.test(x);
export const space = manyParser(satisfyP(isSpace));

const isDigit = (x: string) => /\d/.test(x);
const isUnescapedChar = (a: string) => !/["\\\b\f\n\r\t]/.test(a);
const isHexDigit = (a: string) => /[0-9A-Fa-f]/.test(a);

const unicodeEscape = fmapParser(
  (xs: List<string>) => String.fromCharCode(parseInt(listToStr(xs), 16)),
  apRightParser(
    charP("u"),
    apParser(
      apParser(
        apParser(
          fmapParser(
            (a) => (b) => (c) => (d) =>
              Cons(a, Cons(b, Cons(c, Cons(d, Nil as List<string>)))),
            satisfyP(isHexDigit),
          ),
          satisfyP(isHexDigit),
        ),
        satisfyP(isHexDigit),
      ),
      satisfyP(isHexDigit),
    ),
  ),
);

const escapeMap: { [key: string]: string } = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

const escapedChar = apRightParser(
  charP("\\"),
  altParser(
    fmapParser(
      (c) => escapeMap[c],
      satisfyP((c) => Object.hasOwn(escapeMap, c)),
    ),
    unicodeEscape,
  ),
);

// JSON parser

export type JsonValue =
  | string
  | boolean
  | number
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

const stringLiteral = apLeftParser(
  apRightParser(
    charP('"'),
    manyParser(altParser(satisfyP(isUnescapedChar), escapedChar)),
  ),
  charP('"'),
);

const jsonString: Parser<JsonValue> = fmapParser(listToStr, stringLiteral);

const jsonBool = altParser(
  apRightParser(stringP(strToList("true")), pureParser(true)),
  apRightParser(stringP(strToList("false")), pureParser(false)),
);

const intLiteral = apParser(
  fmapParser(
    (m: Maybe<string>) => (xs: List<string>) => m(xs, (x) => Cons(x, xs)),
    optional(charP("-")),
  ),
  someParser(satisfyP(isDigit)),
);

const fractionLiteral = apParser(
  fmapParser(
    (m: Maybe<string>) => (xs: List<string>) => m(xs, (x) => Cons(x, xs)),
    optional(charP(".")),
  ),
  someParser(satisfyP(isDigit)),
);

const exponentLiteral = apParser(
  fmapParser(
    (m: Maybe<string>) => (xs: List<string>) => m(xs, (x) => Cons(x, xs)),
    optional(altParser(charP("e"), charP("E"))),
  ),
  apParser(
    fmapParser(
      (m: Maybe<string>) => (xs: List<string>) => m(xs, (x) => Cons(x, xs)),
      optional(altParser(charP("-"), charP("+"))),
    ),
    someParser(satisfyP(isDigit)),
  ),
);

const jsonNumber = fmapParser(
  (xs: List<string>) => +listToStr(xs),
  apParser(
    fmapParser(
      (xs: List<string>) => (mys: Maybe<List<string>>) =>
        mys(xs, (ys: List<string>) => append(xs, ys)),
      apParser(
        fmapParser(
          (xs) => (mys: Maybe<List<string>>) =>
            mys(xs, (ys: List<string>) => append(xs, ys)),
          intLiteral,
        ),
        optional(fractionLiteral),
      ),
    ),
    optional(exponentLiteral),
  ),
);

const jsonNull = apRightParser(stringP(strToList("null")), pureParser(null));

const jsonArray: Parser<JsonValue[]> = (input) =>
  fmapParser(
    (xs: List<JsonValue>) => listToArray(xs),
    apLeftParser(
      apRightParser(
        charP("["),
        apRightParser(
          space,
          sepBy(
            jsonValue,
            apLeftParser(apRightParser(space, charP(",")), space),
          ),
        ),
      ),
      apLeftParser(space, charP("]")),
    ),
  )(input);

const kvPair = (input: List<string>) =>
  apParser(
    fmapParser(
      (k: List<string>) => (v: JsonValue) => pair(k, v),
      apLeftParser(stringLiteral, space),
    ),
    apRightParser(charP(":"), apRightParser(space, jsonValue)),
  )(input);

const jsonObject = fmapParser(
  (xs: List<Pair<List<string>, JsonValue>>) =>
    xs(
      (h, t) => ({ ...t, [listToStr(fst(h))]: snd(h) }),
      {} as { [key: string]: JsonValue },
    ),
  apLeftParser(
    apLeftParser(
      apRightParser(
        apRightParser(charP("{"), space),
        sepBy(kvPair, apRightParser(space, apLeftParser(charP(","), space))),
      ),
      space,
    ),
    charP("}"),
  ),
);

export const jsonValue: Parser<JsonValue> = altParser(
  altParser(
    altParser(altParser(altParser(jsonString, jsonBool), jsonNull), jsonNumber),
    jsonArray,
  ),
  jsonObject,
);
