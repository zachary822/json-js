// Church encoded types

export type Maybe<A> = <R>(nothing: R, just: (r: A) => R) => R;
export const Just =
  <A>(x: A): Maybe<A> =>
  (_nothing, just) =>
    just(x);
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
export const fmapList = <A, B>(f: (a: A) => B, xs: List<A>): List<B> =>
  xs((h, t) => Cons(f(h), t), Nil);

export const strToList = (s: string): List<string> =>
  Array.from(s)
    .toReversed()
    .reduce((xs, x) => Cons(x, xs), Nil as List<string>);
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
    pf(input)(Nothing, (a) => {
      const input1 = fst(a);
      const f = snd(a);
      return px(input1)(Nothing, (b) => {
        const input2 = fst(b);
        const x = snd(b);
        return Just(pair(input2, f(x)));
      });
    });

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

// JSON parser

type JsonString = string;
type JsonBool = boolean;

type JsonValue = JsonString | JsonBool;

const jsonString: Parser<JsonValue> = fmapParser(
  listToStr,
  apLeftParser(
    apRightParser(charP('"'), manyParser(satisfyP((a) => a !== '"'))),
    charP('"'),
  ),
);

const jsonBool: Parser<JsonValue> = altParser(
  apRightParser(stringP(strToList("true")), pureParser(true)),
  apRightParser(stringP(strToList("false")), pureParser(false)),
);

const jsonValue: Parser<JsonValue> = altParser(jsonString, jsonBool);

const thing = strToList('"yay2');

console.log(
  jsonValue(thing)(
    "nothing",
    (x) => `leftover: ${listToStr(fst(x))} result: ${snd(x)}`,
  ),
);
