# JSON parser

Parser combinator implemented in church encoded types.

```typescript
const input = '"abc"';

const maybeParse = jsonValue(input);

// to retrieving the value from Maybe
const result = maybeParse(
    // result if Nothing
    null,
    // result if Just (remaning, result)
    (x) => snd(x)
)
```
