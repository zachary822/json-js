# Parser Combinator

Parser combinator implemented in church encoded types.

## Included JSON parser

```typescript
const input = strToList('"abc"');

const maybeParse = jsonValue(input);

// retrieving the value from Maybe
const result = maybeParse(
  // default return value if parser doesn't match input
  null,
  // the javascript object from the JSON string
  (x) => snd(x),
);
```

## Example

The library uses a custom `List` type to represent arrays, strings used by the
parser are lists of characters (`List<string>`). Use `strToList` to convert
string to `List<string>`.

```typescript
const input = strToList("abc");

const parser = stringP(strToList("ab"));

// result contained in a Maybe type
const result = parser(input)(
  // default return value if parser doesn't match input
  null, 
  // tuple of remaing input and parse result as javascript strings
  (r) => [listToStr(fst(r)), listToStr(snd(r))];
```
